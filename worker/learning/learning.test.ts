/// <reference types="node" />
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
import { URL as NodeURL } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adminPacksSchema, adminQuestionsSchema, attemptResponseSchema, catalogResponseSchema, importPackSchema, practiceFilterSchema, type Attempt, type ImportPack, type PrepPack, type ScoreInput } from '../../src/shared/api/learning'
import { adminProductsResponseSchema, productsResponseSchema } from '../../src/shared/api/shop'
import { createWorkerApp } from '../app'
import type { WorkerBindings } from '../types'

// Execute real migration and service SQL, with a small D1 adapter around SQLite.
// This catches SQL errors and transaction/ownership bugs that mocked rows miss.
class TestStatement {
  values: (string | number | null)[] = []
  readonly sqlite: DatabaseSync
  readonly sql: string
  constructor(database: DatabaseSync, sql: string) { this.sqlite = database; this.sql = sql }
  bind(...values: (string | number | null)[]) { this.values = values; return this }
  async first() { return this.sqlite.prepare(this.sql).get(...this.values) ?? null }
  async all() { return { results: this.sqlite.prepare(this.sql).all(...this.values), success: true } }
  async run() { return { meta: { changes: this.sqlite.prepare(this.sql).run(...this.values).changes }, success: true } }
}
let sqlite: DatabaseSync
let bindings: WorkerBindings
const now = Date.UTC(2026, 10, 2, 10)
const app = createWorkerApp({ resolveSession: async (_bindings, headers) => headers.get('x-test-user') ? { user: { id: headers.get('x-test-user')! } } : null })
function request(path: string, options: { user?: string | null; method?: string; body?: unknown } = {}) {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (options.user !== null) headers.set('x-test-user', options.user ?? 'learner')
  return app.request(`/api${path}`, { method: options.method ?? 'GET', headers, ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}) }, bindings)
}
type TestPayload = { id: string; count: number; completed: number; correct: number; wrong: number; attempt: Attempt; attempts: Attempt[]; entries: unknown[]; packs: PrepPack[]; messages: unknown[]; topics: { questionIds: string[] }[]; available: boolean; scores: ScoreInput[] }
async function json(path: string, options: Parameters<typeof request>[1] = {}): Promise<TestPayload> {
  const response = await request(path, options)
  expect(response.status, JSON.stringify(await response.clone().json())).toBeLessThan(300)
  return response.json() as Promise<TestPayload>
}
const filter = (patch: object = {}) => practiceFilterSchema.parse({ track: 'konkur', includeSamples: true, ...patch })
async function start(patch: object = {}, user = 'learner'): Promise<Attempt> {
  return attemptResponseSchema.parse(await json('/learning/attempts', { method: 'POST', user, body: { ...filter(), id: crypto.randomUUID(), count: 5, mode: 'exam', ...patch } })).attempt
}
const correctFor = (id: string) => JSON.parse(String(sqlite.prepare('SELECT content FROM learning_questions WHERE id = ?').get(id)!.content)).correctIndex as number
const answer = (attempt: Attempt, qid: string, selectedIndex: number | null, user = 'learner') => json(`/learning/attempts/${attempt.id}/answers/${qid}`, { method: 'PUT', user, body: { selectedIndex } })
const finish = (attempt: Attempt, user = 'learner') => json(`/learning/attempts/${attempt.id}/finish`, { method: 'POST', user }).then((r) => attemptResponseSchema.parse(r).attempt)
const importFixture = (): ImportPack => importPackSchema.parse(JSON.parse(readFileSync(new NodeURL('../../public/examples/learning-pack.json', import.meta.url), 'utf8')))

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(now)
  sqlite = new DatabaseSync(':memory:')
  sqlite.exec('PRAGMA foreign_keys = ON')
  const migrations = new NodeURL('../../migrations/', import.meta.url)
  // Keep command/ownership fixtures small. The sourced-content suite applies
  // the complete migration chain and verifies the published library.
  for (const filename of readdirSync(migrations).filter((p) => p.endsWith('.sql') && !/^(0009|0010)_/.test(p)).sort()) sqlite.exec(readFileSync(new NodeURL(filename, migrations), 'utf8'))
  sqlite.exec("UPDATE learning_packs SET is_active = 0 WHERE id LIKE 'authored-statistics-%'")
  for (const [id, role] of [['learner', 'member'], ['other', 'member'], ['admin', 'admin']]) {
    sqlite.prepare('INSERT INTO user (id,name,email,createdAt,updatedAt,role) VALUES (?,?,?,?,?,?)').run(id!, id!, `${id}@example.test`, now, now, role!)
  }
  bindings = {
    APP_ENVIRONMENT: 'test', ASSETS: { fetch: async () => new Response('asset') } as unknown as Fetcher,
    DB: {
      prepare: (sql: string) => new TestStatement(sqlite, sql),
      batch: async (statements: TestStatement[]) => {
        sqlite.exec('BEGIN')
        try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec('COMMIT'); return results }
        catch (error) { sqlite.exec('ROLLBACK'); throw error }
      },
    } as unknown as D1Database,
  }
})
afterEach(() => { sqlite.close(); vi.restoreAllMocks() })

