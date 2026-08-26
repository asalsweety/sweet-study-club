import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const toolStateDirectory = resolve('node_modules/.tmp/vite')
mkdirSync(toolStateDirectory, { recursive: true })

const viteCli = resolve('node_modules/vite/bin/vite.js')
const result = spawnSync(
  process.execPath,
  [viteCli, ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false',
      TEMP: toolStateDirectory,
      TMP: toolStateDirectory,
      TMPDIR: toolStateDirectory,
      WRANGLER_LOG_PATH: resolve(
        toolStateDirectory,
        'wrangler.log',
      ),
      WRANGLER_SEND_METRICS: 'false',
    },
  },
)

process.exit(result.status ?? 1)
