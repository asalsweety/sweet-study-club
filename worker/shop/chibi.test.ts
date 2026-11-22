import { readFileSync } from 'node:fs'
import { DatabaseSync, type SQLInputValue } from 'node:sqlite'
import { URL } from 'node:url'
import { expect, it } from 'vitest'
import { chibiResponseSchema, defaultChibi } from '../../src/shared/api/chibi'
import { buyChibiItem, getChibi, updateChibi } from './chibi'

it('earns from completed study, prevents overspending and equips only owned items', async () => {
  const sqlite = new DatabaseSync(':memory:')
  const root = new URL('../../migrations/', import.meta.url)
  try {
    for (const name of ['0001_foundation', '0002_auth_foundation', '0003_study_timer_foundation', '0014_chibi_studio', '0021_custom_chibi']) {
      sqlite.exec(readFileSync(new URL(`${name}.sql`, root), 'utf8'))
    }
    sqlite.exec(`
      INSERT INTO user (id, name, email, createdAt, updatedAt)
      VALUES ('a', 'A', 'a@example.com', 0, 0), ('b', 'B', 'b@example.com', 0, 0);
      INSERT INTO study_logs (id, user_id, mode, subject_name, started_at, ended_at, duration_seconds, created_at, updated_at)
      VALUES ('1', 'a', 'free', 'Math', 0, 2699999, 2699, 0, 0),
             ('2', 'a', 'free', 'Math', 0, 1000, 1, 0, 0),
             ('3', 'a', 'free', 'Math', 0, NULL, NULL, 0, 0);
    `)
    const db = {
      prepare: (sql: string) => ({
        bind: (...args: SQLInputValue[]) => ({
          first: async () => sqlite.prepare(sql).get(...args) ?? null,
          run: async () => ({ meta: { changes: sqlite.prepare(sql).run(...args).changes } }),
        }),
      }),
    } as unknown as D1Database

    const start = chibiResponseSchema.parse(await getChibi(db, 'a'))
    expect(start).toEqual({ appearance: defaultChibi, coins: 3, owned: [] })
    await expect(updateChibi(db, 'a', { action: 'equip', item: 'desk-plant', use: true })).rejects.toMatchObject({ status: 403 })

    const purchases = await Promise.allSettled([buyChibiItem(db, 'a', 'desk-plant'), buyChibiItem(db, 'a', 'desk-clock')])
    expect(purchases.map(({ status }) => status)).toEqual(['fulfilled', 'rejected'])
    expect(await buyChibiItem(db, 'a', 'desk-plant')).toMatchObject({ coins: 0, owned: ['desk-plant'] })
    expect((await updateChibi(db, 'a', { action: 'equip', item: 'desk-plant', use: true })).appearance.decor).toBe('desk-plant')
    expect((await updateChibi(db, 'a', { action: 'look', look: { companion: 'boy', skin: 'deep', hair: 'black' } })).appearance)
      .toEqual({ companion: 'boy', skin: 'deep', hair: 'black', decor: 'desk-plant', outfit: null, customization: null })
    const customization = { hairStyle: 'buns', eyes: 'green', shirt: 'mint', accessory: 'glasses' } as const
    const look = { companion: 'girl', skin: 'light', hair: 'auburn', customization } as const
    expect((await updateChibi(db, 'a', { action: 'look', look })).appearance).toMatchObject({ customization, decor: 'desk-plant' })
    expect((await updateChibi(db, 'a', { action: 'look', look: { companion: 'girl', skin: 'warm', hair: 'brown' } })).appearance.customization).toEqual(customization)
    expect((await updateChibi(db, 'a', { action: 'look', look: { ...look, customization: null } })).appearance.customization).toBeNull()
    expect(await getChibi(db, 'b')).toEqual({ appearance: defaultChibi, coins: 0, owned: [] })
  } finally {
    sqlite.close()
  }
})
