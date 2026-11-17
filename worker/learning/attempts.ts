import type { Attempt, StartAttempt } from '../../src/shared/api/learning'
import { examResult, validSubjects } from '../../src/shared/lib/learning-catalog'
import { conflict, invalidInput, notFound } from '../http/errors'
import { contentOf, questionColumns, questionFilter, type QuestionRow } from './content'

type AttemptRow = { id: string; track: Attempt['track']; mode: Attempt['mode']; startedAt: number; finishedAt: number | null }
type AnswerRow = QuestionRow & { ordinal: number; selectedIndex: number | null; answeredAt: number | null }
export async function ownedAttempt(db: D1Database, user: string, id: string) {
  const row = await db.prepare(`SELECT id, track, mode, started_at AS startedAt, finished_at AS finishedAt
    FROM learning_attempts WHERE id = ? AND user_id = ?`).bind(id, user).first<AttemptRow>()
  if (!row) throw notFound()
  return row
}
async function answersFor(db: D1Database, id: string) {
  return (await db.prepare(`SELECT ${questionColumns}, a.ordinal, a.selected_index AS selectedIndex, a.answered_at AS answeredAt
    FROM learning_answers a JOIN learning_questions q ON q.id = a.question_id JOIN learning_packs p ON p.id = q.pack_id
    WHERE a.attempt_id = ? ORDER BY a.ordinal`).bind(id).all<AnswerRow>()).results
}
export async function loadAttempt(db: D1Database, user: string, id: string): Promise<Attempt> {
  const attempt = await ownedAttempt(db, user, id)
  const rows = await answersFor(db, id)
  // Each person's most recent completed response counts once in community statistics.
  const stats = await db.prepare(`WITH latest AS (
    SELECT a.question_id, a.selected_index, ROW_NUMBER() OVER (PARTITION BY t.user_id, a.question_id ORDER BY t.finished_at DESC, t.rowid DESC) AS rank
    FROM learning_answers a JOIN learning_attempts t ON t.id = a.attempt_id
    WHERE t.finished_at IS NOT NULL AND a.question_id IN (SELECT question_id FROM learning_answers WHERE attempt_id = ?)
  ) SELECT l.question_id AS id,
    SUM(CASE WHEN l.selected_index = json_extract(q.content, '$.correctIndex') THEN 1 ELSE 0 END) AS correct,
    SUM(CASE WHEN l.selected_index != json_extract(q.content, '$.correctIndex') THEN 1 ELSE 0 END) AS wrong,
    SUM(CASE WHEN l.selected_index IS NULL THEN 1 ELSE 0 END) AS skipped
    FROM latest l JOIN learning_questions q ON q.id = l.question_id WHERE l.rank = 1 GROUP BY l.question_id`)
    .bind(id).all<{ id: string; correct: number; wrong: number; skipped: number }>()
  const byQuestion = new Map(stats.results.map((s) => [s.id, { correct: s.correct, wrong: s.wrong, skipped: s.skipped }]))
  return {
    ...attempt,
    items: rows.map((row) => {
      const content = contentOf(row)
      const reveal = attempt.finishedAt !== null || (attempt.mode === 'practice' && row.answeredAt !== null)
      return {
        questionId: row.id, ordinal: row.ordinal, prompt: content.prompt ?? '', options: content.options,
        subjectId: row.subjectId, chapter: row.chapter, difficulty: row.difficulty, packTitle: row.packTitle,
        isSample: Boolean(row.isSample), grade: row.grade, selectedIndex: row.selectedIndex, answered: row.answeredAt !== null,
        language: content.language ?? 'fa', source: content.source ?? null,
        images: content.images ?? [],
        feedback: reveal ? { correctIndex: content.correctIndex, explanation: content.explanation, topic: content.topic,
          stats: byQuestion.get(row.id) ?? { correct: 0, wrong: 0, skipped: 0 } } : null,
      }
    }),
    result: attempt.finishedAt === null ? null : examResult(rows.map((r) => ({ selectedIndex: r.selectedIndex, correctIndex: contentOf(r).correctIndex }))),
  }
}
export async function startAttempt(db: D1Database, user: string, input: StartAttempt) {
  const existing = await db.prepare('SELECT user_id AS user FROM learning_attempts WHERE id = ?').bind(input.id).first<{ user: string }>()
  if (existing) {
    if (existing.user !== user) throw notFound()
    return loadAttempt(db, user, input.id)
  }
  if (!validSubjects(input.track, input.subjectIds)) throw invalidInput()
  const filter = questionFilter(input, user)
  const rows = await db.prepare(`SELECT q.id FROM learning_questions q JOIN learning_packs p ON p.id = q.pack_id
    WHERE ${filter.sql} ORDER BY ${input.pool === 'due' ? '(SELECT due_at FROM learning_reviews WHERE user_id = ? AND question_id = q.id)' : 'RANDOM()'} LIMIT ?`)
    .bind(...filter.values, ...(input.pool === 'due' ? [user] : []), input.count).all<{ id: string }>()
  if (!rows.results.length) throw notFound('برای این انتخاب سؤالی موجود نیست. فیلترها را تغییر بده.')
  try {
    await db.batch([
      db.prepare('INSERT INTO learning_attempts (id,user_id,track,mode,started_at) VALUES (?,?,?,?,?)')
        .bind(input.id, user, input.track, input.mode, Date.now()),
      db.prepare(`INSERT INTO learning_answers (attempt_id,question_id,ordinal)
        SELECT ?, json_extract(value, '$.id'), CAST(key AS INTEGER) FROM json_each(?)`)
        .bind(input.id, JSON.stringify(rows.results)),
    ])
  } catch (error) {
    const retry = await db.prepare('SELECT user_id AS user FROM learning_attempts WHERE id = ?').bind(input.id).first<{ user: string }>()
    if (!retry) throw error
    if (retry.user !== user) throw notFound()
  }
  return loadAttempt(db, user, input.id)
}
export async function answerQuestion(db: D1Database, user: string, id: string, questionId: string, selected: number | null) {
  const attempt = await ownedAttempt(db, user, id)
  if (attempt.finishedAt !== null) throw conflict('ATTEMPT_FINISHED', 'آزمون پایان یافته است.')
  const result = await db.prepare(`UPDATE learning_answers SET selected_index = ?, answered_at = ?
    WHERE attempt_id = ? AND question_id = ? AND (? = 'exam' OR answered_at IS NULL)
    AND EXISTS (SELECT 1 FROM learning_attempts WHERE id = ? AND user_id = ? AND finished_at IS NULL)`)
    .bind(selected, Date.now(), id, questionId, attempt.mode, id, user).run()
  if (!result.meta.changes) {
    const item = await db.prepare('SELECT question_id FROM learning_answers WHERE attempt_id = ? AND question_id = ?').bind(id, questionId).first()
    if (!item) throw notFound()
    throw conflict('ANSWER_LOCKED', 'پاسخ آموزشی قبلاً ثبت شده است.')
  }
  return loadAttempt(db, user, id)
}
export async function finishAttempt(db: D1Database, user: string, id: string) {
  const attempt = await ownedAttempt(db, user, id)
  if (attempt.finishedAt !== null) return loadAttempt(db, user, id)
  const now = Date.now()
  // D1 batch is transactional; finished_at gates review updates, including retries/concurrent finishes.
  await db.batch([
    db.prepare(`INSERT INTO learning_reviews (user_id,question_id,due_at,interval_days,repetitions)
      SELECT ?, a.question_id, ? + 86400000, 1, 1 FROM learning_answers a WHERE a.attempt_id = ?
      AND EXISTS (SELECT 1 FROM learning_attempts WHERE id = ? AND user_id = ? AND finished_at IS NULL)
      ON CONFLICT(user_id,question_id) DO UPDATE SET
        interval_days = CASE WHEN (SELECT a.selected_index = json_extract(q.content, '$.correctIndex') FROM learning_answers a
          JOIN learning_questions q ON q.id = a.question_id WHERE a.attempt_id = ? AND a.question_id = learning_reviews.question_id)
          THEN MIN(60, learning_reviews.interval_days * 2) ELSE 1 END,
        due_at = ? + 86400000 * CASE WHEN (SELECT a.selected_index = json_extract(q.content, '$.correctIndex') FROM learning_answers a
          JOIN learning_questions q ON q.id = a.question_id WHERE a.attempt_id = ? AND a.question_id = learning_reviews.question_id)
          THEN MIN(60, learning_reviews.interval_days * 2) ELSE 1 END,
        repetitions = learning_reviews.repetitions + 1`)
      .bind(user, now, id, id, user, id, now, id),
    db.prepare('UPDATE learning_attempts SET finished_at = ? WHERE id = ? AND user_id = ? AND finished_at IS NULL').bind(now, id, user),
  ])
  return loadAttempt(db, user, id)
}
export async function attemptHistory(db: D1Database, user: string, track: string) {
  const rows = await db.prepare(`SELECT t.id, t.track, t.mode, t.started_at AS startedAt, t.finished_at AS finishedAt, COUNT(*) AS count,
    SUM(CASE WHEN a.selected_index = json_extract(q.content, '$.correctIndex') THEN 1 ELSE 0 END) AS correct,
    SUM(CASE WHEN a.selected_index != json_extract(q.content, '$.correctIndex') THEN 1 ELSE 0 END) AS wrong,
    SUM(CASE WHEN a.selected_index IS NULL THEN 1 ELSE 0 END) AS skipped
    FROM learning_attempts t JOIN learning_answers a ON a.attempt_id = t.id JOIN learning_questions q ON q.id = a.question_id
    WHERE t.user_id = ? AND t.track = ? GROUP BY t.id ORDER BY t.started_at DESC LIMIT 50`).bind(user, track)
    .all<AttemptRow & { count: number; correct: number; wrong: number; skipped: number }>()
  return rows.results.map(({ count, correct, wrong, skipped, ...row }) => ({ ...row, count,
    result: row.finishedAt === null ? null : { correct, wrong, skipped, percent: Math.round((correct * 3 - wrong) / (count * 3) * 10000) / 100 },
  }))
}
