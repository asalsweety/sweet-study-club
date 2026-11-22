import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { URL } from 'node:url'
import { expect, it } from 'vitest'
import { createAuth } from './auth'

it('signs in existing credential accounts and writes the same legacy issuer for new accounts', async () => {
  const db = new DatabaseSync(':memory:')
  try {
    for (const name of ['0001_foundation', '0002_auth_foundation', '0011_auth_rate_limits']) {
      db.exec(readFileSync(new URL(`../migrations/${name}.sql`, import.meta.url), 'utf8'))
    }
    const origin = 'https://auth-schema.example.test'
    const auth = createAuth({
      APP_ENVIRONMENT: 'production', APP_ORIGIN: origin, EMAIL_PASSWORD_AUTH_ENABLED: 'true',
      BETTER_AUTH_SECRET: 'test-only-auth-schema-secret-longer-than-32-characters',
      DB: db as unknown as D1Database, ASSETS: {} as Fetcher,
    })
    const password = 'A synthetic fixture password'
    const timestamp = new Date().toISOString()
    const hash = await (await auth.$context).password.hash(password)
    db.prepare('INSERT INTO "user" (id, name, email, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)')
      .run('legacy-user', 'Legacy member', 'legacy@example.test', timestamp, timestamp)
    db.prepare(`INSERT INTO "account" (id, issuer, accountId, providerId, userId, password, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('legacy-account', 'local:credential', 'legacy-user', 'credential', 'legacy-user', hash, timestamp, timestamp)

    const request = (path: string, body: object) => auth.handler(new Request(`${origin}/api/auth/${path}`, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json', 'cf-connecting-ip': '192.0.2.10' },
      body: JSON.stringify(body),
    }))
    const existing = await request('sign-in/email', { email: 'legacy@example.test', password })
    expect(existing.status).toBe(200)

    const created = await request('sign-up/email', { name: 'New member', email: 'new@example.test', password })
    expect(created.status).toBe(200)
    const accounts = db.prepare('SELECT issuer FROM "account" ORDER BY id').all()
    expect(accounts).toEqual([{ issuer: 'local:credential' }, { issuer: 'local:credential' }])
  } finally {
    db.close()
  }
})
