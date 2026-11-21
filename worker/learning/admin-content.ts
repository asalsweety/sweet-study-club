import type { PackMetadataInput, QuestionInput, Track } from '../../src/shared/api/learning'
import { validSubjects } from '../../src/shared/lib/learning-catalog'
import { conflict, invalidInput, notFound } from '../http/errors'
import { contentOf } from './content'

export async function savePack(db: D1Database, input: PackMetadataInput, id?: string) {
  const fields = [
    input.title, input.track, input.bank, input.provider, input.grade ?? null, input.year, input.period,
    Date.parse(input.availableAt), Number(input.isSample), input.attribution, Number(input.isActive),
  ] as const
  if (id === undefined) {
    const result = await db.prepare(`INSERT INTO learning_packs
      (title, track, bank, provider, grade, year, period, available_at, is_sample, attribution, is_active, id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`)
      .bind(...fields, input.key, Date.now()).run()
    if (!result.meta.changes) throw conflict('PACK_EXISTS', 'این کلید قبلاً برای یک بسته استفاده شده است.')
    return { id: input.key }
  }
  if (id !== input.key) throw invalidInput('کلید بسته پس از ساخت ثابت است.')
  const result = await db.prepare(`UPDATE learning_packs SET title = ?, track = ?, bank = ?, provider = ?, grade = ?, year = ?,
    period = ?, available_at = ?, is_sample = ?, attribution = ?, is_active = ? WHERE id = ? AND archived_at IS NULL
    AND (track = ? OR NOT EXISTS (SELECT 1 FROM learning_questions WHERE pack_id = learning_packs.id))`)
    .bind(...fields, id, input.track).run()
  if (!result.meta.changes) {
    await editablePack(db, id)
    throw conflict('PACK_TRACK_IN_USE', 'مسیر بسته‌ای که سؤال دارد قابل تغییر نیست.')
  }
  return { id }
}

export async function setPackArchived(db: D1Database, id: string, archived: boolean) {
  const result = await db.prepare(`UPDATE learning_packs SET archived_at = ?, is_active = 0
    WHERE id = ? AND archived_at IS ${archived ? '' : 'NOT '}NULL`).bind(archived ? Date.now() : null, id).run()
  if (!result.meta.changes && !await db.prepare('SELECT id FROM learning_packs WHERE id = ?').bind(id).first()) throw notFound()
}

async function editablePack(db: D1Database, id: string) {
  const pack = await db.prepare('SELECT track FROM learning_packs WHERE id = ? AND archived_at IS NULL').bind(id).first<{ track: Track }>()
  if (!pack) throw notFound('بستۀ قابل ویرایش پیدا نشد.')
  return pack
}

export async function listPackQuestions(db: D1Database, packId: string, search: string, page: number) {
  await editablePack(db, packId)
  const { results } = await db.prepare(`WITH filter(search) AS (VALUES (?))
    SELECT id, content FROM learning_questions, filter WHERE pack_id = ? AND retired_at IS NULL
    AND (search = '' OR instr(COALESCE(json_extract(content, '$.prompt'), ''), search)
      OR instr(chapter, search) OR instr(json_extract(content, '$.key'), search))
    ORDER BY learning_questions.rowid LIMIT 31 OFFSET ?`).bind(search, packId, page * 30).all<{ id: string; content: string }>()
  return { questions: results.slice(0, 30).map((row) => ({ id: row.id, content: contentOf(row) })), hasMore: results.length > 30 }
}

export async function savePackQuestion(db: D1Database, packId: string, input: QuestionInput, previousId?: string) {
  const { track } = await editablePack(db, packId)
  if (!validSubjects(track, [input.subjectId])) throw invalidInput('درس با مسیر بسته سازگار نیست.')
  const id = crypto.randomUUID()
  const insert = db.prepare(`WITH input(id, subject, chapter, difficulty, content, pack_id, track, previous_id, key) AS (
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ) INSERT INTO learning_questions (id, pack_id, subject_id, chapter, difficulty, content)
    SELECT i.id, p.id, i.subject, i.chapter, i.difficulty, i.content FROM input i JOIN learning_packs p ON p.id = i.pack_id
    WHERE p.track = i.track AND p.archived_at IS NULL
    AND (i.previous_id IS NULL OR EXISTS (SELECT 1 FROM learning_questions WHERE id = i.previous_id AND pack_id = p.id AND retired_at IS NULL))
    AND NOT EXISTS (SELECT 1 FROM learning_questions q WHERE q.pack_id = p.id AND q.retired_at IS NULL
      AND q.id IS NOT i.previous_id AND json_extract(q.content, '$.key') = i.key)`)
    .bind(id, input.subjectId, input.chapter, input.difficulty, JSON.stringify(input), packId, track, previousId ?? null, input.key)

  // Existing answers, scores and notebooks keep the exact question they were based on.
  const [result] = await db.batch(previousId === undefined ? [insert] : [
    insert,
    db.prepare(`UPDATE learning_questions SET retired_at = ? WHERE id = ? AND pack_id = ?
      AND EXISTS (SELECT 1 FROM learning_questions WHERE id = ?)`).bind(Date.now(), previousId, packId, id),
  ])
  if (!result?.meta.changes) {
    await editablePack(db, packId)
    if (previousId !== undefined && !await db.prepare(
      'SELECT id FROM learning_questions WHERE id = ? AND pack_id = ? AND retired_at IS NULL',
    ).bind(previousId, packId).first()) throw notFound('این نسخه از سؤال دیگر قابل ویرایش نیست.')
    throw conflict('QUESTION_CHANGED', 'کلید سؤال تکراری است یا مسیر بسته تغییر کرده است.')
  }
  return { id }
}

export async function retirePackQuestion(db: D1Database, packId: string, id: string) {
  const result = await db.prepare(`UPDATE learning_questions SET retired_at = COALESCE(retired_at, ?)
    WHERE pack_id = ? AND id = ?`).bind(Date.now(), packId, id).run()
  if (!result.meta.changes) throw notFound()
}
