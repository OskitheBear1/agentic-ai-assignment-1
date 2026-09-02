import type { NextFunction, Request, Response } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from './env.js';
import { unauthorized } from './errors.js';

/**
 * JWT verification against Neon Managed Better Auth.
 *
 * The browser signs in directly with Neon and receives a JWT. It sends that JWT
 * to this API as `Authorization: Bearer <token>`. We verify the signature
 * against Neon's public JWKS endpoint — we never see or store a password, and
 * we hold no signing secret of our own.
 *
 * `jose` caches and refreshes the key set, so this is one network call on cold
 * start rather than one per request. Built lazily so importing this module does
 * not require configuration (unit tests import `extractBearerToken` from here).
 */
let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function getJwks() {
  jwks ??= createRemoteJWKSet(
    new URL(`${env.neonAuthUrl}/.well-known/jwks.json`),
  );
  return jwks;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** The verified `sub` claim — the signed-in user's id. */
      userId?: string;
      /** The raw JWT, forwarded to the Data API so RLS can see the caller. */
      accessToken?: string;
    }
  }
}

export function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim() || null;
}

/**
 * Rejects any request without a valid, unexpired Neon Auth JWT.
 *
 * On success it attaches both the user id (for logging and defensive checks)
 * and the raw token (forwarded downstream so Postgres RLS evaluates
 * `auth.user_id()` against the real caller).
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req.header('authorization'));

  if (!token) {
    next(unauthorized('Missing bearer token. Sign in and try again.'));
    return;
  }

  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: env.neonAuthIssuer,
    });

    if (!payload.sub) {
      next(unauthorized('Token is missing a subject claim.'));
      return;
    }

    req.userId = payload.sub;
    req.accessToken = token;
    next();
  } catch {
    // Deliberately vague: do not tell an attacker which check failed.
    next(unauthorized('Your session is invalid or has expired.'));
  }
}
