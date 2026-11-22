/// <reference types="node" />
import type { DatabaseSync } from 'node:sqlite'

class TestStatement {
  values: (string | number | null)[] = []
  readonly sqlite: DatabaseSync
  readonly sql: string
  constructor(sqlite: DatabaseSync, sql: string) {
    this.sqlite = sqlite
    this.sql = sql
  }
  bind(...values: (string | number | null)[]) { this.values = values; return this }
  async first() { return this.sqlite.prepare(this.sql).get(...this.values) ?? null }
  async all() { return { results: this.sqlite.prepare(this.sql).all(...this.values), success: true } }
  async run() { return { meta: { changes: this.sqlite.prepare(this.sql).run(...this.values).changes }, success: true } }
}

/** Run production queries and transactional batches on in-memory SQLite. */
export function sqliteD1(sqlite: DatabaseSync): D1Database {
  return {
    prepare: (sql: string) => new TestStatement(sqlite, sql),
    batch: async (statements: TestStatement[]) => {
      sqlite.exec('BEGIN')
      try {
        const results = []
        for (const statement of statements) results.push(await statement.run())
        sqlite.exec('COMMIT')
        return results
      } catch (error) {
        sqlite.exec('ROLLBACK')
        throw error
      }
    },
  } as unknown as D1Database
}
