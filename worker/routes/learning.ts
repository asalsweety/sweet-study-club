import { Hono, type MiddlewareHandler } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { z } from 'zod'
import { annotationInputSchema, answerInputSchema, assistantInputSchema, importPackSchema, packMetadataInputSchema, prepInputSchema, questionInputSchema, scoreInputSchema, startAttemptSchema, trackSchema } from '../../src/shared/api/learning'
import { readBody, readQuery, requireAdmin, userId } from '../http/validation'
import { notFound } from '../http/errors'
import { answerQuestion, attemptHistory, finishAttempt, loadAttempt, startAttempt } from '../learning/attempts'
import { getCatalog, importPack, listTopics, questionFilter } from '../learning/content'
import { listPackQuestions, retirePackQuestion, savePack, savePackQuestion, setPackArchived } from '../learning/admin-content'
import { assistantMessages, askAssistant } from '../learning/assistant'
import { createPrep, createScore, learningSummary, listPrep, listScores, notebook, saveAnnotation, togglePrep } from '../learning/personal'
import { practiceFilterSchema } from '../../src/shared/api/learning'
import type { WorkerEnvironment } from '../types'

const trackQuery = z.object({ track: trackSchema })
export function learningRoutes(requireSession: MiddlewareHandler<WorkerEnvironment>) {
  const app = new Hono<WorkerEnvironment>()
  app.use('/learning/*', requireSession)
  app.use('/admin/learning/*', requireSession, requireAdmin)
  app.use('/admin/learning/import', bodyLimit({ maxSize: 3_000_000, onError: (c) => c.json({ error: { code: 'VALIDATION_ERROR', message: 'حداکثر اندازهٔ ورودی ۳ مگابایت است.' } }, 413) }))
  app.get('/learning/catalog', async (c) => c.json(await getCatalog(c.env.DB, readQuery(c, trackQuery).track)))
  app.post('/learning/count', async (c) => {
    const filter = questionFilter(await readBody(c, practiceFilterSchema), userId(c))
    const count = await c.env.DB.prepare(`SELECT COUNT(*) AS count FROM learning_questions q JOIN learning_packs p ON p.id = q.pack_id WHERE ${filter.sql}`)
      .bind(...filter.values).first<{ count: number }>()
    return c.json({ count: count?.count ?? 0 })
  })
  app.get('/learning/topics', async (c) => {
    const q = readQuery(c, trackQuery.extend({ samples: z.enum(['true', 'false']).default('false'), page: z.coerce.number().int().min(0).max(10000).default(0), subjectId: z.string().max(100).optional() }))
    return c.json(await listTopics(c.env.DB, q.track, q.samples === 'true', q.page, q.subjectId))
  })
  app.get('/learning/summary', async (c) => c.json(await learningSummary(c.env.DB, userId(c), readQuery(c, trackQuery).track)))
  app.get('/learning/attempts', async (c) => c.json({ attempts: await attemptHistory(c.env.DB, userId(c), readQuery(c, trackQuery).track) }))
  app.post('/learning/attempts', async (c) => c.json({ attempt: await startAttempt(c.env.DB, userId(c), await readBody(c, startAttemptSchema)) }, 201))
  app.get('/learning/attempts/:id', async (c) => c.json({ attempt: await loadAttempt(c.env.DB, userId(c), c.req.param('id')) }))
  app.put('/learning/attempts/:id/answers/:questionId', async (c) => c.json({ attempt: await answerQuestion(c.env.DB, userId(c), c.req.param('id'), c.req.param('questionId'), (await readBody(c, answerInputSchema)).selectedIndex) }))
  app.post('/learning/attempts/:id/finish', async (c) => c.json({ attempt: await finishAttempt(c.env.DB, userId(c), c.req.param('id')) }))
  app.get('/learning/notebook', async (c) => c.json(await notebook(c.env.DB, userId(c), readQuery(c, trackQuery).track)))
  app.put('/learning/notebook/:questionId', async (c) => {
    await saveAnnotation(c.env.DB, userId(c), c.req.param('questionId'), await readBody(c, annotationInputSchema))
    return c.body(null, 204)
  })
  app.get('/learning/scores', async (c) => c.json({ scores: await listScores(c.env.DB, userId(c)) }))
  app.post('/learning/scores', async (c) => c.json(await createScore(c.env.DB, userId(c), await readBody(c, scoreInputSchema)), 201))
  app.delete('/learning/scores/:id', async (c) => {
    const r = await c.env.DB.prepare('DELETE FROM learning_scores WHERE id = ? AND user_id = ?').bind(c.req.param('id'), userId(c)).run()
    if (!r.meta.changes) throw notFound()
    return c.body(null, 204)
  })
  app.get('/learning/prep', async (c) => c.json({ packs: await listPrep(c.env.DB, userId(c)) }))
  app.post('/learning/prep', async (c) => c.json(await createPrep(c.env.DB, userId(c), await readBody(c, prepInputSchema)), 201))
  app.patch('/learning/prep/:id', async (c) => {
    const input = await readBody(c, z.object({ stepId: z.string().min(1).max(160), done: z.boolean() }).strict())
    await togglePrep(c.env.DB, userId(c), c.req.param('id'), input.stepId, input.done)
    return c.body(null, 204)
  })
  app.delete('/learning/prep/:id', async (c) => {
    const r = await c.env.DB.prepare('DELETE FROM learning_prep WHERE id = ? AND user_id = ?').bind(c.req.param('id'), userId(c)).run()
    if (!r.meta.changes) throw notFound()
    return c.body(null, 204)
  })
  app.get('/learning/assistant', async (c) => c.json(await assistantMessages(c.env, userId(c))))
  app.post('/learning/assistant', async (c) => c.json(await askAssistant(c.env, userId(c), await readBody(c, assistantInputSchema))))
  app.get('/admin/learning/packs', async (c) => c.json(await getCatalog(c.env.DB, readQuery(c, trackQuery).track, true)))
  app.post('/admin/learning/import', async (c) => {
    return c.json(await importPack(c.env.DB, await readBody(c, importPackSchema)), 201)
  })
  app.post('/admin/learning/packs', async (c) => c.json(await savePack(c.env.DB, await readBody(c, packMetadataInputSchema)), 201))
  app.put('/admin/learning/packs/:id', async (c) =>
    c.json(await savePack(c.env.DB, await readBody(c, packMetadataInputSchema), c.req.param('id'))))
  app.delete('/admin/learning/packs/:id', async (c) => {
    await setPackArchived(c.env.DB, c.req.param('id'), true)
    return c.body(null, 204)
  })
  app.post('/admin/learning/packs/:id/restore', async (c) => {
    await setPackArchived(c.env.DB, c.req.param('id'), false)
    return c.body(null, 204)
  })
  app.patch('/admin/learning/packs/:id', async (c) => {
    const input = await readBody(c, z.object({ isActive: z.boolean(), availableAt: z.iso.datetime() }).strict())
    const result = await c.env.DB.prepare('UPDATE learning_packs SET is_active = ?, available_at = ? WHERE id = ? AND archived_at IS NULL')
      .bind(Number(input.isActive), Date.parse(input.availableAt), c.req.param('id')).run()
    if (!result.meta.changes) throw notFound()
    return c.body(null, 204)
  })
  app.get('/admin/learning/packs/:id/questions', async (c) => {
    const { q, page } = readQuery(c, z.object({
      q: z.string().trim().max(160).default(''), page: z.coerce.number().int().min(0).max(10_000).default(0),
    }))
    return c.json(await listPackQuestions(c.env.DB, c.req.param('id'), q, page))
  })
  app.post('/admin/learning/packs/:id/questions', async (c) =>
    c.json(await savePackQuestion(c.env.DB, c.req.param('id'), await readBody(c, questionInputSchema)), 201))
  app.put('/admin/learning/packs/:id/questions/:questionId', async (c) =>
    c.json(await savePackQuestion(c.env.DB, c.req.param('id'), await readBody(c, questionInputSchema), c.req.param('questionId'))))
  app.delete('/admin/learning/packs/:id/questions/:questionId', async (c) => {
    await retirePackQuestion(c.env.DB, c.req.param('id'), c.req.param('questionId'))
    return c.body(null, 204)
  })
  return app
}
