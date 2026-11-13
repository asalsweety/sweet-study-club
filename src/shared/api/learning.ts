import { z } from 'zod'

export const trackSchema = z.enum(['preinternship', 'residency', 'medical-basics', 'dental-basics', 'bachelor-medicine', 'konkur'])
export const providerSchema = z.enum(['national', 'authored', 'konkur', 'maz', 'ghalamchi', 'gaj', 'konkuri-nerd', 'medmcqa', 'openstax', 'other'])
export const bankSchema = z.enum(['national', 'authored', 'weekly', 'reference'])
export const difficultySchema = z.enum(['easy', 'medium', 'hard'])
const identifier = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/)
const text = (max: number) => z.string().trim().min(1).max(max)
export const questionSourceSchema = z.object({
  name: text(160), url: z.url().refine((url) => /^https:\/\//.test(url)), license: text(100),
  questionId: text(160), revision: text(100),
})
const questionImagesSchema = z.array(z.string().regex(/^\/question-media\/[a-zA-Z0-9_-]+\.(?:jpg|png|webp)$/)).max(4).default([])
export const topicSchema = z.object({
  title: text(200),
  important: z.array(text(500)).max(20),
  microLesson: z.string().trim().max(12000),
  branches: z.array(z.object({ title: text(150), points: z.array(text(500)).min(1).max(15) })).min(1).max(12),
})
export const questionInputSchema = z.object({
  key: identifier,
  subjectId: identifier,
  chapter: text(160),
  prompt: text(6000),
  options: z.array(text(2000)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: text(12000),
  difficulty: difficultySchema,
  topic: topicSchema.nullable(),
  language: z.enum(['fa', 'en']).default('fa'),
  images: questionImagesSchema,
  source: questionSourceSchema.nullable().default(null),
}).strict()
const packInputObject = z.object({
  key: identifier,
  title: text(200),
  track: trackSchema,
  bank: bankSchema,
  provider: providerSchema,
  year: z.number().int().min(1300).max(1600).nullable(),
  period: z.string().trim().max(100),
  availableAt: z.iso.datetime(),
  isSample: z.boolean(),
  attribution: text(500),
  questions: z.array(questionInputSchema).min(1).max(200),
}).strict()
export const importPackSchema = packInputObject.superRefine((pack, ctx) => {
  if (new Set(pack.questions.map((q) => q.key)).size !== pack.questions.length) ctx.addIssue({ code: 'custom', message: 'کلید سؤال‌ها باید یکتا باشد.', path: ['questions'] })
  if (pack.bank === 'national' && !['national', 'konkur'].includes(pack.provider)) ctx.addIssue({ code: 'custom', message: 'منبع بانک کشوری باید آزمون رسمی باشد.', path: ['provider'] })
  if (pack.bank === 'authored' && pack.provider !== 'authored') ctx.addIssue({ code: 'custom', message: 'منبع سؤال تألیفی را تألیفی انتخاب کنید.', path: ['provider'] })
})
export type ImportPack = z.infer<typeof importPackSchema>
export type QuestionInput = z.infer<typeof questionInputSchema>
export type Track = z.infer<typeof trackSchema>
export type Provider = z.infer<typeof providerSchema>

export const packSchema = packInputObject.omit({ questions: true }).extend({
  id: z.string(), questionCount: z.number().int(), isActive: z.boolean(),
  language: z.enum(['fa', 'en']).default('fa'), sourceUrl: z.url().nullable().default(null),
})
export type LearningPack = z.infer<typeof packSchema>
export const catalogResponseSchema = z.object({
  packs: z.array(packSchema),
  chapters: z.array(z.object({ packId: z.string(), track: trackSchema, subjectId: z.string(), chapter: z.string(), count: z.number().int() })),
})
export const practiceFilterSchema = z.object({
  track: trackSchema,
  bank: bankSchema.optional(),
  provider: providerSchema.optional(),
  packIds: z.array(identifier).max(20).default([]),
  questionIds: z.array(identifier).max(100).default([]),
  subjectIds: z.array(identifier).max(50).default([]),
  chapters: z.array(text(160)).max(100).default([]),
  year: z.number().int().min(1300).max(1600).optional(),
  period: z.string().max(100).optional(),
  difficulty: difficultySchema.optional(),
  pool: z.enum(['all', 'saved', 'wrong', 'due']).default('all'),
  includeSamples: z.boolean().default(false),
})
export const startAttemptSchema = practiceFilterSchema.extend({
  id: z.uuid(), mode: z.enum(['practice', 'exam']), count: z.number().int().min(1).max(100),
})
export type PracticeFilter = z.infer<typeof practiceFilterSchema>
export type StartAttempt = z.infer<typeof startAttemptSchema>
export const answerInputSchema = z.object({ selectedIndex: z.number().int().min(0).max(3).nullable() }).strict()
export const statsSchema = z.object({ correct: z.number().int(), wrong: z.number().int(), skipped: z.number().int() })
export const feedbackSchema = z.object({
  correctIndex: z.number().int().min(0).max(3), explanation: z.string(),
  topic: topicSchema.nullable(), stats: statsSchema,
})
export const attemptItemSchema = z.object({
  questionId: z.string(), ordinal: z.number().int(), prompt: z.string(), options: z.array(z.string()).length(4),
  subjectId: z.string(), chapter: z.string(), difficulty: difficultySchema,
  packTitle: z.string(), isSample: z.boolean(),
  language: z.enum(['fa', 'en']).default('fa'), source: questionSourceSchema.nullable().default(null),
  images: questionImagesSchema,
  selectedIndex: z.number().int().nullable(), answered: z.boolean(),
  feedback: feedbackSchema.nullable(),
})
export type AttemptItem = z.infer<typeof attemptItemSchema>
export const attemptSchema = z.object({
  id: z.string(), track: trackSchema, mode: z.enum(['practice', 'exam']), startedAt: z.number(), finishedAt: z.number().nullable(),
  items: z.array(attemptItemSchema),
  result: statsSchema.extend({ percent: z.number() }).nullable(),
})
export type Attempt = z.infer<typeof attemptSchema>
export const attemptResponseSchema = z.object({ attempt: attemptSchema })
export const attemptHistorySchema = z.object({ attempts: z.array(attemptSchema.omit({ items: true }).extend({ count: z.number().int() })) })

export const annotationInputSchema = z.object({
  saved: z.boolean(), note: z.string().trim().max(5000), highlight: z.string().trim().max(2000),
}).strict()
export const notebookSchema = z.object({ entries: z.array(annotationInputSchema.extend({
  questionId: z.string(), prompt: z.string(), track: trackSchema, subjectId: z.string(), chapter: z.string(), updatedAt: z.number(),
})) })
export const topicsResponseSchema = z.object({ hasMore: z.boolean(), topics: z.array(topicSchema.extend({
  id: z.string(), subjectId: z.string(), chapter: z.string(), track: trackSchema,
  questionIds: z.array(z.string()), isSample: z.boolean(),
})) })
export const learningSummarySchema = z.object({
  completed: z.number().int(), correct: z.number().int(), wrong: z.number().int(), skipped: z.number().int(),
  due: z.number().int(), saved: z.number().int(),
  subjects: z.array(z.object({ subjectId: z.string(), correct: z.number().int(), wrong: z.number().int(), skipped: z.number().int() })),
})
const realDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v)
export const scoreInputSchema = z.object({
  provider: providerSchema, title: text(200), date: realDate,
  score: z.number().min(0).max(20000), notes: z.string().trim().max(5000),
}).strict()
export type ScoreInput = z.infer<typeof scoreInputSchema>
export const scoresResponseSchema = z.object({ scores: z.array(scoreInputSchema.extend({ id: z.string() })) })
export const prepInputSchema = z.object({
  track: trackSchema, title: text(160), provider: providerSchema, targetDate: realDate,
  subjectIds: z.array(identifier).min(1).max(50).refine((ids) => new Set(ids).size === ids.length),
}).strict()
export type PrepInput = z.infer<typeof prepInputSchema>
export const prepStepSchema = z.object({ id: z.string(), subjectId: z.string(), kind: z.enum(['learn', 'practice', 'review', 'mock']), done: z.boolean() })
export const prepPacksSchema = z.object({ packs: z.array(prepInputSchema.extend({ id: z.string(), steps: z.array(prepStepSchema) })) })
export type PrepPack = z.infer<typeof prepPacksSchema>['packs'][number]
export const assistantInputSchema = z.object({
  message: text(3000), mode: z.enum(['ask', 'analysis']),
  attemptId: z.uuid().optional(), questionId: identifier.optional(), scoreId: z.uuid().optional(),
}).strict()
export type AssistantInput = z.infer<typeof assistantInputSchema>
export const assistantMessagesSchema = z.object({
  available: z.boolean(), messages: z.array(z.object({ id: z.string(), role: z.enum(['user', 'assistant']), content: z.string(), createdAt: z.number() })),
})
