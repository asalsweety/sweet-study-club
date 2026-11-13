import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const expected = JSON.parse(readFileSync(resolve('wrangler.jsonc'), 'utf8')).env.production
const result = spawnSync(process.execPath, [resolve('scripts/run-vite.mjs'), 'build'], {
  stdio: 'inherit',
  env: { ...process.env, CLOUDFLARE_ENV: 'production', VITE_PUBLIC_APP_URL: expected.vars.APP_ORIGIN, VITE_API_BASE_URL: '' },
})
if (result.error) console.error(result.error.message)
if (result.status !== 0) process.exit(result.status ?? 1)
const built = JSON.parse(readFileSync(resolve('dist/sweet_study_club/wrangler.json'), 'utf8'))
if (built.name !== expected.name || built.account_id !== expected.account_id ||
    built.vars.APP_ENVIRONMENT !== 'production' || built.vars.APP_ORIGIN !== expected.vars.APP_ORIGIN ||
    built.d1_databases[0]?.database_id !== expected.d1_databases[0].database_id ||
    JSON.stringify(built.routes) !== JSON.stringify(expected.routes)) {
  throw new Error('The generated configuration does not match the production environment.')
}
