import { importPackSchema, type ImportPack, type LearningGrade, type PracticeFilter, type QuestionInput, type Track } from '../../src/shared/api/learning'
import { validSubjects } from '../../src/shared/lib/learning-catalog'
import { conflict, invalidInput, notFound } from '../http/errors'

export type QuestionRow = { id: string; content: string; subjectId: string; chapter: string; difficulty: 'easy' | 'medium' | 'hard'; packTitle: string; isSample: number; grade: LearningGrade | null }
export const questionColumns = `q.id, q.content, q.subject_id AS subjectId, q.chapter, q.difficulty, p.title AS packTitle, p.is_sample AS isSample, p.grade`
export const contentOf = (row: { content: string }): QuestionInput => JSON.parse(row.content) as QuestionInput
export const visibility = 'p.is_active = 1 AND p.available_at <= ?'
// Legacy question rows can contain an empty stem or answer choices. Keep
// existing attempts intact and apply the same eligibility rule to new practice.
export const usableQuestion = `((
  json_type(q.content, '$.prompt') = 'text' AND length(trim(json_extract(q.content, '$.prompt'), char(9,10,13,32))) > 0
  OR json_array_length(q.content, '$.images') > 0
) AND json_array_length(q.content, '$.options') = 4
AND NOT EXISTS (
  SELECT 1 FROM json_each(q.content, '$.options') AS opt
  WHERE opt.type != 'text' OR length(trim(opt.value, char(9,10,13,32))) = 0
))`

export function questionFilter(input: PracticeFilter, user: string, now = Date.now()) {
  const clauses = [visibility, 'p.track = ?', usableQuestion]
  const values: (string | number)[] = [now, input.track]
  if (!input.includeSamples) clauses.push('p.is_sample = 0')
  for (const [column, value] of [['p.bank', input.bank], ['p.provider', input.provider], ['p.grade', input.grade], ['p.year', input.year], ['p.period', input.period], ['q.difficulty', input.difficulty]] as const) {
    if (value !== undefined) { clauses.push(`${column} = ?`); values.push(value) }
  }
  for (const [column, list] of [['p.id', input.packIds], ['q.id', input.questionIds], ['q.subject_id', input.subjectIds], ['q.chapter', input.chapters]] as const) {
    if (list.length) { clauses.push(`${column} IN (SELECT value FROM json_each(?))`); values.push(JSON.stringify(list)) }
  }
  if (input.pool === 'saved') {
    clauses.push('EXISTS (SELECT 1 FROM learning_annotations n WHERE n.question_id = q.id AND n.user_id = ? AND n.saved = 1)')
    values.push(user)
  }
  if (input.pool === 'due') {
    clauses.push('EXISTS (SELECT 1 FROM learning_reviews r WHERE r.question_id = q.id AND r.user_id = ? AND r.due_at <= ?)')
    values.push(user, now)
  }
  if (input.pool === 'wrong') {
    clauses.push(`(SELECT a.selected_index FROM learning_answers a JOIN learning_attempts t ON t.id = a.attempt_id
      WHERE a.question_id = q.id AND t.user_id = ? AND t.finished_at IS NOT NULL
      ORDER BY t.finished_at DESC, t.rowid DESC LIMIT 1) != json_extract(q.content, '$.correctIndex')`)
    values.push(user)
  }
  return { sql: clauses.join(' AND '), values }
}

export async function getCatalog(db: D1Database, track: Track, admin = false) {
  const conditions = admin ? 'p.track = ?' : `p.track = ? AND ${visibility}`
  const values = admin ? [track] : [track, Date.now()]
  const [packs, chapters] = await Promise.all([
    db.prepare(`SELECT p.*, COUNT(q.id) AS questionCount, MIN(json_extract(q.content, '$.source.url')) AS sourceUrl,
      COALESCE(MIN(json_extract(q.content, '$.language')), 'fa') AS language FROM learning_packs p
      LEFT JOIN learning_questions q ON q.pack_id = p.id AND ${usableQuestion} WHERE ${conditions}
      GROUP BY p.id ${admin ? '' : 'HAVING COUNT(q.id) > 0'} ORDER BY p.available_at DESC, p.id`).bind(...values).all<{
        id: string; title: string; track: Track; bank: string; provider: string; grade: LearningGrade | null; year: number | null; period: string;
        available_at: number; is_sample: number; attribution: string; is_active: number; questionCount: number; sourceUrl: string | null; language: string;
      }>(),
    db.prepare(`SELECT p.id AS packId, p.track, q.subject_id AS subjectId, q.chapter, q.difficulty, COUNT(*) AS count FROM learning_questions q
      JOIN learning_packs p ON p.id = q.pack_id WHERE ${conditions} AND ${usableQuestion}
      GROUP BY p.id, p.track, q.subject_id, q.chapter, q.difficulty ORDER BY q.chapter`)
      .bind(...values).all(),
  ])
  return {
    packs: packs.results.map((p) => ({ id: p.id, key: p.id, title: p.title, track: p.track, bank: p.bank, provider: p.provider,
      grade: p.grade, year: p.year, period: p.period, availableAt: new Date(p.available_at).toISOString(), isSample: Boolean(p.is_sample),
      attribution: p.attribution, isActive: Boolean(p.is_active), questionCount: p.questionCount, sourceUrl: p.sourceUrl, language: p.language })),
    chapters: chapters.results,
  }
}

