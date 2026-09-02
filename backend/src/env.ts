import 'dotenv/config';

/**
 * Server-only configuration. Nothing here is ever sent to the browser.
 *
 * Values are read lazily (via getters) rather than at import time, so unit
 * tests can import modules that reference config without needing a populated
 * environment. The first access in a real server run still fails loudly if a
 * variable is missing.
 *
 * DATABASE_URL is deliberately absent: it is used only by db/migrate.ts, never
 * at request time. Keeping it out of the request path means a bug in a route
 * handler cannot leak it.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. See .env.example.`,
    );
  }
  return value.trim().replace(/\/+$/, '');
}

export const env = {
  /** Neon Managed Better Auth base URL. Used for JWKS lookup and issuer check. */
  get neonAuthUrl(): string {
    return required('NEON_AUTH_URL');
  },

  /** Neon Data API (PostgREST) base URL. */
  get neonDataApiUrl(): string {
    return required('NEON_DATA_API_URL');
  },

  /**
   * Expected `iss` claim on incoming JWTs. Defaults to the origin of the auth
   * URL, which is what Neon Managed Better Auth issues. Overridable because
   * pinning the wrong string would lock every user out; the signature check
   * against Neon's JWKS is the load-bearing control either way.
   */
  get neonAuthIssuer(): string {
    return (
      process.env.NEON_AUTH_ISSUER?.trim() ||
      new URL(required('NEON_AUTH_URL')).origin
    );
  },

  /** Browser origins allowed to call this API, comma-separated in the env var. */
  get allowedOrigins(): string[] {
    return (process.env.FRONTEND_URL ?? 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim().replace(/\/+$/, ''))
      .filter(Boolean);
  },

  get port(): number {
    return Number(process.env.PORT ?? 3000);
  },
};
