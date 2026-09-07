import '../../src/loadEnv.js';

/**
 * Shared helpers for the integration tests that run against real Neon
 * infrastructure (as opposed to the pure unit tests in validation.test.ts).
 */

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. See .env.example.`);
  return value;
}

export const AUTH_URL = requireEnv('NEON_AUTH_URL').replace(/\/+$/, '');
export const DATA_API_URL = requireEnv('NEON_DATA_API_URL').replace(/\/+$/, '');
export const API_URL = (
  process.env.TEST_API_URL ?? 'http://localhost:3000'
).replace(/\/+$/, '');

export interface TestUser {
  email: string;
  token: string;
  userId: string;
}

/**
 * Origin sent with auth requests.
 *
 * Neon Managed Better Auth rejects a request with no Origin header as a CSRF
 * risk ("Missing or null Origin"). A browser always sends one; Node's fetch does
 * not, so the tests supply it. It must be a trusted origin on the Neon Auth
 * side — locally that is the dev server, and in CI/production it is the
 * deployed frontend, passed via TEST_ORIGIN.
 */
const ORIGIN = process.env.TEST_ORIGIN ?? 'http://localhost:5173';

const authHeaders = {
  'Content-Type': 'application/json',
  Origin: ORIGIN,
};

/**
 * Signs up if the account is new, then signs in and returns the user's JWT.
 *
 * Two steps, because they return different things:
 *
 *   1. POST /sign-in/email  -> sets a session cookie. The `token` in this
 *      response body is an OPAQUE SESSION TOKEN, not a JWT. The Data API
 *      rejects it with "not a valid JWT encoding".
 *   2. GET /token (with that cookie) -> the actual signed JWT, whose `sub`
 *      claim is what `auth.user_id()` resolves to inside the RLS policies.
 *
 * A browser gets step 2 for free because the SDK does it behind `getSession()`.
 * Here we do it explicitly.
 */
export async function signIn(email: string, password: string): Promise<TestUser> {
  const name = email.split('@')[0] ?? 'Test User';

  // Sign-up is best-effort: an existing account errors and we fall through.
  await fetch(`${AUTH_URL}/sign-up/email`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ email, password, name }),
  }).catch(() => undefined);

  const signInResponse = await fetch(`${AUTH_URL}/sign-in/email`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ email, password }),
  });

  const signInBody = (await signInResponse.json()) as {
    user?: { id?: string };
    message?: string;
  };

  if (!signInResponse.ok || !signInBody.user?.id) {
    throw new Error(
      `Could not sign in as ${email}: ${signInBody.message ?? signInResponse.status}`,
    );
  }

  // Node's fetch keeps no cookie jar, so carry the session cookie across by hand.
  const cookie = signInResponse.headers
    .getSetCookie()
    .map((entry) => entry.split(';')[0])
    .join('; ');

  const tokenResponse = await fetch(`${AUTH_URL}/token`, {
    headers: { Cookie: cookie, Origin: ORIGIN },
  });

  const tokenBody = (await tokenResponse.json()) as {
    token?: string;
    message?: string;
  };

  if (!tokenResponse.ok || !tokenBody.token) {
    throw new Error(
      `Could not exchange the session for a JWT as ${email}: ${tokenBody.message ?? tokenResponse.status}`,
    );
  }

  if (tokenBody.token.split('.').length !== 3) {
    throw new Error(`Expected a JWT for ${email}, got an opaque token.`);
  }

  return { email, token: tokenBody.token, userId: signInBody.user.id };
}

export function userA(): Promise<TestUser> {
  return signIn(
    requireEnv('TEST_USER_A_EMAIL'),
    requireEnv('TEST_USER_A_PASSWORD'),
  );
}

export function userB(): Promise<TestUser> {
  return signIn(
    requireEnv('TEST_USER_B_EMAIL'),
    requireEnv('TEST_USER_B_PASSWORD'),
  );
}

export interface Reply {
  status: number;
  body: any;
}

/** Calls our own Node API as a given user. */
export async function callApi(
  user: TestUser,
  path: string,
  init: RequestInit = {},
): Promise<Reply> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${user.token}`,
      ...init.headers,
    },
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

/** Calls the public Neon Data API directly, bypassing our backend entirely. */
export async function callDataApi(
  user: TestUser,
  path: string,
  init: RequestInit = {},
): Promise<Reply> {
  const response = await fetch(`${DATA_API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${user.token}`,
      Prefer: 'return=representation',
      ...init.headers,
    },
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}
