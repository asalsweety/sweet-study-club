import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from './client'

const validStatus = {
  service: 'sweet-study-club-api',
  status: 'ok',
  environment: 'test',
  timestamp: '2026-08-26T10:00:00.000Z',
  requestId: 'request-123',
} as const

const validProfile = {
  id: 'user-123',
  email: 'learner@example.com',
  displayName: 'Ada Learner',
  avatarUrl: null,
  role: 'member',
  theme: 'system',
} as const

const validStudyTimer = {
  logId: 'log-123',
  mode: 'free',
  subjectName: 'Physics',
  sessionId: null,
  timerStatus: 'running',
  startedAt: '2026-08-26T18:10:00.000Z',
  currentSegmentStartedAt: '2026-08-26T18:11:00.000Z',
  pausedAt: null,
  accumulatedSeconds: 120,
  focusLockEnabled: true,
  testCount: 0,
  pomodoro: null,
  version: 3,
} as const

describe('API client', () => {
  it('uses the configured origin and includes session cookies', async () => {
    const fetcher = vi.fn(async () => Response.json(validStatus))
    const client = createApiClient({
      baseUrl: 'https://api.example.com/',
      fetcher,
    })

    await expect(client.getHealth()).resolves.toEqual(validStatus)
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.example.com/api/health',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('rejects a successful response that violates the contract', async () => {
    const client = createApiClient({
      fetcher: vi.fn(async () => Response.json({ status: 'ok' })),
    })

    await expect(client.getHealth()).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
      status: 200,
    })
  })

  it('returns a valid unavailable readiness status', async () => {
    const unavailableStatus = {
      ...validStatus,
      status: 'unavailable',
    } as const
    const client = createApiClient({
      fetcher: vi.fn(async () =>
        Response.json(unavailableStatus, { status: 503 }),
      ),
    })

    await expect(client.getReadiness()).resolves.toEqual(
      unavailableStatus,
    )
  })

  it('preserves safe API error details and the request ID', async () => {
    const client = createApiClient({
      fetcher: vi.fn(async () =>
        Response.json(
          {
            error: {
              code: 'NOT_FOUND',
              message: 'The route does not exist.',
              requestId: 'request-456',
            },
          },
          { status: 404 },
        ),
      ),
    })

    await expect(client.getHealth()).rejects.toEqual(
      expect.objectContaining({
        code: 'NOT_FOUND',
        message: 'The route does not exist.',
        requestId: 'request-456',
        status: 404,
      }),
    )
  })

  it('turns transport failures into a stable application error', async () => {
    const client = createApiClient({
      fetcher: vi.fn(async () => {
        throw new TypeError('private transport details')
      }),
    })

    await expect(client.getHealth()).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      message: 'The API could not be reached.',
    })
  })

  it('reads a profile through the shared response contract', async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ profile: validProfile }),
    )
    const client = createApiClient({ fetcher })

    await expect(client.getProfile()).resolves.toEqual(validProfile)
    expect(fetcher).toHaveBeenCalledWith(
      '/api/profile',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('validates and normalizes profile changes before sending them', async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        profile: { ...validProfile, displayName: 'Ada Updated' },
      }),
    )
    const client = createApiClient({ fetcher })

    await client.updateProfile({ displayName: '  Ada Updated  ' })

    expect(fetcher).toHaveBeenCalledWith(
      '/api/profile',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ displayName: 'Ada Updated' }),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    )
  })

  it('does not send an empty profile update', async () => {
    const fetcher = vi.fn()
    const client = createApiClient({ fetcher })

    await expect(client.updateProfile({})).rejects.toBeInstanceOf(
      Error,
    )
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('reads the active timer through the shared contract', async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ timer: validStudyTimer }),
    )
    const client = createApiClient({ fetcher })

    await expect(client.getActiveStudyTimer()).resolves.toEqual(
      validStudyTimer,
    )
    expect(fetcher).toHaveBeenCalledWith(
      '/api/study/timer',
      expect.objectContaining({ method: 'GET' }),
    )
  })
})
