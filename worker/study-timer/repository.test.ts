import { describe, expect, it, vi } from 'vitest'
import { findActiveTimerByUserId } from './repository'

const baseRow = {
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
  testCount: 12,
  focusMinutes: null,
  breakMinutes: null,
  longBreakMinutes: null,
  rounds: null,
  phase: null,
  round: null,
  phaseStartedAt: null,
  version: 3,
}

function databaseReturning(row: unknown) {
  const first = vi.fn(async () => row)
  const bind = vi.fn(() => ({ first }))
  return { database: { prepare: vi.fn(() => ({ bind })) } as unknown as D1Database, bind }
}

describe('study timer repository', () => {
  it('maps the authenticated user timer into the API contract', async () => {
    const { database, bind } = databaseReturning(baseRow)

    await expect(findActiveTimerByUserId(database, 'session-user')).resolves.toEqual({
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
      testCount: 12,
      pomodoro: null,
      version: 3,
    })
    expect(bind).toHaveBeenCalledWith('session-user')
  })

  it('maps pomodoro phase state', async () => {
    const { database } = databaseReturning({
      ...baseRow,
      mode: 'pomodoro',
      timerStatus: 'paused',
      currentSegmentStartedAt: null,
      pausedAt: 1_787_745_300_000,
      focusMinutes: 25,
      breakMinutes: 5,
      longBreakMinutes: 15,
      rounds: 4,
      phase: 'break',
      round: 2,
      phaseStartedAt: 1_787_745_300_000,
    })

    const timer = await findActiveTimerByUserId(database, 'session-user')
    expect(timer?.pomodoro).toEqual({
      plan: { focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 15, rounds: 4 },
      phase: 'break',
      round: 2,
      phaseStartedAt: '2026-08-26T11:55:00.000Z',
    })
  })

  it('returns null when the user has no active timer', async () => {
    const { database } = databaseReturning(null)
    await expect(findActiveTimerByUserId(database, 'session-user')).resolves.toBeNull()
  })
})