describe('learning content and publication', () => {
  it('manages a pack and revises questions without changing past answers', async () => {
    const { questions, ...pack } = importFixture()
    const draft = { ...pack, key: 'admin-crud', availableAt: new Date(now - 1000).toISOString(), isSample: false, isActive: true }
    const path = `/admin/learning/packs/${draft.key}`
    const admin = { user: 'admin' }
    expect((await request('/admin/learning/packs', { ...admin, method: 'POST', body: draft })).status).toBe(201)
    const question = questions[0]!
    expect((await request(`${path}/questions`, { method: 'POST', body: question })).status).toBe(403)
    const old = await json(`${path}/questions`, { ...admin, method: 'POST', body: question })
    const attempt = await start({ packIds: [draft.key], count: 1 })
    await answer(attempt, old.id, question.correctIndex)
    const revision = await json(`${path}/questions/${old.id}`, {
      ...admin, method: 'PUT', body: { ...question, correctIndex: (question.correctIndex + 1) % 4 },
    })
    expect((await finish(attempt)).result?.correct).toBe(1)
    const managed = adminQuestionsSchema.parse(await json(`${path}/questions`, admin))
    expect(managed.questions.map(({ id }) => id)).toEqual([revision.id])
    expect((await request(path, { ...admin, method: 'PUT', body: { ...draft, title: 'نسخۀ جدید' } })).status).toBe(200)
    expect((await request(path, { ...admin, method: 'DELETE' })).status).toBe(204)
    expect((await json('/learning/count', { method: 'POST', body: filter({ packIds: [draft.key] }) })).count).toBe(0)
    expect((await request(`${path}/restore`, { ...admin, method: 'POST' })).status).toBe(204)
    expect((await request(`${path}/questions/${revision.id}`, { ...admin, method: 'DELETE' })).status).toBe(204)
    expect((await json(`${path}/questions`, admin))).toMatchObject({ questions: [], hasMore: false })
  })
  it('requires a session and server-owned admin role', async () => {
    expect((await request('/learning/catalog?track=konkur', { user: null })).status).toBe(401)
    expect((await request('/admin/learning/import', { method: 'POST', body: { role: 'admin' } })).status).toBe(403)
  })
  it('excludes samples unless selected and serves validated catalog/topics', async () => {
    expect((await json('/learning/count', { method: 'POST', body: filter({ includeSamples: false }) })).count).toBe(0)
    expect((await json('/learning/count', { method: 'POST', body: filter() })).count).toBe(5)
    const catalog = catalogResponseSchema.parse(await json('/learning/catalog?track=konkur'))
    expect(catalog.packs[0]?.isSample).toBe(true)
    const topics = await json('/learning/topics?track=konkur&samples=true')
    expect(topics.topics[0]!.questionIds).toHaveLength(5)
    expect((await json('/learning/topics?track=konkur')).topics).toHaveLength(0)
  })
  it('imports transactionally and enforces release dates and archival', async () => {
    const pack = { ...importFixture(), key: 'weekly-maz', isSample: false, bank: 'weekly', provider: 'maz', availableAt: new Date(now + 86400000).toISOString() }
    expect((await request('/admin/learning/import', { user: 'admin', method: 'POST', body: pack })).status).toBe(201)
    expect((await json('/learning/count', { method: 'POST', body: filter({ includeSamples: false }) })).count).toBe(0)
    const catalog = adminPacksSchema.parse(await json('/admin/learning/packs?track=konkur', { user: 'admin' }))
    expect(catalog.packs.find((item) => item.id === pack.key)).toMatchObject({ questionCount: 5, availableAt: pack.availableAt })
    expect((await request('/admin/learning/import', { user: 'admin', method: 'POST', body: pack })).status).toBe(409)
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM learning_questions WHERE pack_id = ?').get(pack.key)?.count).toBe(5)
    expect((await request(`/admin/learning/packs/${pack.key}`, { user: 'admin', method: 'PATCH', body: { isActive: true, availableAt: new Date(now - 1000).toISOString() } })).status).toBe(204)
    expect((await json('/learning/count', { method: 'POST', body: filter({ includeSamples: false }) })).count).toBe(5)
    expect((await request(`/admin/learning/packs/${pack.key}`, { user: 'admin', method: 'PATCH', body: { isActive: false, availableAt: pack.availableAt } })).status).toBe(204)
    expect((await json('/learning/count', { method: 'POST', body: filter({ includeSamples: false }) })).count).toBe(0)
  })
  it('rejects invalid subjects, duplicate question keys, and forged fields', async () => {
    const pack = importFixture()
    pack.questions[0]!.subjectId = 'cardiology'
    expect((await request('/admin/learning/import', { user: 'admin', method: 'POST', body: pack })).status).toBe(400)
    pack.questions[0]!.subjectId = 'biology'
    pack.questions[1]!.key = pack.questions[0]!.key
    expect((await request('/admin/learning/import', { user: 'admin', method: 'POST', body: pack })).status).toBe(400)
    expect((await request('/learning/attempts', { method: 'POST', body: { ...filter(), id: crypto.randomUUID(), mode: 'exam', count: 5, subjectIds: ['cardiology'] } })).status).toBe(400)
  })
  it('agrees on grade and usable questions across the catalog, count, and attempt', async () => {
    sqlite.exec("UPDATE learning_packs SET is_active = 1 WHERE id LIKE 'authored-statistics-sci-%'")
    sqlite.exec(`UPDATE learning_questions SET content = json_set(content, '$.prompt', char(10,32))
      WHERE id IN ('statistics-sci-10-1', 'statistics-sci-10-2')`)
    sqlite.exec(`UPDATE learning_questions SET content = json_set(content, '$.images', json('["/question-media/scan.jpg"]'))
      WHERE id = 'statistics-sci-10-2'`)
    sqlite.exec(`UPDATE learning_questions SET content = json_set(content, '$.options[0]', ' ')
      WHERE id = 'statistics-sci-10-3'`)
    const input = filter({ includeSamples: false, grade: 'grade-10' })
    const catalog = catalogResponseSchema.parse(await json('/learning/catalog?track=konkur'))
    const pack = catalog.packs.find((p) => p.grade === 'grade-10')!
    expect(pack.questionCount).toBe(4)
    expect(catalog.chapters.filter((row) => row.packId === pack.id).reduce((sum, row) => sum + row.count, 0)).toBe(4)
    expect((await json('/learning/count', { method: 'POST', body: input })).count).toBe(4)
    const attempt = await start(input)
    expect(attempt.items).toHaveLength(4)
    expect(attempt.items.every((q) => q.grade === 'grade-10')).toBe(true)
    expect(attempt.items.find((q) => q.questionId === 'statistics-sci-10-2')?.images).toEqual(['/question-media/scan.jpg'])
  })
})

