import { ApiClientError } from './api-client-error'
export { ApiClientError } from './api-client-error'
import type { ZodType } from 'zod'
import { apiErrorEnvelopeSchema } from './error'
import {
  serviceStatusSchema,
  type ServiceStatus,
} from './system'
import {
  profileResponseSchema,
  updateProfileInputSchema,
  type UpdateProfileInput,
  type UserProfile,
} from './profile'
import {
  studyTimerStateResponseSchema,
  type StudyTimerState,
} from './study-timer'

type Fetcher = (
  input: string,
  init: {
    credentials: 'include'
    headers: Record<string, string>
    method: 'GET' | 'PATCH'
    body?: string
  },
) => Promise<Response>

type ApiClientOptions = {
  baseUrl?: string
  fetcher?: Fetcher
}

type RequestOptions = {
  method?: 'GET' | 'PATCH'
  body?: unknown
  acceptedStatuses?: readonly number[]
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
    options: RequestOptions = {},
  ) {
    let response: Response

    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
      }
      const body =
        options.body === undefined
          ? undefined
          : JSON.stringify(options.body)

      if (body !== undefined) {
        headers['Content-Type'] = 'application/json'
      }

      response = await fetcher(`${baseUrl}${path}`, {
        method: options.method ?? 'GET',
        credentials: 'include',
        headers,
        ...(body === undefined ? {} : { body }),
      })
    } catch (cause) {
      throw new ApiClientError('The API could not be reached.', {
        code: 'NETWORK_ERROR',
        cause,
      })
    }

    const payload = await readJson(response)

    if (
      !response.ok &&
      !options.acceptedStatuses?.includes(response.status)
    ) {
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
      request('/api/ready', serviceStatusSchema, {
        acceptedStatuses: [503],
      }),
    getProfile: async (): Promise<UserProfile> => {
      const response = await request(
        '/api/profile',
        profileResponseSchema,
      )
      return response.profile
    },
    updateProfile: async (
      input: UpdateProfileInput,
    ): Promise<UserProfile> => {
      const validatedInput = updateProfileInputSchema.parse(input)
      const response = await request(
        '/api/profile',
        profileResponseSchema,
        {
          method: 'PATCH',
          body: validatedInput,
        },
      )
      return response.profile
    },
    getActiveStudyTimer: async (): Promise<StudyTimerState | null> => {
      const response = await request(
        '/api/study/timer',
        studyTimerStateResponseSchema,
      )
      return response.timer
    },
  }
}

export type ApiClient = ReturnType<typeof createApiClient>

export const apiClient = createApiClient()
