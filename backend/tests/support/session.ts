import 'dotenv/config';

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

/** Signs up if the account is new, then signs in and returns the user's JWT. */
export async function signIn(email: string, password: string): Promise<TestUser> {
  const name = email.split('@')[0] ?? 'Test User';

  // Sign-up is best-effort: an existing account errors and we fall through.
  await fetch(`${AUTH_URL}/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  }).catch(() => undefined);

  const response = await fetch(`${AUTH_URL}/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const body = (await response.json()) as {
    token?: string;
    user?: { id?: string };
    message?: string;
  };

  if (!response.ok || !body.token || !body.user?.id) {
    throw new Error(
      `Could not sign in as ${email}: ${body.message ?? response.status}`,
    );
  }

  return { email, token: body.token, userId: body.user.id };
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
