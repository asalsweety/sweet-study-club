import { describe, expect, it, vi } from 'vitest'
import { findActiveTimerByUserId } from './repository'

describe('study timer repository', () => {
  it('maps the authenticated user timer into the API contract', async () => {
    const first = vi.fn(async () => ({
      logId: 'log-123',
      mode: 'free',
      subjectName: 'Physics',
      sessionId: null,
      timerStatus: 'running',
      startedAt: 1_787_743_800_000,
      currentSegmentStartedAt: 1_787_743_860_000,
      pausedAt: null,
      accumulatedSeconds: 120,
      focusLockEnabled: 1,
      version: 3,
    }))
    const bind = vi.fn(() => ({ first }))
    const prepare = vi.fn(() => ({ bind }))

    await expect(
      findActiveTimerByUserId(
        { prepare } as unknown as D1Database,
        'session-user',
      ),
    ).resolves.toEqual({
      logId: 'log-123',
      mode: 'free',
      subjectName: 'Physics',
      sessionId: null,
      timerStatus: 'running',
      startedAt: '2026-08-26T11:30:00.000Z',
      currentSegmentStartedAt: '2026-08-26T11:31:00.000Z',
      pausedAt: null,
      accumulatedSeconds: 120,
      focusLockEnabled: true,
      version: 3,
    })
    expect(bind).toHaveBeenCalledWith('session-user')
  })

  it('returns null when the user has no active timer', async () => {
    const first = vi.fn(async () => null)
    const bind = vi.fn(() => ({ first }))
    const database = {
      prepare: vi.fn(() => ({ bind })),
    } as unknown as D1Database

    await expect(
      findActiveTimerByUserId(database, 'session-user'),
    ).resolves.toBeNull()
  })
})
