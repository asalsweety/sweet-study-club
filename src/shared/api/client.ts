import type { ZodType } from 'zod'
import { apiErrorEnvelopeSchema } from './error'
import {
  serviceStatusSchema,
  type ServiceStatus,
} from './system'

type Fetcher = (
  input: string,
  init: {
    credentials: 'include'
    headers: Record<string, string>
  },
) => Promise<Response>

type ApiClientOptions = {
  baseUrl?: string
  fetcher?: Fetcher
}

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

function normalizeBaseUrl(baseUrl: string | undefined) {
  return (baseUrl ?? '').trim().replace(/\/$/, '')
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch (cause) {
    throw new ApiClientError('The server returned an invalid response.', {
      code: 'INVALID_RESPONSE',
      status: response.status,
      cause,
    })
  }
}

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl)
  const fetcher =
    options.fetcher ??
    ((input, init) =>
      globalThis.fetch(input, init))

  async function request<T>(
    path: string,
    schema: ZodType<T>,
    acceptedStatuses: readonly number[] = [],
  ) {
    let response: Response

    try {
      response = await fetcher(`${baseUrl}${path}`, {
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      })
    } catch (cause) {
      throw new ApiClientError('The API could not be reached.', {
        code: 'NETWORK_ERROR',
        cause,
      })
    }

    const payload = await readJson(response)

    if (!response.ok && !acceptedStatuses.includes(response.status)) {
      const parsedError = apiErrorEnvelopeSchema.safeParse(payload)

      throw new ApiClientError(
        parsedError.success
          ? parsedError.data.error.message
          : 'The server could not complete this request.',
        {
          code: parsedError.success
            ? parsedError.data.error.code
            : 'REQUEST_FAILED',
          ...(parsedError.success &&
          parsedError.data.error.requestId !== undefined
            ? { requestId: parsedError.data.error.requestId }
            : {}),
          status: response.status,
        },
      )
    }

    const parsedPayload = schema.safeParse(payload)

    if (!parsedPayload.success) {
      throw new ApiClientError('The server returned an invalid response.', {
        code: 'INVALID_RESPONSE',
        status: response.status,
        cause: parsedPayload.error,
      })
    }

    return parsedPayload.data
  }

  return {
    getHealth: (): Promise<ServiceStatus> =>
      request('/api/health', serviceStatusSchema),
    getReadiness: (): Promise<ServiceStatus> =>
      request('/api/ready', serviceStatusSchema, [503]),
  }
}

export type ApiClient = ReturnType<typeof createApiClient>

export const apiClient = createApiClient()
