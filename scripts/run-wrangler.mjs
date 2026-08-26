import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const toolStateDirectory = resolve('node_modules/.tmp/wrangler')
mkdirSync(toolStateDirectory, { recursive: true })

const wranglerCli = resolve('node_modules/wrangler/bin/wrangler.js')
const result = spawnSync(
  process.execPath,
  [wranglerCli, ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      WRANGLER_LOG_PATH: resolve(toolStateDirectory, 'wrangler.log'),
      WRANGLER_SEND_METRICS: 'false',
    },
  },
)

process.exit(result.status ?? 1)