export async function importPack(db: D1Database, input: ImportPack) {
  importPackSchema.parse(input)
  if (!validSubjects(input.track, input.questions.map((q) => q.subjectId))) throw invalidInput('درس سؤال با مسیر تحصیلی سازگار نیست.')
  const existing = await db.prepare('SELECT id FROM learning_packs WHERE id = ?').bind(input.key).first()
  if (existing) throw conflict('PACK_EXISTS', 'این کلید قبلاً وارد شده است؛ برای نسخهٔ جدید کلید دیگری انتخاب کنید.')
  const grade = input.grade ?? (input.track.startsWith('konkur') && input.provider === 'konkur' && input.bank === 'national' ? 'konkur' : null)
  try {
    await db.batch([
      db.prepare(`INSERT INTO learning_packs (id,title,track,bank,provider,grade,year,period,available_at,is_sample,attribution,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(input.key, input.title, input.track, input.bank, input.provider, grade, input.year,
          input.period, Date.parse(input.availableAt), Number(input.isSample), input.attribution, Date.now()),
      db.prepare(`INSERT INTO learning_questions (id,pack_id,subject_id,chapter,difficulty,content)
        SELECT json_extract(value, '$.id'), ?, json_extract(value, '$.subjectId'), json_extract(value, '$.chapter'),
          json_extract(value, '$.difficulty'), json_extract(value, '$.content') FROM json_each(?)`)
        .bind(input.key, JSON.stringify(input.questions.map((q) => ({ id: crypto.randomUUID(), subjectId: q.subjectId, chapter: q.chapter, difficulty: q.difficulty, content: JSON.stringify(q) })))),
    ])
  } catch (error) {
    if (String(error).includes('UNIQUE')) throw conflict('PACK_EXISTS', 'این کلید قبلاً وارد شده است.')
    throw error
  }
  return { id: input.key }
}

export async function availableQuestion(db: D1Database, id: string) {
  const row = await db.prepare(`SELECT ${questionColumns} FROM learning_questions q JOIN learning_packs p ON p.id = q.pack_id
    WHERE q.id = ? AND ${visibility} AND ${usableQuestion}`).bind(id, Date.now()).first<QuestionRow>()
  if (!row) throw notFound()
  return row
}

export async function listTopics(db: D1Database, track: Track, samples: boolean, page: number, subjectId?: string) {
  const values: (string | number)[] = [track, Date.now()]
  if (subjectId) values.push(subjectId)
  const rows = await db.prepare(`SELECT MIN(q.id) AS id, MIN(q.content) AS content, q.subject_id AS subjectId,
    q.chapter, p.track, p.is_sample AS isSample, json_group_array(q.id) AS ids
    FROM learning_questions q JOIN learning_packs p ON p.id = q.pack_id
    WHERE p.track = ? AND ${visibility} ${samples ? '' : 'AND p.is_sample = 0'} ${subjectId ? 'AND q.subject_id = ?' : ''}
    AND ${usableQuestion} AND json_extract(q.content, '$.topic') IS NOT NULL
    GROUP BY q.subject_id, q.chapter, p.track, p.is_sample, json_extract(q.content, '$.topic.title')
    ORDER BY q.subject_id, q.chapter, id LIMIT 25 OFFSET ?`).bind(...values, page * 24).all<{
      id: string; content: string; subjectId: string; chapter: string; track: Track; isSample: number; ids: string;
    }>()
  return { hasMore: rows.results.length > 24, topics: rows.results.slice(0, 24).map((row) => ({
    ...contentOf(row).topic!, id: row.id, subjectId: row.subjectId, chapter: row.chapter, track: row.track,
    isSample: Boolean(row.isSample), questionIds: (JSON.parse(row.ids) as string[]).slice(0, 5),
  })) }
}
