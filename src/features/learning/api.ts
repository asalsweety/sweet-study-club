import { z } from 'zod'
import {
  adminPacksSchema, adminQuestionsSchema, assistantMessagesSchema, attemptHistorySchema, attemptResponseSchema, catalogResponseSchema, learningSummarySchema,
  notebookSchema, prepPacksSchema, scoresResponseSchema, topicsResponseSchema,
  type AssistantInput, type ImportPack, type PackMetadataInput, type PracticeFilter, type PrepInput, type QuestionInput, type ScoreInput, type StartAttempt, type Track,
} from '../../shared/api/learning'
import { del, get, http, post, put } from '../../shared/api/http'

const idSchema = z.object({ id: z.string() })
const query = (values: Record<string, string>) => `?${new URLSearchParams(values)}`
const path = (id: string) => encodeURIComponent(id)
export const learningApi = {
  catalog: (track: Track) => get(`/api/learning/catalog${query({ track })}`, catalogResponseSchema),
  count: (filter: PracticeFilter) => post('/api/learning/count', z.object({ count: z.number().int() }), filter),
  topics: (track: Track, samples: boolean, page: number, subjectId = '') => get(`/api/learning/topics${query({ track, samples: String(samples), page: String(page), ...(subjectId ? { subjectId } : {}) })}`, topicsResponseSchema),
  start: (input: StartAttempt) => post('/api/learning/attempts', attemptResponseSchema, input).then((r) => r.attempt),
  attempt: (id: string) => get(`/api/learning/attempts/${path(id)}`, attemptResponseSchema).then((r) => r.attempt),
  answer: (id: string, questionId: string, selectedIndex: number | null) => put(`/api/learning/attempts/${path(id)}/answers/${path(questionId)}`, attemptResponseSchema, { selectedIndex }).then((r) => r.attempt),
  finish: (id: string) => post(`/api/learning/attempts/${path(id)}/finish`, attemptResponseSchema).then((r) => r.attempt),
  history: (track: Track) => get(`/api/learning/attempts${query({ track })}`, attemptHistorySchema).then((r) => r.attempts),
  summary: (track: Track) => get(`/api/learning/summary${query({ track })}`, learningSummarySchema),
  notebook: (track: Track) => get(`/api/learning/notebook${query({ track })}`, notebookSchema).then((r) => r.entries),
  annotate: (id: string, input: { saved: boolean; note: string; highlight: string }) => http('PUT', `/api/learning/notebook/${path(id)}`, null, input),
  scores: () => get('/api/learning/scores', scoresResponseSchema).then((r) => r.scores),
  saveScore: (input: ScoreInput) => post('/api/learning/scores', idSchema, input),
  deleteScore: (id: string) => del(`/api/learning/scores/${path(id)}`, null),
  prep: () => get('/api/learning/prep', prepPacksSchema).then((r) => r.packs),
  createPrep: (input: PrepInput) => post('/api/learning/prep', idSchema, input),
  togglePrep: (id: string, stepId: string, done: boolean) => http('PATCH', `/api/learning/prep/${path(id)}`, null, { stepId, done }),
  deletePrep: (id: string) => del(`/api/learning/prep/${path(id)}`, null),
  messages: () => get('/api/learning/assistant', assistantMessagesSchema),
  ask: (input: AssistantInput) => post('/api/learning/assistant', assistantMessagesSchema, input),
  admin: {
    packs: (track: Track) => get(`/api/admin/learning/packs${query({ track })}`, adminPacksSchema),
    import: (input: ImportPack) => post('/api/admin/learning/import', idSchema, input),
    savePack: (id: string | null, input: PackMetadataInput) => id
      ? put(`/api/admin/learning/packs/${path(id)}`, idSchema, input)
      : post('/api/admin/learning/packs', idSchema, input),
    archivePack: (id: string) => del(`/api/admin/learning/packs/${path(id)}`, null),
    restorePack: (id: string) => post(`/api/admin/learning/packs/${path(id)}/restore`, null),
    questions: (pack: string, q: string, page: number) =>
      get(`/api/admin/learning/packs/${path(pack)}/questions${query({ q, page: String(page) })}`, adminQuestionsSchema),
    saveQuestion: (pack: string, id: string | null, input: QuestionInput) => id
      ? put(`/api/admin/learning/packs/${path(pack)}/questions/${path(id)}`, idSchema, input)
      : post(`/api/admin/learning/packs/${path(pack)}/questions`, idSchema, input),
    removeQuestion: (pack: string, id: string) => del(`/api/admin/learning/packs/${path(pack)}/questions/${path(id)}`, null),
  },
}