describe('admin shop catalog', () => {
  it('publishes edits and archives products without removing existing access', async () => {
    const product = {
      slug: 'daily-planner', kind: 'planner', title: 'پلنر تازه', summary: 'توضیح', description: '',
      priceToman: 1000, durationDays: null, isActive: true, position: 34, requiresDelivery: true,
    }
    expect((await request('/admin/products', { method: 'POST', body: product })).status).toBe(403)
    const admin = { user: 'admin' }
    const { id } = await json('/admin/products', { ...admin, method: 'POST', body: product })
    const memberCatalog = async () => productsResponseSchema.parse(await json('/shop/products')).products.find((item) => item.id === id)
    expect(await memberCatalog()).toMatchObject({ priceToman: 1000, requiresDelivery: true })
    expect((await request(`/admin/products/${id}`, { ...admin, method: 'PUT', body: { ...product, priceToman: 2000 } })).status).toBe(200)
    expect(await memberCatalog()).toMatchObject({ priceToman: 2000 })
    sqlite.prepare('INSERT INTO entitlements (user_id, product_id, granted_at) VALUES (?, ?, ?)').run('learner', id, now)
    expect((await request(`/admin/products/${id}`, { ...admin, method: 'DELETE' })).status).toBe(204)
    expect(await memberCatalog()).toBeUndefined()
    expect(sqlite.prepare('SELECT product_id FROM entitlements WHERE product_id = ?').get(id)?.product_id).toBe(id)
    const managed = adminProductsResponseSchema.parse(await json('/admin/products', admin)).products.find((item) => item.id === id)
    expect(managed).toMatchObject({ position: 34, isActive: false, archivedAt: expect.any(String) })
    expect((await request(`/admin/products/${id}/restore`, { ...admin, method: 'POST' })).status).toBe(204)
    expect(await memberCatalog()).toBeUndefined()
  })
})

