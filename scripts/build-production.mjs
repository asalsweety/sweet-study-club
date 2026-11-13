import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const expected = JSON.parse(readFileSync(resolve('wrangler.jsonc'), 'utf8')).env.production
// The title font file is kept out of the public repository; production builds
// made on a machine that has it ship it (the owner confirmed it is free to use).
const titleFont = existsSync(resolve('public/fonts/licensed/mahboubeh-mehravar.woff2'))
console.log(titleFont ? 'Title font: Mahboubeh Mehravar included.' : 'Title font file not found; titles use Lalezar.')
const result = spawnSync(process.execPath, [resolve('scripts/run-vite.mjs'), 'build'], {
  stdio: 'inherit',
  env: { ...process.env, CLOUDFLARE_ENV: 'production', VITE_PUBLIC_APP_URL: expected.vars.APP_ORIGIN, VITE_API_BASE_URL: '', VITE_TITLE_FONT_LICENSED: titleFont ? 'true' : 'false' },
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
