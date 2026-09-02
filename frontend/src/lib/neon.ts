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
 * This is the same token the Neon SDK attaches to its own Data API calls — the
 * SDK's internal `getJWTToken()` reads exactly this field. We send it to our
 * Node backend, which verifies the signature against Neon's public JWKS and
 * then forwards it to the Data API, so Postgres evaluates `auth.user_id()`
 * against the real caller at every layer.
 */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await auth.getSession();
  return data?.session?.token ?? null;
}
