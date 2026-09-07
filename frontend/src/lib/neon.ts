import { createClient } from '@neondatabase/neon-js';
import { BetterAuthReactAdapter } from '@neondatabase/neon-js/auth/react/adapters';

/**
 * The Neon client, built with the two-URL object form: one URL for Managed
 * Better Auth, one for the Data API.
 *
 * Both URLs are public by design. They are safe to ship to the browser because
 * Row Level Security, not URL secrecy, is what protects the data — an
 * authenticated user hitting the Data API directly still only ever sees their
 * own rows. The Postgres connection string is a different matter entirely and
 * never appears in this codebase's frontend.
 */
const AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL.replace(/\/+$/, '');

export const neon = createClient({
  auth: {
    url: import.meta.env.VITE_NEON_AUTH_URL,
    adapter: BetterAuthReactAdapter(),
  },
  dataApi: {
    url: import.meta.env.VITE_NEON_DATA_API_URL,
  },
});

export const auth = neon.auth;

/**
 * The signed-in user's JWT, or null when signed out.
 *
 * Worth understanding, because there are two different "tokens" in play:
 *
 *   - The **session token** is opaque and lives in a cookie. It identifies the
 *     session to the auth service. The Data API rejects it outright
 *     ("not a valid JWT encoding").
 *   - The **JWT** is what everything downstream actually needs. Its `sub` claim
 *     is what `auth.user_id()` resolves to inside the RLS policies. You get it
 *     by exchanging the session cookie at `GET <auth url>/token`.
 *
 * `credentials: 'include'` is required: the session cookie is set on Neon's
 * domain, so it is cross-site from the app's point of view.
 *
 * Tokens are short-lived, so the result is cached until shortly before it
 * expires rather than fetched on every request.
 */
let cached: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string | null> {
  // Re-use the cached token until 30s before it expires.
  if (cached && Date.now() < cached.expiresAt - 30_000) {
    return cached.token;
  }

  let response: Response;
  try {
    response = await fetch(`${AUTH_URL}/token`, { credentials: 'include' });
  } catch {
    return null;
  }

  if (!response.ok) {
    cached = null;
    return null;
  }

  const { token } = (await response.json()) as { token?: string };
  if (!token) {
    cached = null;
    return null;
  }

  cached = { token, expiresAt: expiryOf(token) };
  return token;
}

/** Reads the `exp` claim so we know when to refetch. */
function expiryOf(token: string): number {
  try {
    const payload = JSON.parse(
      atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
    ) as { exp?: number };
    return payload.exp ? payload.exp * 1000 : Date.now() + 60_000;
  } catch {
    return Date.now() + 60_000;
  }
}

/** Drops the cached token. Call on sign-out so the next user starts clean. */
export function clearAccessToken(): void {
  cached = null;
}
