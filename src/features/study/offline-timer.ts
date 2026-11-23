import { stopTimerInputSchema, type CompletedStudyLog, type ManualStudyLogInput, type StartTimerInput, type StopTimerInput, type StudyTimerState, type UpdateTimerInput } from '../../shared/api/study-timer'
import { startOfTehranDay, tehranClock, tehranDateMinuteToEpoch } from '../../shared/lib/tehran'
import { ApiClientError } from '../../shared/api/api-client-error'

export type FinishedTimer = { log: CompletedStudyLog; baseVersion: number | null; manual?: ManualStudyLogInput; problem?: string }
type LocalTimer = { state: StudyTimerState; baseVersion: number | null }
export type TimerJournal = {
  snapshot: StudyTimerState | null
  observedAt: number
  local: LocalTimer | null
  finished: FinishedTimer[]
  deletions: { id: string; date: string; problem?: string }[]
  uncertainStart?: number
  syncLease?: { owner: string; until: number }
}

export const emptyJournal = (): TimerJournal => ({ snapshot: null, observedAt: 0, local: null, finished: [], deletions: [] })
export const elapsedSecondsOf = (timer: StudyTimerState | null | undefined, now = Date.now()) =>
  (timer?.accumulatedSeconds ?? 0) + (timer?.timerStatus === 'running' && timer.currentSegmentStartedAt
    ? Math.max(0, Math.floor((now - Date.parse(timer.currentSegmentStartedAt)) / 1000)) : 0)
const localError = (message: string) => new ApiClientError(message, { code: 'OFFLINE_TIMER' })

export function visibleTimer(journal: TimerJournal, remote: StudyTimerState | null | undefined) {
  if (journal.local) return journal.local.state
  const timer = remote === undefined ? journal.snapshot : remote
  return timer && !journal.finished.some(item => item.log.id === timer.logId && !item.problem) ? timer : null
}

export function beginLocal(journal: TimerJournal, input: Omit<StartTimerInput, 'commandId'>, id: string, now: number) {
  if (input.mode === 'scheduled') throw localError('برای شروع پارت باشگاه به اینترنت وصل شو.')
  if (journal.uncertainStart) throw localError('برای بررسی آخرین درخواست شروع جلسه، یک بار به اینترنت وصل شو.')
  if (visibleTimer(journal, undefined)) throw localError('یک جلسۀ مطالعه در حال اجراست.')
  const time = new Date(now).toISOString()
  const state: StudyTimerState = {
    logId: id, mode: input.mode, subjectName: input.subjectName, title: input.title ?? null, sessionId: null,
    timerStatus: 'running', startedAt: time, currentSegmentStartedAt: time, pausedAt: null, accumulatedSeconds: 0,
    focusLockEnabled: input.focusLockEnabled, testCount: 0, version: 1,
    pomodoro: input.pomodoro && { plan: input.pomodoro, phase: 'focus', round: 1, phaseStartedAt: time, interruptedFocusSeconds: null },
  }
  journal.local = { state, baseVersion: null }
  return state
}

export type LocalCommand =
  | { type: 'pause' | 'resume' }
  | { type: 'update'; fields: Pick<UpdateTimerInput, 'testCount' | 'focusLockEnabled'> }
type StopFields = Omit<StopTimerInput, 'expectedVersion' | 'commandId'>

function takeLocal(journal: TimerJournal, expected: StudyTimerState) {
  const current = journal.local?.state ?? journal.snapshot ?? expected
  if (current.logId !== expected.logId || current.version !== expected.version || journal.finished.some(item => item.log.id === current.logId)) {
    throw localError('جلسه در صفحۀ دیگری تغییر کرد. دوباره امتحان کن.')
  }
  return journal.local ?? { state: current, baseVersion: current.version }
}

