import { describe, expect, it, vi } from 'vitest'
import { serviceStatusSchema } from '../src/shared/api/system'
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
      createBindings('2'),
    )
    const payload = serviceStatusSchema.parse(await response.json())

    expect(response.status).toBe(200)
    expect(payload.status).toBe('ok')
  })

  it('fails closed when authentication secrets are missing', async () => {
    const response = await createWorkerApp().request(
      '/api/auth/get-session',
      undefined,
      createBindings('2'),
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
