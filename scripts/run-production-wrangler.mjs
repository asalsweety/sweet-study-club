import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const args = process.argv.slice(2)
const directory = resolve('node_modules/.tmp/wrangler')
mkdirSync(directory, { recursive: true })
const environment = {
  ...process.env,
  CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false',
  WRANGLER_LOG_PATH: resolve(directory, 'wrangler.log'), WRANGLER_SEND_METRICS: 'false',
}
const cli = resolve('node_modules/wrangler/bin/wrangler.js')
const identity = spawnSync(process.execPath, [cli, 'whoami', '--json'], { env: environment, encoding: 'utf8' })
if (identity.status !== 0) throw new Error('Run npm run cf:login before deploying.')
const accountId = JSON.parse(readFileSync(resolve('wrangler.jsonc'), 'utf8')).env.production.account_id
if (!JSON.parse(identity.stdout).accounts?.some((account) => account.id === accountId)) {
  throw new Error('The Wrangler login does not have access to the configured production account.')
}
environment.CLOUDFLARE_ACCOUNT_ID = accountId
const result = spawnSync(process.execPath, [cli, ...args], { env: environment, stdio: 'inherit' })
if (result.error) console.error(result.error.message)
process.exit(result.status ?? 1)
