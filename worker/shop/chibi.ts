import {
  chibiCustomizationSchema, chibiItems, defaultChibi, minutesPerCoin,
  type ChibiAppearance, type ChibiItemId, type ChibiUpdate,
} from '../../src/shared/api/chibi'
import { conflict, forbidden } from '../http/errors'

// Completed focus seconds already exclude paused time and pomodoro breaks.
const earned = `(SELECT COALESCE(SUM(duration_seconds), 0) / ${minutesPerCoin * 60}
                 FROM study_logs WHERE user_id = ? AND ended_at IS NOT NULL)`
const spent = '(SELECT COALESCE(SUM(cost), 0) FROM chibi_purchases WHERE user_id = ?)'

export async function getChibi(db: D1Database, me: string) {
  type Row = Omit<ChibiAppearance, 'companion' | 'customization'> & {
    companion: ChibiAppearance['companion'] | null
    balance: number
    owned: string
    customization: string | null
  }
  const row = await db.prepare(
    `SELECT companion, skin, hair, outfit, decor, customization, ${earned} - ${spent} AS balance,
       (SELECT json_group_array(item) FROM chibi_purchases WHERE user_id = ?) AS owned
     FROM (SELECT ? AS id) AS owner LEFT JOIN chibi_appearance ON user_id = owner.id`,
  ).bind(me, me, me, me).first<Row>()
  if (!row) throw new Error('Chibi state query returned no row.')
  const { companion, skin, hair, outfit, decor, balance, owned } = row
  const customization = row.customization === null ? null
    : chibiCustomizationSchema.safeParse(JSON.parse(row.customization)).data ?? null
  return {
    appearance: companion ? { companion, skin, hair, outfit, decor, customization } : defaultChibi,
    coins: Math.max(0, balance),
    owned: JSON.parse(owned) as ChibiItemId[],
  }
}

export async function buyChibiItem(db: D1Database, me: string, item: ChibiItemId) {
  const { cost } = chibiItems[item]
  // Check the balance and spend in the same write. The ownership key also
  // makes a retry of a successful purchase safe.
  await db.prepare(
    `INSERT INTO chibi_purchases (user_id, item, cost)
     SELECT ?, ?, ? WHERE ${earned} - ${spent} >= ?
     ON CONFLICT (user_id, item) DO NOTHING`,
  ).bind(me, item, cost, me, me, cost).run()
  const state = await getChibi(db, me)
  if (!state.owned.includes(item)) throw conflict('CHIBI_INSUFFICIENT_COINS', 'You need more study coins.')
  return state
}

export async function updateChibi(db: D1Database, me: string, input: ChibiUpdate) {
  if (input.action === 'look') {
    const { companion, skin, hair, customization } = input.look
    await db.prepare(
      `INSERT INTO chibi_appearance (user_id, companion, skin, hair, customization) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET companion = excluded.companion, skin = excluded.skin, hair = excluded.hair,
         customization = CASE WHEN ? THEN excluded.customization ELSE chibi_appearance.customization END`,
    ).bind(me, companion, skin, hair, customization ? JSON.stringify(customization) : null, Number(customization !== undefined)).run()
  } else {
    const { slot } = chibiItems[input.item]
    const result = await db.prepare(
      `INSERT INTO chibi_appearance (user_id, ${slot})
       SELECT ?, ? WHERE EXISTS (SELECT 1 FROM chibi_purchases WHERE user_id = ? AND item = ?)
       ON CONFLICT (user_id) DO UPDATE SET ${slot} = excluded.${slot}`,
    ).bind(me, input.use ? input.item : null, me, input.item).run()
    if (!result.meta.changes) throw forbidden('You do not own this item.')
  }
  return getChibi(db, me)
}