describe('exam integrity, recovery and review', () => {
  it('hides all answers during exam, grades on the server, and finishes idempotently', async () => {
    const attempt = await start()
    expect(attempt.items).toHaveLength(5)
    expect(attempt.items.every((q) => q.feedback === null)).toBe(true)
    expect(JSON.stringify(attempt)).not.toContain('correctIndex')
    const [a, b] = attempt.items
    const response = await answer(attempt, a!.questionId, correctFor(a!.questionId))
    expect(response.attempt.items.every((q: { feedback: unknown }) => q.feedback === null)).toBe(true)
    await answer(attempt, b!.questionId, (correctFor(b!.questionId) + 1) % 4)
    const result = await finish(attempt)
    expect(result.result).toEqual({ correct: 1, wrong: 1, skipped: 3, percent: 13.33 })
    expect(result.items.every((q) => q.feedback !== null)).toBe(true)
    await finish(attempt)
    expect(sqlite.prepare('SELECT SUM(repetitions) AS count FROM learning_reviews').get()?.count).toBe(5)
    expect((await request(`/learning/attempts/${attempt.id}/answers/${a!.questionId}`, { method: 'PUT', body: { selectedIndex: 0 } })).status).toBe(409)
  })
  it('recovers persisted answers, allows exam changes, locks educational answers', async () => {
    const practice = await start({ mode: 'practice', count: 1 })
    const q = practice.items[0]!
    const response = await answer(practice, q.questionId, correctFor(q.questionId))
    expect(response.attempt.items[0]!.feedback!.correctIndex).toBe(correctFor(q.questionId))
    expect((await request(`/learning/attempts/${practice.id}/answers/${q.questionId}`, { method: 'PUT', body: { selectedIndex: 0 } })).status).toBe(409)
    const exam = await start({ count: 1 })
    const e = exam.items[0]!
    await answer(exam, e.questionId, 1)
    await answer(exam, e.questionId, 2)
    expect((await json(`/learning/attempts/${exam.id}`)).attempt.items[0]!.selectedIndex).toBe(2)
    expect((await json('/learning/attempts?track=konkur')).attempts).toHaveLength(2)
  })
  it('does not let another user load, answer, finish, or recover an attempt by id', async () => {
    const attempt = await start()
    for (const [path, method, body] of [
      [`/learning/attempts/${attempt.id}`, 'GET', undefined],
      [`/learning/attempts/${attempt.id}/finish`, 'POST', {}],
      [`/learning/attempts/${attempt.id}/answers/${attempt.items[0]!.questionId}`, 'PUT', { selectedIndex: 0 }],
      ['/learning/attempts', 'POST', { ...filter(), id: attempt.id, count: 5, mode: 'exam' }],
    ] as const) expect((await request(path, { user: 'other', method, body })).status).toBe(404)
  })
  it('supports exact question, chapter, bank, source, difficulty and year filters', async () => {
    const pack = { ...importFixture(), key: 'official-example', bank: 'national', provider: 'konkur', year: 1400, period: 'تیر', isSample: false }
    await json('/admin/learning/import', { user: 'admin', method: 'POST', body: pack })
    expect((await json('/learning/count', { method: 'POST', body: filter({ bank: 'national', provider: 'konkur', year: 1400, period: 'تیر', chapters: ['سلول و اندامک‌ها'], difficulty: 'medium' }) })).count).toBe(2)
    expect((await json('/learning/count', { method: 'POST', body: filter({ year: 1401 }) })).count).toBe(0)
    const attempt = await start({ questionIds: ['sample-konkur-cells-1'], count: 10 })
    expect(attempt.items.map((q) => q.questionId)).toEqual(['sample-konkur-cells-1'])
  })
  it('schedules spaced review, doubles correct intervals, and resets mistakes', async () => {
    const qid = 'sample-konkur-cells-1'
    let attempt = await start({ questionIds: [qid] })
    await answer(attempt, qid, correctFor(qid)); await finish(attempt)
    expect((await json('/learning/count', { method: 'POST', body: filter({ pool: 'due' }) })).count).toBe(0)
    vi.mocked(Date.now).mockReturnValue(now + 86400000 + 1)
    expect((await json('/learning/count', { method: 'POST', body: filter({ pool: 'due' }) })).count).toBe(1)
    attempt = await start({ questionIds: [qid], pool: 'due' })
    await answer(attempt, qid, correctFor(qid)); await finish(attempt)
    expect(sqlite.prepare('SELECT interval_days FROM learning_reviews WHERE question_id = ?').get(qid)?.interval_days).toBe(2)
    vi.mocked(Date.now).mockReturnValue(now + 4 * 86400000)
    attempt = await start({ questionIds: [qid], pool: 'due' })
    await answer(attempt, qid, (correctFor(qid) + 1) % 4); const result = await finish(attempt)
    expect(sqlite.prepare('SELECT interval_days FROM learning_reviews WHERE question_id = ?').get(qid)?.interval_days).toBe(1)
    expect(result.items[0]?.feedback?.stats).toEqual({ correct: 0, wrong: 1, skipped: 0 })
    expect((await json('/learning/count', { method: 'POST', body: filter({ pool: 'wrong' }) })).count).toBe(1)
    const summary = await json('/learning/summary?track=konkur')
    expect(summary.completed).toBe(3); expect(summary.correct).toBe(2); expect(summary.wrong).toBe(1)
  })
})

