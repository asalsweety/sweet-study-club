import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { URL as NodeURL } from 'node:url'
import { expect, it } from 'vitest'
import { sqliteD1 } from '../testing/sqlite-d1'
import { createPlannerItem, updatePlannerItem } from './service'

it('replays an offline create once without undoing edits or exposing another member’s item', async () => {
  const database = new DatabaseSync(':memory:')
  try {
    for (const name of ['0001_foundation', '0002_auth_foundation', '0003_study_timer_foundation', '0004_product_core']) {
      database.exec(readFileSync(new NodeURL(`../../migrations/${name}.sql`, import.meta.url), 'utf8'))
    }
    for (const id of ['one', 'two']) database.prepare('INSERT INTO user (id,name,email,createdAt,updatedAt) VALUES (?,?,?,0,0)').run(id, id, id + '@example.test')
    const db = sqliteD1(database)
    const input = { id: crypto.randomUUID(), date: '2026-11-23', kind: 'task' as const, title: 'تمرین',
      details: null, subjectName: null, plannedMinutes: null, plannedTests: null, remindAt: null }
    await Promise.all([createPlannerItem(db, 'one', input), createPlannerItem(db, 'one', input)])
    await updatePlannerItem(db, 'one', input.id, { isDone: true })
    expect((await createPlannerItem(db, 'one', input)).isDone).toBe(true)
    await expect(createPlannerItem(db, 'two', input)).rejects.toMatchObject({ status: 400 })
    expect(database.prepare('SELECT COUNT(*) AS n FROM planner_items').get()).toEqual({ n: 1 })
  } finally { database.close() }
})
