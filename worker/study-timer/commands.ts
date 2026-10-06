import type {
  StartTimerInput,
  StopTimerInput,
  StudyTimerState,
  TimerCommandInput,
  UpdateTimerInput,
  CompletedStudyLog,
} from '../../src/shared/api/study-timer'
import { conflict } from '../http/errors'
import { assertScheduledSessionOpen } from '../schedule/service'
import {
  completedLogColumns,
  findActiveTimerByUserId,
  findActiveTimerRow,
  toCompletedLog,
  type ActiveTimerRow,
} from './repository'

type CommandType = 'start' | 'pause' | 'resume' | 'stop'

async function readReceipt(db: D1Database, userId: string, commandId: string) {
  const row = await db
    .prepare('SELECT response_json AS json FROM study_timer_commands WHERE user_id = ? AND command_id = ?')
    .bind(userId, commandId)
    .first<{ json: string }>()
  return row === null ? null : (JSON.parse(row.json) as unknown)
}

function receipt(db: D1Database, userId: string, commandId: string, type: CommandType, response: unknown, now: number) {
  // Written only after settle() confirmed the guarded write changed a row.
  return db
    .prepare(
      `INSERT OR IGNORE INTO study_timer_commands (user_id, command_id, command_type, response_json, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(userId, commandId, type, JSON.stringify(response), now)
}

async function requireTimer(db: D1Database, userId: string, expectedVersion: number) {
  const row = await findActiveTimerRow(db, userId)
  if (row === null) throw conflict('TIMER_NOT_ACTIVE', 'No study timer is running.')
  if (row.version !== expectedVersion) {
    throw conflict('TIMER_VERSION_CONFLICT', 'The timer changed on another device. Refresh and try again.')
  }
  return row
}

function elapsedSeconds(row: ActiveTimerRow, now: number) {
  if (row.timerStatus === 'paused' || row.currentSegmentStartedAt === null) return row.accumulatedSeconds
  return row.accumulatedSeconds + Math.max(0, Math.floor((now - row.currentSegmentStartedAt) / 1000))
}

async function settle(db: D1Database, userId: string, results: D1Result[], index: number) {
  if ((results[index]?.meta.changes ?? 0) === 0) {
    throw conflict('TIMER_VERSION_CONFLICT', 'The timer changed on another device. Refresh and try again.')
  }
  const state = await findActiveTimerByUserId(db, userId)
  if (state === null) throw conflict('TIMER_NOT_ACTIVE', 'No study timer is running.')
  return state
}

export async function startTimer(db: D1Database, userId: string, input: StartTimerInput, now = Date.now()) {
  const previous = await readReceipt(db, userId, input.commandId)
  if (previous !== null) return previous as StudyTimerState
  if ((await findActiveTimerRow(db, userId)) !== null) {
    throw conflict('TIMER_ALREADY_ACTIVE', 'Another study timer is already running.')
  }
  if (input.mode === 'scheduled' && input.sessionId !== null) {
    await assertScheduledSessionOpen(db, input.sessionId, now)
  }

  const logId = crypto.randomUUID()
  const plan = input.pomodoro
  const results = await db.batch([
    db
      .prepare(
        `INSERT INTO study_logs (id, user_id, mode, subject_name, scheduled_session_id, started_at,
           focus_lock_enabled, pomodoro_focus_minutes, pomodoro_break_minutes,
           pomodoro_long_break_minutes, pomodoro_rounds, created_at, updated_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
         WHERE NOT EXISTS (SELECT 1 FROM active_study_timers WHERE user_id = ?)`,
      )
      .bind(logId, userId, input.mode, input.subjectName, input.sessionId, now,
        input.focusLockEnabled ? 1 : 0, plan?.focusMinutes ?? null, plan?.breakMinutes ?? null,
        plan?.longBreakMinutes ?? null, plan?.rounds ?? null, now, now, userId),
    db
      .prepare(
        `INSERT INTO active_study_timers (user_id, log_id, timer_status, current_segment_started_at,
           accumulated_seconds, version, last_command_id, updated_at,
           pomodoro_phase, pomodoro_round, phase_started_at)
         SELECT ?, ?, 'running', ?, 0, 1, ?, ?, ?, ?, ? WHERE changes() > 0`,
      )
      .bind(userId, logId, now, input.commandId, now,
        plan ? 'focus' : null, plan ? 1 : null, plan ? now : null),
  ])
  const state = await settle(db, userId, results, 1)
  await receipt(db, userId, input.commandId, 'start', state, now).run()
  return state
}

export async function pauseTimer(db: D1Database, userId: string, input: TimerCommandInput, now = Date.now()) {
  const previous = await readReceipt(db, userId, input.commandId)
  if (previous !== null) return previous as StudyTimerState
  const row = await requireTimer(db, userId, input.expectedVersion)
  if (row.timerStatus === 'paused') return findActiveTimerByUserId(db, userId)

  const isPomodoro = row.mode === 'pomodoro'
  const results = await db.batch([
    db
      .prepare(
        `UPDATE active_study_timers SET timer_status = 'paused', current_segment_started_at = NULL,
           paused_at = ?, accumulated_seconds = ?, version = version + 1, last_command_id = ?,
           updated_at = ?, pomodoro_phase = CASE WHEN ? THEN 'break' ELSE pomodoro_phase END,
           phase_started_at = CASE WHEN ? THEN ? ELSE phase_started_at END
         WHERE user_id = ? AND version = ?`,
      )
      .bind(now, elapsedSeconds(row, now), input.commandId, now, isPomodoro ? 1 : 0,
        isPomodoro ? 1 : 0, now, userId, input.expectedVersion),
  ])
  const state = await settle(db, userId, results, 0)
  await receipt(db, userId, input.commandId, 'pause', state, now).run()
  return state
}

export async function resumeTimer(db: D1Database, userId: string, input: TimerCommandInput, now = Date.now()) {
  const previous = await readReceipt(db, userId, input.commandId)
  if (previous !== null) return previous as StudyTimerState
  const row = await requireTimer(db, userId, input.expectedVersion)
  if (row.timerStatus === 'running') return findActiveTimerByUserId(db, userId)

  // Coming back from a pomodoro break starts the next focus round.
  const nextRound =
    row.mode === 'pomodoro' && row.round !== null && row.rounds !== null
      ? (row.round % row.rounds) + 1
      : null
  const results = await db.batch([
    db
      .prepare(
        `UPDATE active_study_timers SET timer_status = 'running', current_segment_started_at = ?,
           paused_at = NULL, version = version + 1, last_command_id = ?, updated_at = ?,
           pomodoro_phase = CASE WHEN ? IS NULL THEN pomodoro_phase ELSE 'focus' END,
           pomodoro_round = COALESCE(?, pomodoro_round),
           phase_started_at = CASE WHEN ? IS NULL THEN phase_started_at ELSE ? END
         WHERE user_id = ? AND version = ?`,
      )
      .bind(now, input.commandId, now, nextRound, nextRound, nextRound, now, userId, input.expectedVersion),
  ])
  const state = await settle(db, userId, results, 0)
  await receipt(db, userId, input.commandId, 'resume', state, now).run()
  return state
}

export async function updateTimer(db: D1Database, userId: string, input: UpdateTimerInput, now = Date.now()) {
  const row = await requireTimer(db, userId, input.expectedVersion)
  const results = await db.batch([
    db
      .prepare(
        `UPDATE study_logs SET test_count = COALESCE(?, test_count),
           focus_lock_enabled = COALESCE(?, focus_lock_enabled), updated_at = ?
         WHERE id = ? AND user_id = ?`,
      )
      .bind(input.testCount ?? null,
        input.focusLockEnabled === undefined ? null : input.focusLockEnabled ? 1 : 0,
        now, row.logId, userId),
    db
      .prepare('UPDATE active_study_timers SET version = version + 1, updated_at = ? WHERE user_id = ? AND version = ?')
      .bind(now, userId, input.expectedVersion),
  ])
  return settle(db, userId, results, 1)
}

export async function stopTimer(db: D1Database, userId: string, input: StopTimerInput, now = Date.now()) {
  const previous = await readReceipt(db, userId, input.commandId)
  if (previous !== null) return previous as CompletedStudyLog
  const row = await requireTimer(db, userId, input.expectedVersion)

  const results = await db.batch([
    db
      .prepare(
        `UPDATE study_logs SET ended_at = ?, duration_seconds = ?, test_count = ?, tests_correct = ?,
           tests_wrong = ?, focus_rating = ?, note = ?, updated_at = ?
         WHERE id = ? AND user_id = ? AND ended_at IS NULL
           AND EXISTS (SELECT 1 FROM active_study_timers WHERE user_id = ? AND version = ?)`,
      )
      .bind(now, elapsedSeconds(row, now), input.testCount, input.testsCorrect, input.testsWrong,
        input.focusRating, input.note || null, now, row.logId, userId, userId, input.expectedVersion),
    db.prepare('DELETE FROM active_study_timers WHERE user_id = ? AND version = ?').bind(userId, input.expectedVersion),
  ])
  if ((results[0]?.meta.changes ?? 0) === 0) {
    throw conflict('TIMER_VERSION_CONFLICT', 'The timer changed on another device. Refresh and try again.')
  }
  const log = toCompletedLog(
    await db.prepare(`SELECT ${completedLogColumns} FROM study_logs WHERE id = ?`).bind(row.logId).first(),
  )
  await db
    .prepare(
      `INSERT OR IGNORE INTO study_timer_commands (user_id, command_id, command_type, response_json, created_at)
       VALUES (?, ?, 'stop', ?, ?)`,
    )
    .bind(userId, input.commandId, JSON.stringify(log), now)
    .run()
  return log
}
