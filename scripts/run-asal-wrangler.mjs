import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const args = process.argv.slice(2)
const stateDirectory = resolve('.wrangler/auth/asal')
mkdirSync(stateDirectory, { recursive: true })

const environment = {
  ...process.env,
  XDG_CONFIG_HOME: stateDirectory,
  CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false',
  WRANGLER_LOG_PATH: resolve(stateDirectory, 'wrangler.log'),
  WRANGLER_SEND_METRICS: 'false',
}

// This profile must never silently use another account's environment token.
for (const name of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_API_KEY', 'CLOUDFLARE_EMAIL', 'CLOUDFLARE_ACCOUNT_ID']) {
  delete environment[name]
}

const cli = resolve('node_modules/wrangler/bin/wrangler.js')
const safeWithoutIdentity = ['login', 'whoami'].includes(args[0]) || args.includes('--help') || args.includes('--dry-run')

if (!safeWithoutIdentity) {
  const result = spawnSync(process.execPath, [cli, 'whoami', '--json'], { env: environment, encoding: 'utf8' })
  if (result.status !== 0) {
    console.error('Sign in with npm run cf:login:asal before accessing the remote account.')
    process.exit(1)
  }
  const identity = JSON.parse(result.stdout)
  if (identity.email?.toLowerCase() !== 'asal.aboali@gmail.com') {
    console.error('Refusing to continue: this Cloudflare profile is not signed in as asal.aboali@gmail.com.')
    process.exit(1)
  }
  const config = JSON.parse(readFileSync(resolve('wrangler.jsonc'), 'utf8'))
  const accountId = config.env.asal.account_id
  if (!accountId || !identity.accounts?.some((account) => account.id === accountId)) {
    console.error('Set env.asal.account_id in wrangler.jsonc to an account verified by npm run cf:whoami:asal.')
    process.exit(1)
  }
  environment.CLOUDFLARE_ACCOUNT_ID = accountId
}

const result = spawnSync(process.execPath, [cli, ...args], { env: environment, stdio: 'inherit' })
if (result.error) console.error(result.error.message)
process.exit(result.status ?? 1)
