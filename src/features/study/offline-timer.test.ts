import { describe, expect, it } from 'vitest'
import type { StartTimerInput } from '../../shared/api/study-timer'
import { beginLocal, changeLocal, elapsedSecondsOf, emptyJournal, finishLocal, manualStartMinute, recordLocal, visibleTimer } from './offline-timer'

const start = Date.parse('2026-11-23T10:00:00Z')
const free: Omit<StartTimerInput, 'commandId'> = { mode: 'free', subjectName: 'زیست', pomodoro: null, sessionId: null, focusLockEnabled: false }
const stop = { testCount: 3, testsCorrect: 2, testsWrong: 1, note: 'مرور', focusRating: 4 }
describe('offline study timer', () => {
  it('persists the original wall-clock start across reload and excludes breaks from independently timed sessions', () => {
    const journal = emptyJournal()
    const started = beginLocal(journal, free, crypto.randomUUID(), start)
    const paused = changeLocal(journal, started, { type: 'pause' }, start + 62_900)
    expect(elapsedSecondsOf(paused, start + 180_000)).toBe(62)
    const reopened = structuredClone(journal)
    const resumed = changeLocal(reopened, paused, { type: 'resume' }, start + 300_000)
    const result = finishLocal(reopened, resumed, stop, start + 322_000)
    expect(result).toMatchObject({ id: started.logId, startedAt: started.startedAt, durationSeconds: 84, testsCorrect: 2, recordedManually: false })
    expect(reopened.finished[0]?.baseVersion).toBe(null)
    expect(visibleTimer(reopened, resumed)).toBeNull()
    expect(() => finishLocal(reopened, resumed, stop, start + 323_000)).toThrow()
    expect(reopened.finished).toHaveLength(1)
  })

  it('resumes the same Pomodoro phase on a short break and advances once after a complete round', () => {
    const journal = emptyJournal()
    const plan = { rounds: 2, focusMinutes: 5, breakMinutes: 1, longBreakMinutes: 2 }
    const started = beginLocal(journal, { ...free, mode: 'pomodoro', pomodoro: plan }, crypto.randomUUID(), start)
    const pause = changeLocal(journal, started, { type: 'pause' }, start + 120_000)
    const resume = changeLocal(journal, pause, { type: 'resume' }, start + 240_000)
    expect(resume.pomodoro).toMatchObject({ round: 1, phaseStartedAt: new Date(start + 120_000).toISOString() })
    const secondPause = changeLocal(journal, resume, { type: 'pause' }, start + 423_000)
    expect(secondPause.pomodoro?.interruptedFocusSeconds).toBe(null)
    const second = changeLocal(journal, secondPause, { type: 'resume' }, start + 600_000)
    expect(second.pomodoro).toMatchObject({ round: 2, phaseStartedAt: new Date(start + 600_000).toISOString() })
    expect(elapsedSecondsOf(second, start + 600_000)).toBe(303)
  })

  it('carries the original server version even after several local edits and rejects stale tabs', () => {
    const journal = emptyJournal()
    const server = { ...beginLocal(journal, free, crypto.randomUUID(), start), version: 9 }
    journal.snapshot = server
    journal.local = null
    const edited = changeLocal(journal, server, { type: 'update', fields: { focusLockEnabled: true } }, start + 1000)
    expect(() => changeLocal(journal, server, { type: 'pause' }, start + 2000)).toThrow()
    finishLocal(journal, edited, stop, start + 5000)
    expect(journal.finished[0]?.baseVersion).toBe(9)
    expect(() => beginLocal(journal, { ...free, mode: 'scheduled', sessionId: 'unverified' }, crypto.randomUUID(), start)).toThrow()
    journal.uncertainStart = start
    expect(() => beginLocal(journal, free, crypto.randomUUID(), start)).toThrow()
  })

  it('freezes a manual entry’s start minute and record ID for a later replay', () => {
    const journal = emptyJournal()
    const input = { recordId: crypto.randomUUID(), date: '2026-11-23', subjectName: 'تاریخ', durationMinutes: 37 }
    const first = recordLocal(journal, input, start + 59_000)
    expect(first).toMatchObject({ id: input.recordId, recordedManually: true, durationSeconds: 2220 })
    expect(journal.finished[0]?.manual?.startMinute).toBe(12 * 60 + 53)
    expect(recordLocal(journal, input, start + 100_000)).toBe(first)
    expect(journal.finished).toHaveLength(1)
    expect(() => recordLocal(journal, { ...input, recordId: crypto.randomUUID(), startMinute: 23 * 60 }, start)).toThrow()
  })

  it('replays the exact submitted minute after losing an online response at a minute boundary', () => {
    const journal = emptyJournal()
    const form = { recordId: crypto.randomUUID(), date: '2026-11-23', subjectName: 'تاریخ', durationMinutes: 10 }
    const submitted = { ...form, startMinute: manualStartMinute(form, start + 59_000) }
    expect(manualStartMinute(form, start + 65_000)).toBe(submitted.startMinute + 1)
    const log = recordLocal(journal, submitted, start + 65_000)
    expect(journal.finished[0]?.manual).toEqual(submitted)
    expect(log.id).toBe(submitted.recordId)
  })
})
