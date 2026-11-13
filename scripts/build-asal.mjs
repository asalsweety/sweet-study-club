import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const result = spawnSync(process.execPath, [resolve('scripts/run-vite.mjs'), 'build'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    CLOUDFLARE_ENV: 'asal',
    VITE_PUBLIC_APP_URL: 'https://test.zendegidarkhavarmiane.lol',
    VITE_API_BASE_URL: '',
  },
})

if (result.error) console.error(result.error.message)
if (result.status === 0) {
  const expected = JSON.parse(readFileSync(resolve('wrangler.jsonc'), 'utf8')).env.asal
  const built = JSON.parse(readFileSync(resolve('dist/sweet_study_club/wrangler.json'), 'utf8'))
  if (built.name !== expected.name || built.account_id !== expected.account_id ||
      built.vars.APP_ENVIRONMENT !== 'preview' || built.vars.APP_ORIGIN !== expected.vars.APP_ORIGIN ||
      built.d1_databases[0]?.database_id !== expected.d1_databases[0].database_id) {
    console.error('The build does not match Asal’s test deployment configuration.')
    process.exit(1)
  }
}
process.exit(result.status ?? 1)
