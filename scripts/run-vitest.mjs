import { accessSync, constants, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

function resolveWritableTempDirectory() {
  const systemTempDirectory = tmpdir()

  try {
    accessSync(systemTempDirectory, constants.W_OK)
    return systemTempDirectory
  } catch {
    const fallbackDirectory = resolve('node_modules/.tmp/vitest')
    mkdirSync(fallbackDirectory, { recursive: true })
    return fallbackDirectory
  }
}

const vitestCli = resolve('node_modules/vitest/vitest.mjs')
const result = spawnSync(
  process.execPath,
  [vitestCli, ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      TMPDIR: resolveWritableTempDirectory(),
    },
  },
)

process.exit(result.status ?? 1)
