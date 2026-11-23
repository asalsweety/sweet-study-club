import { Hono, type MiddlewareHandler } from 'hono'
import { z } from 'zod'
import {
  createPlannerItemInputSchema,
  plannerRangeQuerySchema,
  updatePlannerItemInputSchema,
} from '../../src/shared/api/planner'
import { isoDateSchema } from '../../src/shared/api/schedule'
import {
  updateSettingsInputSchema,
  upsertSubjectInputSchema,
} from '../../src/shared/api/settings'
import {
  manualStudyLogInputSchema,
  startTimerInputSchema,
  stopTimerInputSchema,
  syncOfflineTimerInputSchema,
  timerCommandInputSchema,
  updateTimerInputSchema,
} from '../../src/shared/api/study-timer'
import { addDays, startOfTehranDay, tehranClock } from '../../src/shared/lib/tehran'
import { readBody, readQuery, userId } from '../http/validation'
import * as planner from '../planner/service'
import { getDaySchedule } from '../schedule/service'
import * as settings from '../settings/service'
import * as timer from '../study-timer/commands'
import { syncOfflineTimer } from '../study-timer/offline'
import { recordManualStudyLog, removeCompletedStudyLog } from '../study-timer/logs'
import { findActiveTimerByUserId, listCompletedLogs } from '../study-timer/repository'
import type { WorkerEnvironment } from '../types'

const rangeQuery = z.object({ from: isoDateSchema, to: isoDateSchema })

export function studyRoutes(requireSession: MiddlewareHandler<WorkerEnvironment>) {
  const app = new Hono<WorkerEnvironment>()
  // Guard only this module's paths: a '*' middleware would leak onto every
  // /api route (health, auth) once this sub-app is mounted at /api.
  for (const path of ['/study/*', '/schedule/*', '/settings', '/subjects', '/subjects/*', '/planner', '/planner/*']) {
    app.use(path, requireSession)
  }

  app.get('/study/timer', async (c) => c.json({ timer: await findActiveTimerByUserId(c.env.DB, userId(c)) }))
  app.post('/study/timer/start', async (c) =>
    c.json({ timer: await timer.startTimer(c.env.DB, userId(c), await readBody(c, startTimerInputSchema)) }, 201))
  app.post('/study/timer/pause', async (c) =>
    c.json({ timer: await timer.pauseTimer(c.env.DB, userId(c), await readBody(c, timerCommandInputSchema)) }))
  app.post('/study/timer/resume', async (c) =>
    c.json({ timer: await timer.resumeTimer(c.env.DB, userId(c), await readBody(c, timerCommandInputSchema)) }))
  app.patch('/study/timer', async (c) =>
    c.json({ timer: await timer.updateTimer(c.env.DB, userId(c), await readBody(c, updateTimerInputSchema)) }))
  app.post('/study/timer/stop', async (c) =>
    c.json({ log: await timer.stopTimer(c.env.DB, userId(c), await readBody(c, stopTimerInputSchema)) }))
  app.post('/study/timer/offline', async (c) =>
    c.json({ log: await syncOfflineTimer(c.env.DB, userId(c), await readBody(c, syncOfflineTimerInputSchema)) }))

  app.get('/study/logs', async (c) => {
    const { from, to } = readQuery(c, rangeQuery)
    const logs = await listCompletedLogs(c.env.DB, userId(c), startOfTehranDay(from), startOfTehranDay(addDays(to, 1)))
    return c.json({ logs })
  })
  app.post('/study/logs', async (c) =>
    c.json({ log: await recordManualStudyLog(c.env.DB, userId(c), await readBody(c, manualStudyLogInputSchema)) }, 201))
  app.delete('/study/logs/:id', async (c) => {
    await removeCompletedStudyLog(c.env.DB, userId(c), c.req.param('id'))
    return c.body(null, 204)
  })

  app.get('/schedule/day', async (c) => {
    const { date } = readQuery(c, z.object({ date: isoDateSchema.optional() }))
    return c.json({ schedule: await getDaySchedule(c.env.DB, date ?? tehranClock(Date.now()).date) })
  })

  app.get('/settings', async (c) => c.json({ settings: await settings.getSettings(c.env.DB, userId(c)) }))
  app.patch('/settings', async (c) =>
    c.json({ settings: await settings.updateSettings(c.env.DB, userId(c), await readBody(c, updateSettingsInputSchema)) }))

  app.get('/subjects', async (c) => c.json({ subjects: await settings.listSubjects(c.env.DB, userId(c)) }))
  app.post('/subjects', async (c) =>
    c.json({ subjects: await settings.createSubject(c.env.DB, userId(c), await readBody(c, upsertSubjectInputSchema)) }, 201))
  app.post('/subjects/reset', async (c) => c.json({ subjects: await settings.resetSubjects(c.env.DB, userId(c)) }))
  app.put('/subjects/:id', async (c) =>
    c.json({
      subjects: await settings.updateSubject(c.env.DB, userId(c), c.req.param('id'), await readBody(c, upsertSubjectInputSchema)),
    }))
  app.delete('/subjects/:id', async (c) =>
    c.json({ subjects: await settings.deleteSubject(c.env.DB, userId(c), c.req.param('id')) }))

  app.get('/planner', async (c) => {
    const { from, to } = readQuery(c, plannerRangeQuerySchema)
    return c.json({ items: await planner.listPlannerItems(c.env.DB, userId(c), from, to) })
  })
  app.post('/planner', async (c) =>
    c.json({ item: await planner.createPlannerItem(c.env.DB, userId(c), await readBody(c, createPlannerItemInputSchema)) }, 201))
  app.patch('/planner/:id', async (c) =>
    c.json({
      item: await planner.updatePlannerItem(c.env.DB, userId(c), c.req.param('id'), await readBody(c, updatePlannerItemInputSchema)),
    }))
  app.delete('/planner/:id', async (c) => {
    await planner.deletePlannerItem(c.env.DB, userId(c), c.req.param('id'))
    return c.body(null, 204)
  })
  app.get('/planner/reminders', async (c) => {
    const now = Date.now()
    return c.json({ items: await planner.listDueReminders(c.env.DB, userId(c), now - 60_000, now + 24 * 3_600_000) })
  })

  return app
}