describe('personal content, scores and preparation', () => {
  it('persists notes, validated highlights and bookmarks privately', async () => {
    const qid = 'sample-konkur-cells-1'
    const input = { saved: true, note: 'مرور ترجمه', highlight: 'ریبوزوم' }
    expect((await request(`/learning/notebook/${qid}`, { method: 'PUT', body: input })).status).toBe(204)
    expect((await json('/learning/notebook?track=konkur')).entries[0]).toMatchObject(input)
    expect((await json('/learning/notebook?track=konkur', { user: 'other' })).entries).toHaveLength(0)
    expect((await request(`/learning/notebook/${qid}`, { method: 'PUT', body: { ...input, highlight: 'متن ساختگی' } })).status).toBe(400)
    expect((await json('/learning/count', { method: 'POST', body: filter({ pool: 'saved' }) })).count).toBe(1)
  })
  it('owns score records and rejects invalid dates', async () => {
    const input = { provider: 'maz', title: 'آزمون آبان', date: '2026-11-02', score: 6100, notes: 'زیست ۶۰٪' }
    const { id } = await json('/learning/scores', { method: 'POST', body: input })
    expect((await json('/learning/scores')).scores[0]).toMatchObject(input)
    expect((await request(`/learning/scores/${id}`, { user: 'other', method: 'DELETE' })).status).toBe(404)
    expect((await request('/learning/scores', { method: 'POST', body: { ...input, date: '2026-02-30' } })).status).toBe(400)
    expect((await request(`/learning/scores/${id}`, { method: 'DELETE' })).status).toBe(204)
  })
  it('creates and persists a provider-specific preparation checklist', async () => {
    const input = { track: 'konkur', provider: 'gaj', title: 'آمادگی گاج', targetDate: '2026-11-09', subjectIds: ['biology', 'chemistry'] }
    const { id } = await json('/learning/prep', { method: 'POST', body: input })
    let pack = (await json('/learning/prep')).packs[0]!
    expect(pack.steps).toHaveLength(8)
    expect((await request(`/learning/prep/${id}`, { method: 'PATCH', body: { stepId: pack.steps[0]!.id, done: true } })).status).toBe(204)
    pack = (await json('/learning/prep')).packs[0]!
    expect(pack.steps[0]!.done).toBe(true)
    expect((await request(`/learning/prep/${id}`, { user: 'other', method: 'PATCH', body: { stepId: pack.steps[0]!.id, done: false } })).status).toBe(404)
    expect((await request(`/learning/prep/${id}`, { user: 'other', method: 'DELETE' })).status).toBe(404)
  })
})

