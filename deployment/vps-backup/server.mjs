import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import { unstable_splitSqlQuery as splitSqlQuery } from 'wrangler'

const origin = new URL(process.env.APP_ORIGIN)
const secret = process.env.BETTER_AUTH_SECRET
if (origin.protocol !== 'https:' || origin.href !== `${origin.origin}/` || !secret || secret.length < 32) {
  throw new Error('Set a dedicated HTTPS origin and an authentication secret of at least 32 characters.')
}

const workerDirectory = join(import.meta.dirname, 'worker')
const migrationDirectory = join(import.meta.dirname, 'migrations')
const manifest = JSON.parse(await readFile(join(workerDirectory, 'wrangler.json'), 'utf8'))
const chunks = (await readdir(join(workerDirectory, 'assets'))).filter((name) => name.endsWith('.js'))
const modules = [manifest.main, ...chunks.map((name) => `assets/${name}`)]
  .map((name) => ({ type: 'ESModule', path: join(workerDirectory, name) }))
const runtime = new Miniflare(convertV4MiniflareOptions({
  host: process.env.BACKUP_LISTEN_HOST ?? '0.0.0.0',
  port: Number(process.env.BACKUP_PORT ?? 8787),
  cf: false,
  modules,
  modulesRoot: workerDirectory,
  compatibilityDate: manifest.compatibility_date,
  compatibilityFlags: manifest.compatibility_flags,
  d1Databases: { DB: 'sweet-study-club-vps-backup' },
  resourcePersistencePath: process.env.BACKUP_DB_PATH ?? '/data',
  bindings: {
    APP_ENVIRONMENT: 'backup',
    APP_ORIGIN: origin.origin,
    BETTER_AUTH_SECRET: secret,
    EMAIL_PASSWORD_AUTH_ENABLED: 'true',
  },
}))

try {
  const db = await runtime.getD1Database('DB')
  await db.prepare('CREATE TABLE IF NOT EXISTS d1_migrations (name TEXT PRIMARY KEY)').run()
  const applied = new Set((await db.prepare('SELECT name FROM d1_migrations').all()).results.map(({ name }) => name))
  const migrations = (await readdir(migrationDirectory)).filter((name) => /^\d+_.+\.sql$/.test(name)).sort()
  for (const name of migrations) {
    if (applied.has(name)) continue
    const sql = await readFile(join(migrationDirectory, name), 'utf8')
    await db.batch([
      ...splitSqlQuery(sql).map((query) => db.prepare(query)),
      db.prepare('INSERT INTO d1_migrations (name) VALUES (?)').bind(name),
    ])
    console.info(`Applied ${name}`)
  }
  const response = await runtime.dispatchFetch(`${origin.origin}/api/ready`)
  if (!response.ok) throw new Error(`Worker readiness check returned HTTP ${response.status}.`)
  console.info('Sweet Study Club backup API ready')
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, async () => {
      await runtime.dispose()
    })
  }
} catch (error) {
  await runtime.dispose()
  throw error
}
