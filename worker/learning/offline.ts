import type { OfflinePackPage } from '../../src/shared/api/offline-learning'
import type { Track } from '../../src/shared/api/learning'
import { notFound } from '../http/errors'
import { contentOf, usableQuestion, visibility } from './content'

const pageSize = 24

type PackQuestionRow = {
  packId: string
  title: string
  track: Track
  isSample: number
  attribution: string
  questionId: string | null
  subjectId: string
  chapter: string
  content: string
}

export async function offlinePackPage(db: D1Database, id: string, cursor = ''): Promise<OfflinePackPage> {
  const { results } = await db.prepare(`
    SELECT p.id AS packId, p.title, p.track, p.is_sample AS isSample, p.attribution,
      q.id AS questionId, q.subject_id AS subjectId, q.chapter, q.content
    FROM learning_packs p
    LEFT JOIN learning_questions q ON q.pack_id = p.id AND q.id > ? AND ${usableQuestion}
    WHERE p.id = ? AND ${visibility}
    ORDER BY q.id LIMIT ?`)
    .bind(cursor, id, Date.now(), pageSize + 1)
    .all<PackQuestionRow>()
  const row = results[0]
  if (!row) throw notFound()

  const questions = results.slice(0, pageSize).flatMap(({ questionId, subjectId, chapter, content }) => {
    if (!questionId) return []
    const question = contentOf({ content })
    // Lessons are already available before an online attempt. Answer keys,
    // feedback, and all user data stay out of the downloaded material.
    return [{
      questionId, subjectId, chapter,
      prompt: question.prompt ?? '',
      options: question.options,
      images: question.images ?? [],
      language: question.language ?? 'fa',
      source: question.source ?? null,
      topic: question.topic ?? null,
    }]
  })
  return {
    pack: { id: row.packId, title: row.title, track: row.track, isSample: Boolean(row.isSample), attribution: row.attribution },
    questions,
    next: results.length > pageSize ? questions.at(-1)!.questionId : null,
  }
}