describe('real assistant boundary', () => {
  it('reports an unconfigured provider without fabricating a reply', async () => {
    expect((await json('/learning/assistant')).available).toBe(false)
    expect((await request('/learning/assistant', { method: 'POST', body: { mode: 'ask', message: 'توضیح بده' } })).status).toBe(503)
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM learning_messages').get()?.count).toBe(0)
  })
  it('passes owned results to AI, persists messages, and refuses other users results', async () => {
    const run = vi.fn(async () => ({ response: 'ابتدا پاسخ‌های غلط را مرور کن.' }))
    bindings.AI = { run } as unknown as Ai
    const attempt = await start(); await finish(attempt)
    const response = await json('/learning/assistant', { method: 'POST', body: { mode: 'analysis', attemptId: attempt.id, message: 'تحلیل کن' } })
    expect(response.messages).toHaveLength(2)
    const calls = run.mock.calls as unknown as [string, { messages: { role: string; content: string }[] }][]
    expect(JSON.parse(calls[0]![1].messages.at(-1)!.content).context[0].exam.result).toEqual({ correct: 0, wrong: 0, skipped: 5, percent: 0 })
    expect((await json('/learning/assistant', { user: 'other' })).messages).toHaveLength(0)
    expect((await request('/learning/assistant', { user: 'other', method: 'POST', body: { mode: 'analysis', attemptId: attempt.id, message: 'تحلیل کن' } })).status).toBe(404)
    expect(run).toHaveBeenCalledTimes(1)
  })
  it('does not send answers from unfinished exams to AI and enforces the hourly cap', async () => {
    const run = vi.fn(async () => ({ response: 'توضیح' })); bindings.AI = { run } as unknown as Ai
    const attempt = await start()
    expect((await request('/learning/assistant', { method: 'POST', body: { mode: 'ask', questionId: attempt.items[0]!.questionId, message: 'جواب؟' } })).status).toBe(409)
    expect((await request('/learning/assistant', { method: 'POST', body: { mode: 'analysis', attemptId: attempt.id, message: 'تحلیل' } })).status).toBe(409)
    sqlite.prepare('INSERT INTO learning_ai_usage (user_id,hour,requests) VALUES (?,?,?)').run('learner', Math.floor(now / 3600000), 20)
    expect((await request('/learning/assistant', { method: 'POST', body: { mode: 'ask', message: 'توضیح' } })).status).toBe(429)
    expect(run).not.toHaveBeenCalled()
  })
})
