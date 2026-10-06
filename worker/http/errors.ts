import type { ContentfulStatusCode } from 'hono/utils/http-status'

/**
 * A failure that is safe to show the client: a stable code and a short
 * message, never database or provider internals.
 */
export class ApiError extends Error {
  readonly status: ContentfulStatusCode
  readonly code: string

  constructor(status: ContentfulStatusCode, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export const notFound = (message = 'The resource does not exist.') =>
  new ApiError(404, 'NOT_FOUND', message)

export const conflict = (code: string, message: string) =>
  new ApiError(409, code, message)

export const forbidden = (message = 'You cannot do this.') =>
  new ApiError(403, 'FORBIDDEN', message)

export const invalidInput = (message = 'The request is invalid.') =>
  new ApiError(400, 'VALIDATION_ERROR', message)
