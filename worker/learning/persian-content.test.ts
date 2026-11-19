import { DatabaseSync } from 'node:sqlite'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { URL as NodeURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { questionInputSchema, type Track } from '../../src/shared/api/learning'
import { validSubjects } from '../../src/shared/lib/learning-catalog'

const db = new DatabaseSync(':memory:')
const root = new NodeURL('../../', import.meta.url)
beforeAll(() => {
  db.exec('PRAGMA foreign_keys = ON')
  for (const name of readdirSync(new NodeURL('migrations/', root)).filter((name) => name.endsWith('.sql')).sort()) {
    db.exec(readFileSync(new NodeURL(`migrations/${name}`, root), 'utf8'))
  }
})
afterAll(() => db.close())
describe('published Persian content', () => {
  it('runs the complete migration chain and publishes only valid Persian questions', () => {
    expect(db.prepare("SELECT value FROM system_metadata WHERE key='schema_version'").get()?.value).toBe('15')
    const rows = db.prepare('SELECT p.id AS packId,p.track,q.content FROM learning_questions q JOIN learning_packs p ON p.id=q.pack_id WHERE p.is_active=1 AND p.is_sample=0').all()
    const manifest = JSON.parse(readFileSync(new NodeURL('content/learning/manifest.json', root), 'utf8'))
    expect(rows.filter((row) => !String(row.packId).startsWith('authored-statistics-'))).toHaveLength(manifest.questionPlacements)
    for (const row of rows) {
      const question = questionInputSchema.parse(JSON.parse(String(row.content)))
      expect(question.language).toBe('fa')
      expect(validSubjects(row.track as Track, [question.subjectId])).toBe(true)
      for (const path of question.images) expect(existsSync(new NodeURL(`public${path}`, root))).toBe(true)
    }
    expect(db.prepare("SELECT COUNT(*) AS total FROM learning_packs WHERE id LIKE 'reference-%' AND is_active=1").get()?.total).toBe(0)
    expect(db.prepare("SELECT COUNT(*) AS total FROM learning_questions WHERE pack_id LIKE 'reference-%'").get()?.total).toBeGreaterThan(0)
  })
  it('publishes original statistics and probability exercises across all school tracks and grades', () => {
    const packs = db.prepare(`SELECT p.track,p.grade,COUNT(*) AS count FROM learning_packs p
      JOIN learning_questions q ON q.pack_id = p.id
      WHERE p.id LIKE 'authored-statistics-%' AND p.is_active = 1 AND p.bank = 'authored'
      GROUP BY p.track,p.grade`).all()
    expect(packs).toHaveLength(12)
    expect(packs.reduce((sum, pack) => sum + Number(pack.count), 0)).toBe(57)
    expect(packs.every((pack) => Number(pack.count) >= 4)).toBe(true)
    expect(db.prepare("SELECT COUNT(*) AS count FROM learning_packs WHERE provider = 'konkur' AND grade IS NULL").get()?.count).toBe(0)
  })
  it('preserves every native answer key and the original paper images', () => {
    const source = JSON.parse(readFileSync(new NodeURL('content/learning/persian-exams.json', root), 'utf8')) as { key: string; correctIndex: number; images: string[] }[]
    const rows = db.prepare("SELECT q.content FROM learning_questions q JOIN learning_packs p ON p.id=q.pack_id WHERE p.is_active=1 AND p.bank='national'").all()
    const imported = new Map(rows.map((row) => { const q = questionInputSchema.parse(JSON.parse(String(row.content))); return [q.key, q] }))
    expect(imported.size).toBe(source.length)
    for (const question of source) {
      expect(imported.get(question.key)?.correctIndex).toBe(question.correctIndex)
      expect(imported.get(question.key)?.images).toEqual(question.images)
    }
  })
})
