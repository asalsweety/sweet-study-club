import type { PrepInput, PrepPack, ScoreInput, Track } from '../../src/shared/api/learning'
import { validSubjects } from '../../src/shared/lib/learning-catalog'
import { conflict, invalidInput, notFound } from '../http/errors'
import { availableQuestion, contentOf, readableQuestion, usableQuestion, visibility } from './content'

export async function saveAnnotation(db: D1Database, user: string, questionId: string, input: { saved: boolean; note: string; highlight: string }) {
  const row = await availableQuestion(db, questionId)
  if (input.highlight && !contentOf(row).explanation.includes(input.highlight)) throw invalidInput('هایلایت باید بخشی از متن توضیح سؤال باشد.')
  await db.prepare(`INSERT INTO learning_annotations (user_id,question_id,saved,note,highlight,updated_at) VALUES (?,?,?,?,?,?)
    ON CONFLICT(user_id,question_id) DO UPDATE SET saved = excluded.saved, note = excluded.note, highlight = excluded.highlight, updated_at = excluded.updated_at`)
    .bind(user, questionId, Number(input.saved), input.note, input.highlight, Date.now()).run()
}
export async function notebook(db: D1Database, user: string, track: Track) {
  const rows = await db.prepare(`SELECT n.question_id AS questionId, n.saved, n.note, n.highlight, n.updated_at AS updatedAt,
    COALESCE(json_extract(q.content, '$.prompt'), '') AS prompt, p.track, q.subject_id AS subjectId, q.chapter
    FROM learning_annotations n JOIN learning_questions q ON q.id = n.question_id JOIN learning_packs p ON p.id = q.pack_id
    WHERE n.user_id = ? AND p.track = ? AND ${readableQuestion}
      AND (n.saved = 1 OR n.note != '' OR n.highlight != '') ORDER BY n.updated_at DESC`)
    .bind(user, track).all<{ questionId: string; saved: number; note: string; highlight: string; updatedAt: number; prompt: string; track: Track; subjectId: string; chapter: string }>()
  return { entries: rows.results.map((r) => ({ ...r, saved: Boolean(r.saved) })) }
}
export async function learningSummary(db: D1Database, user: string, track: Track) {
  const [totals, subjects, due, saved] = await Promise.all([
    db.prepare(`SELECT COUNT(DISTINCT t.id) AS completed,
      COALESCE(SUM(a.selected_index = json_extract(q.content, '$.correctIndex')),0) AS correct,
      COALESCE(SUM(a.selected_index != json_extract(q.content, '$.correctIndex')),0) AS wrong,
      COALESCE(SUM(a.selected_index IS NULL),0) AS skipped FROM learning_attempts t
      JOIN learning_answers a ON a.attempt_id = t.id JOIN learning_questions q ON q.id = a.question_id
      WHERE t.user_id = ? AND t.track = ? AND t.finished_at IS NOT NULL`).bind(user, track).first(),
    db.prepare(`SELECT q.subject_id AS subjectId,
      COALESCE(SUM(a.selected_index = json_extract(q.content, '$.correctIndex')),0) AS correct,
      COALESCE(SUM(a.selected_index != json_extract(q.content, '$.correctIndex')),0) AS wrong,
      COALESCE(SUM(a.selected_index IS NULL),0) AS skipped FROM learning_attempts t
      JOIN learning_answers a ON a.attempt_id = t.id JOIN learning_questions q ON q.id = a.question_id
      WHERE t.user_id = ? AND t.track = ? AND t.finished_at IS NOT NULL GROUP BY q.subject_id`).bind(user, track).all(),
    db.prepare(`SELECT COUNT(*) AS count FROM learning_reviews r JOIN learning_questions q ON q.id = r.question_id
      JOIN learning_packs p ON p.id = q.pack_id WHERE r.user_id = ? AND p.track = ? AND r.due_at <= ? AND ${visibility} AND ${usableQuestion}`)
      .bind(user, track, Date.now(), Date.now()).first<{ count: number }>(),
    db.prepare(`SELECT COUNT(*) AS count FROM learning_annotations n JOIN learning_questions q ON q.id = n.question_id
      JOIN learning_packs p ON p.id = q.pack_id WHERE n.user_id = ? AND p.track = ? AND n.saved = 1 AND ${visibility} AND ${usableQuestion}`)
      .bind(user, track, Date.now()).first<{ count: number }>(),
  ])
  return { ...totals, subjects: subjects.results, due: due?.count ?? 0, saved: saved?.count ?? 0 }
}
export async function listScores(db: D1Database, user: string) {
  return (await db.prepare(`SELECT id,provider,title,exam_date AS date,score,notes FROM learning_scores WHERE user_id = ?
    ORDER BY exam_date ASC,created_at ASC`).bind(user).all<ScoreInput & { id: string }>()).results
}
export async function createScore(db: D1Database, user: string, input: ScoreInput) {
  const id = crypto.randomUUID()
  await db.prepare('INSERT INTO learning_scores (id,user_id,provider,title,exam_date,score,notes,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .bind(id, user, input.provider, input.title, input.date, input.score, input.notes, Date.now()).run()
  return { id }
}
export async function listPrep(db: D1Database, user: string) {
  return (await db.prepare('SELECT id, content FROM learning_prep WHERE user_id = ? ORDER BY created_at DESC').bind(user)
    .all<{ id: string; content: string }>()).results.map((r) => ({ ...JSON.parse(r.content) as Omit<PrepPack, 'id'>, id: r.id }))
}
export async function createPrep(db: D1Database, user: string, input: PrepInput) {
  if (!validSubjects(input.track, input.subjectIds)) throw invalidInput()
  const id = crypto.randomUUID()
  const kinds = ['learn', 'practice', 'review', 'mock'] as const
  const steps = input.subjectIds.flatMap((subjectId) => kinds.map((kind) => ({ id: `${subjectId}-${kind}`, subjectId, kind, done: false })))
  await db.prepare('INSERT INTO learning_prep (id,user_id,content,created_at) VALUES (?,?,?,?)')
    .bind(id, user, JSON.stringify({ ...input, steps }), Date.now()).run()
  return { id }
}
export async function togglePrep(db: D1Database, user: string, id: string, stepId: string, done: boolean) {
  const row = await db.prepare('SELECT content FROM learning_prep WHERE id = ? AND user_id = ?').bind(id, user).first<{ content: string }>()
  if (!row) throw notFound()
  const pack = JSON.parse(row.content) as Omit<PrepPack, 'id'>
  const step = pack.steps.find((s) => s.id === stepId)
  if (!step) throw notFound()
  step.done = done
  const result = await db.prepare('UPDATE learning_prep SET content = ? WHERE id = ? AND user_id = ? AND content = ?')
    .bind(JSON.stringify(pack), id, user, row.content).run()
  if (!result.meta.changes) throw conflict('PREP_CHANGED', 'پک روی دستگاه دیگری تغییر کرد. دوباره تلاش کن.')
}
