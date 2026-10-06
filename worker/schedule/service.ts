import {
  dayScheduleSchema,
  studyPartSchema,
  type CreateOverrideInput,
  type DaySchedule,
  type ScheduleOverride,
  type StudyPart,
  type UpsertStudyPartInput,
} from '../../src/shared/api/schedule'
import { tehranClock, tehranDateMinuteToEpoch } from '../../src/shared/lib/tehran'
import { conflict, invalidInput, notFound } from '../http/errors'

type PartRow = {
  id: string
  position: number
  title: string
  startMinute: number
  endMinute: number
  isActive: number
}

const partColumns = `id, position, title, start_minute AS startMinute,
  end_minute AS endMinute, is_active AS isActive`

const toPart = (row: PartRow): StudyPart =>
  studyPartSchema.parse({ ...row, isActive: row.isActive === 1 })

export async function listStudyParts(db: D1Database, activeOnly = false) {
  const result = await db
    .prepare(`SELECT ${partColumns} FROM study_parts ${activeOnly ? 'WHERE is_active = 1' : ''} ORDER BY position`)
    .all<PartRow>()
  return result.results.map(toPart)
}

export async function getDaySchedule(db: D1Database, date: string): Promise<DaySchedule> {
  const [parts, overrides] = await Promise.all([
    listStudyParts(db, true),
    db
      .prepare('SELECT part_id AS partId, kind, note FROM schedule_overrides WHERE override_date = ?')
      .bind(date)
      .all<{ partId: string | null; kind: string; note: string | null }>(),
  ])
  const holiday = overrides.results.find((row) => row.kind === 'holiday')
  const cancelled = new Set(overrides.results.filter((row) => row.kind === 'cancelled').map((row) => row.partId))

  return dayScheduleSchema.parse({
    date,
    isHoliday: holiday !== undefined,
    holidayNote: holiday?.note ?? null,
    sessions: holiday
      ? []
      : parts.map((part) => ({
          id: `${date}:${part.id}`,
          partId: part.id,
          title: part.title,
          sessionDate: date,
          startsAt: new Date(tehranDateMinuteToEpoch(date, part.startMinute)).toISOString(),
          endsAt: new Date(tehranDateMinuteToEpoch(date, part.endMinute)).toISOString(),
          isCancelled: cancelled.has(part.id),
        })),
  })
}

/** Scheduled study may start only inside today's open, non-cancelled part. */
export async function assertScheduledSessionOpen(db: D1Database, sessionId: string, now: number) {
  const [date, partId] = sessionId.split(':')
  if (!date || !partId || date !== tehranClock(now).date) {
    throw invalidInput('This study part is not part of today.')
  }
  const schedule = await getDaySchedule(db, date)
  const session = schedule.sessions.find((item) => item.partId === partId)
  if (!session || session.isCancelled) throw notFound('This study part is not available today.')
  if (now < Date.parse(session.startsAt) || now >= Date.parse(session.endsAt)) {
    throw conflict('PART_NOT_OPEN', 'This study part is not open right now.')
  }
}

export async function createStudyPart(db: D1Database, input: UpsertStudyPartInput) {
  const id = `part-${crypto.randomUUID().slice(0, 8)}`
  const now = Date.now()
  await db
    .prepare(
      `INSERT INTO study_parts (id, position, title, start_minute, end_minute, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, input.position, input.title, input.startMinute, input.endMinute, input.isActive ? 1 : 0, now, now)
    .run()
    .catch(() => {
      throw conflict('PART_POSITION_TAKEN', 'Another part already uses this position.')
    })
  return id
}

export async function updateStudyPart(db: D1Database, id: string, input: UpsertStudyPartInput) {
  const result = await db
    .prepare(
      `UPDATE study_parts SET position = ?, title = ?, start_minute = ?, end_minute = ?, is_active = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(input.position, input.title, input.startMinute, input.endMinute, input.isActive ? 1 : 0, Date.now(), id)
    .run()
    .catch(() => {
      throw conflict('PART_POSITION_TAKEN', 'Another part already uses this position.')
    })
  if (result.meta.changes === 0) throw notFound('The study part does not exist.')
}

export async function deleteStudyPart(db: D1Database, id: string) {
  const result = await db.prepare('DELETE FROM study_parts WHERE id = ?').bind(id).run()
  if (result.meta.changes === 0) throw notFound('The study part does not exist.')
}

export async function listOverrides(db: D1Database, fromDate: string, toDate: string): Promise<ScheduleOverride[]> {
  const result = await db
    .prepare(
      `SELECT id, override_date AS date, part_id AS partId, kind, note FROM schedule_overrides
       WHERE override_date BETWEEN ? AND ? ORDER BY override_date`,
    )
    .bind(fromDate, toDate)
    .all<ScheduleOverride>()
  return result.results
}

export async function createOverride(db: D1Database, adminId: string, input: CreateOverrideInput) {
  const id = crypto.randomUUID()
  await db
    .prepare(
      `INSERT INTO schedule_overrides (id, override_date, part_id, kind, note, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, input.date, input.partId, input.kind, input.note || null, adminId, Date.now())
    .run()
    .catch(() => {
      throw conflict('OVERRIDE_EXISTS', 'This date already has the same override.')
    })
  return id
}

export async function deleteOverride(db: D1Database, id: string) {
  await db.prepare('DELETE FROM schedule_overrides WHERE id = ?').bind(id).run()
}