export function changeLocal(journal: TimerJournal, expected: StudyTimerState, command: LocalCommand, now: number) {
  const local = takeLocal(journal, expected)
  const state = { ...local.state }
  const time = new Date(now).toISOString()
  const p = state.pomodoro
  if (command.type === 'pause' && state.timerStatus === 'running') {
    state.accumulatedSeconds = elapsedSecondsOf(state, now)
    state.currentSegmentStartedAt = null
    state.pausedAt = time
    state.timerStatus = 'paused'
    if (p) {
      const spent = Math.max(0, Math.floor((now - Date.parse(p.phaseStartedAt)) / 1000))
      state.pomodoro = { ...p, phase: 'break', phaseStartedAt: time, interruptedFocusSeconds: spent < p.plan.focusMinutes * 60 ? spent : null }
    }
  } else if (command.type === 'resume' && state.timerStatus === 'paused') {
    state.currentSegmentStartedAt = time
    state.pausedAt = null
    state.timerStatus = 'running'
    if (p) state.pomodoro = { ...p, phase: 'focus', round: p.interruptedFocusSeconds === null ? p.round % p.plan.rounds + 1 : p.round,
      phaseStartedAt: new Date(now - (p.interruptedFocusSeconds ?? 0) * 1000).toISOString(), interruptedFocusSeconds: null }
  } else if (command.type === 'update') {
    state.testCount = command.fields.testCount ?? state.testCount
    state.focusLockEnabled = command.fields.focusLockEnabled ?? state.focusLockEnabled
  } else return state
  state.version++
  journal.local = { ...local, state }
  return state
}

export function finishLocal(journal: TimerJournal, expected: StudyTimerState, input: StopFields, now: number) {
  const { state, baseVersion } = takeLocal(journal, expected)
  if (!stopTimerInputSchema.safeParse({ ...input, commandId: state.logId, expectedVersion: state.version }).success) {
    throw localError('تعداد تست‌ها، عنوان و یادداشت جلسه را بررسی کن.')
  }
  const durationSeconds = elapsedSecondsOf(state, now)
  if (now - Date.parse(state.startedAt) < durationSeconds * 1000) throw localError('برای ثبت زمان درست، ساعت دستگاه را بررسی کن.')
  const log: CompletedStudyLog = {
    id: state.logId, mode: state.mode, subjectName: state.subjectName, title: input.title === undefined ? state.title : input.title,
    sessionId: state.sessionId, startedAt: state.startedAt, endedAt: new Date(now).toISOString(), durationSeconds,
    recordedManually: false, testCount: input.testCount, testsCorrect: input.testsCorrect, testsWrong: input.testsWrong,
    focusRating: input.focusRating, note: input.note,
  }
  journal.finished.push({ log, baseVersion })
  journal.local = null
  if (journal.snapshot?.logId === log.id) journal.snapshot = null
  return log
}

export function manualStartMinute(input: ManualStudyLogInput, now: number) {
  const duration = input.durationMinutes * 60_000
  const startOfDay = startOfTehranDay(input.date)
  const inferred = Math.min(startOfDay + 86_400_000, now) - duration
  if (input.startMinute === undefined && inferred < startOfDay) throw localError('مدت مطالعه از زمان سپری‌شده در این روز بیشتر است.')
  const startMinute = input.startMinute ?? tehranClock(inferred).minuteOfDay
  const start = tehranDateMinuteToEpoch(input.date, startMinute)
  if (start + duration > now) throw localError('زمان پایان مطالعه باید در گذشته باشد.')
  return startMinute
}

export function recordLocal(journal: TimerJournal, input: ManualStudyLogInput, now: number) {
  const existing = journal.finished.find(entry => entry.log.id === input.recordId)
  if (existing) return existing.log
  const duration = input.durationMinutes * 60_000
  const startMinute = manualStartMinute(input, now)
  const start = tehranDateMinuteToEpoch(input.date, startMinute)
  const log: CompletedStudyLog = {
    id: input.recordId, mode: 'free', subjectName: input.subjectName, title: input.title ?? null, sessionId: null,
    startedAt: new Date(start).toISOString(), endedAt: new Date(start + duration).toISOString(), durationSeconds: input.durationMinutes * 60,
    recordedManually: true, testCount: 0, testsCorrect: 0, testsWrong: 0, focusRating: null, note: null,
  }
  journal.finished.push({ log, baseVersion: null, manual: { ...input, startMinute } })
  return log
}
