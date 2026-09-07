/**
 * Turns whatever the auth client produced into a message worth showing.
 *
 * The Neon/Better Auth client is inconsistent: some failures come back as
 * `{ error }` on a resolved promise, others are THROWN. A thrown 422 for
 * "User already exists" is not a network problem, so a blanket
 * "could not reach the service" message actively misleads people.
 *
 * The rule here: if the server said something, show what the server said. Only
 * claim a connectivity problem when the request genuinely never completed.
 */

interface MaybeAuthError {
  message?: string;
  statusText?: string;
  status?: number;
  code?: string;
  body?: { message?: string; code?: string };
  error?: { message?: string; code?: string };
  response?: { message?: string };
}

/** A fetch that never reached the server throws a TypeError with no status. */
function isNetworkFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const candidate = error as MaybeAuthError;
  if (candidate.status || candidate.body || candidate.error) return false;
  return (
    error.name === 'TypeError' ||
    /failed to fetch|networkerror|load failed/i.test(error.message)
  );
}

export function describeAuthError(error: unknown): string {
  if (isNetworkFailure(error)) {
    return 'Could not reach the sign-in service. Check your connection and try again.';
  }

  const candidate = (error ?? {}) as MaybeAuthError;

  const message =
    candidate.body?.message ??
    candidate.error?.message ??
    candidate.response?.message ??
    candidate.message ??
    candidate.statusText;

  const code = candidate.body?.code ?? candidate.error?.code ?? candidate.code;

  // Give the two most common cases an action, not just a diagnosis.
  if (code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') {
    return 'An account with that email already exists. Sign in instead.';
  }
  if (code === 'INVALID_EMAIL_OR_PASSWORD') {
    return 'That email and password do not match an account.';
  }

  if (message && !/^\[object/.test(message)) return message;

  return 'That did not work. Please try again.';
}
