import { describe, expect, it, vi } from 'vitest'
import { createAuth } from './auth'
import type { WorkerBindings } from './types'

// These tests inspect our policy configuration and role hook, not the adapter.
// Avoid starting Better Auth against the intentionally empty D1 fixture.
vi.mock('better-auth', () => ({ betterAuth: (options: unknown) => ({ options }) }))

const bindings = (extra: Partial<WorkerBindings> = {}): WorkerBindings => ({
  APP_ENVIRONMENT: 'production', APP_ORIGIN: 'https://asal.example.com',
  BETTER_AUTH_SECRET: 'test-only-secret-at-least-32-characters',
  DB: {} as D1Database, ASSETS: {} as Fetcher, ...extra,
})
describe('deployment authentication policy', () => {
  it('requires an explicit remote opt-in and shares rate limits through D1', () => {
    const disabled = createAuth(bindings()).options
    expect(disabled.emailAndPassword?.enabled).toBe(false)
    const enabled = createAuth(bindings({ EMAIL_PASSWORD_AUTH_ENABLED: 'true' })).options
    expect(enabled.emailAndPassword?.enabled).toBe(true)
    expect(enabled.rateLimit).toMatchObject({ enabled: true, storage: 'database' })
    expect(enabled.advanced?.useSecureCookies).toBe(true)
    expect(enabled.trustedOrigins).toEqual(['https://asal.example.com'])
  })
  it('does not promote an unverified remote signup by its claimed email', async () => {
    const auth = createAuth(bindings({ ADMIN_EMAILS: 'owner@example.com' }))
    const hook = auth.options.databaseHooks!.user!.create!.before!
    const result = await hook({ id: 'test', email: 'owner@example.com', name: 'Owner', emailVerified: false, createdAt: new Date(), updatedAt: new Date() })
    expect(result && result.data).toMatchObject({ role: 'member' })
  })
})

describe('display names', () => {
  it('accepts 2–40 characters after trimming and tidies spaces', async () => {
    const { normalizeDisplayName } = await import('./auth')
    expect(normalizeDisplayName('  عسل  ')).toBe('عسل')
    expect(normalizeDisplayName('Ada   Lovelace')).toBe('Ada Lovelace')
    expect(() => normalizeDisplayName('ع')).toThrow()
    expect(() => normalizeDisplayName('   ')).toThrow()
    expect(() => normalizeDisplayName('x'.repeat(41))).toThrow()
    expect(() => normalizeDisplayName(undefined)).toThrow()
  })
})
