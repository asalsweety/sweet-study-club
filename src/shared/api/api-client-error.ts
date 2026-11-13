type ApiClientErrorOptions = {
  code: string
  requestId?: string
  status?: number
  cause?: unknown
}

export class ApiClientError extends Error {
  readonly code: string
  readonly requestId: string | undefined
  readonly status: number | undefined

  constructor(message: string, options: ApiClientErrorOptions) {
    super(message, { cause: options.cause })
    this.name = 'ApiClientError'
    this.code = options.code
    this.requestId = options.requestId
    this.status = options.status
  }
}

