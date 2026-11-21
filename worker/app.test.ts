import { describe, expect, it, vi } from 'vitest'
import { serviceStatusSchema } from '../src/shared/api/system'
import { profileResponseSchema } from '../src/shared/api/profile'
import { studyTimerStateResponseSchema } from '../src/shared/api/study-timer'
import { createWorkerApp } from './app'
import type { WorkerBindings } from './types'

function createBindings(schemaVersion: string | null): WorkerBindings {
  const first = vi.fn(async () =>
    schemaVersion === null ? null : { value: schemaVersion },
  )
  const bind = vi.fn(() => ({ first }))
  const prepare = vi.fn(() => ({ bind }))

  return {
    APP_ENVIRONMENT: 'test',
    APP_ORIGIN: 'https://example.com',
    ASSETS: {
      fetch: vi.fn(async () => new Response('asset')),
    } as unknown as Fetcher,
    DB: { prepare } as unknown as D1Database,
  }
}

describe('system routes', () => {
  it('reports a healthy Worker without requiring the database', async () => {
    const response = await createWorkerApp().request(
      '/api/health',
      undefined,
      createBindings(null),
    )
    const payload = serviceStatusSchema.parse(await response.json())

    expect(response.status).toBe(200)
    expect(payload.status).toBe('ok')
    expect(payload.environment).toBe('test')
  })

  it('reports ready when the expected migration exists', async () => {
    const response = await createWorkerApp().request(
      '/api/ready',
      undefined,
      createBindings('18'),
    )
    const payload = serviceStatusSchema.parse(await response.json())

    expect(response.status).toBe(200)
    expect(payload.status).toBe('ok')
  })

  it('fails closed when authentication secrets are missing', async () => {
    const response = await createWorkerApp().request(
      '/api/auth/get-session',
      undefined,
      createBindings('12'),
    )
    const payload = await response.json()

    expect(response.status).toBe(500)
    expect(JSON.stringify(payload)).not.toContain('BETTER_AUTH_SECRET')
  })

  it('does not expose database errors when the schema is unavailable', async () => {
    const response = await createWorkerApp().request(
      '/api/ready',
      undefined,
      createBindings(null),
    )
    const payload = serviceStatusSchema.parse(await response.json())

    expect(response.status).toBe(503)
    expect(payload.status).toBe('unavailable')
    expect(JSON.stringify(payload)).not.toContain('migration')
  })
})

describe('profile routes', () => {
  it('rejects requests without a valid session', async () => {
    const response = await createWorkerApp({
      resolveSession: async () => null,
    }).request('/api/profile', undefined, createBindings('12'))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication is required.',
        requestId: expect.any(String),
      },
    })
  })

  it('uses the session user ID instead of request input', async () => {
    const first = vi.fn(async () => ({
      id: 'session-user',
      email: 'learner@example.com',
      displayName: 'Ada Learner',
      avatarUrl: null,
      role: 'member',
      theme: 'system',
    }))
    const bind = vi.fn(() => ({ first }))
    const bindings = {
      ...createBindings('12'),
      DB: {
        prepare: vi.fn(() => ({ bind })),
      } as unknown as D1Database,
    }
    const response = await createWorkerApp({
      resolveSession: async () => ({
        user: { id: 'session-user' },
      }),
    }).request(
      '/api/profile?userId=somebody-else',
      undefined,
      bindings,
    )
    const payload = profileResponseSchema.parse(await response.json())

    expect(response.status).toBe(200)
    expect(payload.profile.id).toBe('session-user')
    expect(bind).toHaveBeenCalledWith('session-user')
  })

  it('rejects invalid profile changes before querying D1', async () => {
    const bindings = createBindings('12')
    const response = await createWorkerApp({
      resolveSession: async () => ({
        user: { id: 'session-user' },
      }),
    }).request(
      '/api/profile',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'admin', theme: 'dark' }),
      },
      bindings,
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The profile changes are invalid.',
        requestId: expect.any(String),
      },
    })
    expect(bindings.DB.prepare).not.toHaveBeenCalled()
  })
})

describe('study timer routes', () => {
  it('loads only the authenticated user timer', async () => {
    const first = vi.fn(async () => ({
      logId: 'log-123',
      mode: 'free',
      subjectName: 'Physics',
      sessionId: null,
      timerStatus: 'paused',
      startedAt: 1_787_743_800_000,
      currentSegmentStartedAt: null,
      pausedAt: 1_787_743_920_000,
      accumulatedSeconds: 120,
      focusLockEnabled: 0,
      testCount: 0,
      focusMinutes: null,
      breakMinutes: null,
      longBreakMinutes: null,
      rounds: null,
      phase: null,
      round: null,
      phaseStartedAt: null,
      version: 2,
    }))
    const bind = vi.fn(() => ({ first }))
    const bindings = {
      ...createBindings('12'),
      DB: {
        prepare: vi.fn(() => ({ bind })),
      } as unknown as D1Database,
    }
    const response = await createWorkerApp({
      resolveSession: async () => ({
        user: { id: 'session-user' },
      }),
    }).request('/api/study/timer', undefined, bindings)
    const payload = studyTimerStateResponseSchema.parse(
      await response.json(),
    )

    expect(response.status).toBe(200)
    expect(payload.timer?.timerStatus).toBe('paused')
    expect(bind).toHaveBeenCalledWith('session-user')
  })
})
