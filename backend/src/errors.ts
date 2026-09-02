/**
 * A failure we are happy to describe to the client. Anything that is not an
 * ApiError becomes a generic 500 so internal details never leak.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new ApiError(400, message, details);

export const unauthorized = (message = 'You must be signed in to do that.') =>
  new ApiError(401, message);

export const notFound = (message = 'Contact not found.') =>
  new ApiError(404, message);
