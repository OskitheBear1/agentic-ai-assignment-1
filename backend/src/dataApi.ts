import { env } from './env.js';
import { ApiError } from './errors.js';

/**
 * A thin client for the Neon Data API (PostgREST over HTTPS).
 *
 * The important design point: every call carries *the signed-in user's own JWT*.
 * The backend has no privileged database credential in the request path — it
 * cannot read or write another user's row even if a route handler were buggy,
 * because Postgres evaluates `auth.user_id()` from this token and the RLS
 * policies refuse anything that is not the caller's own.
 *
 * DATABASE_URL is never used here. It exists only for migrations.
 */

interface DataApiRequest {
  /** The caller's verified JWT. */
  token: string;
  path: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** PostgREST `Prefer` header, e.g. 'return=representation'. */
  prefer?: string;
}

export async function dataApi<T>({
  token,
  path,
  method = 'GET',
  body,
  prefer,
}: DataApiRequest): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };

  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (prefer) headers['Prefer'] = prefer;

  let response: Response;
  try {
    response = await fetch(`${env.neonDataApiUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    throw new ApiError(502, 'Could not reach the database. Try again.', {
      cause: String(cause),
    });
  }

  const text = await response.text();
  const payload: unknown = text ? safeJson(text) : null;

  if (!response.ok) {
    throw translateError(response.status, payload);
  }

  return payload as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

interface PostgrestError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

/**
 * Turns a raw Postgres/PostgREST failure into a message a person can act on,
 * without echoing internals like table names or SQL back to the browser.
 */
function translateError(status: number, payload: unknown): ApiError {
  const error = (payload ?? {}) as PostgrestError;
  const code = error.code ?? '';
  const raw = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();

  // 23514 = check_violation. Our two CHECK constraints, surfaced kindly.
  if (code === '23514') {
    if (raw.includes('priority')) {
      return new ApiError(400, 'Priority must be one of: high, medium, low.');
    }
    if (raw.includes('name')) {
      return new ApiError(400, 'Name is required.');
    }
    return new ApiError(400, 'That value is not allowed.');
  }

  // 23502 = not_null_violation.
  if (code === '23502') {
    return new ApiError(400, 'A required field was missing.');
  }

  // 42501 = insufficient_privilege — an RLS policy refused the write.
  if (code === '42501' || status === 401 || status === 403) {
    return new ApiError(403, 'You do not have access to that contact.');
  }

  if (status === 404) {
    return new ApiError(404, 'Contact not found.');
  }

  return new ApiError(502, 'The database rejected that request.', {
    code: code || undefined,
  });
}
