import {
  accessSync,
  constants,
  readdirSync,
  readFileSync,
} from 'node:fs'
import { basename, join, resolve } from 'node:path'

const requiredArtifacts = [
  'dist/client/index.html',
  'dist/client/manifest.webmanifest',
  'dist/client/sw.js',
  'dist/sweet_study_club/index.js',
  'dist/sweet_study_club/wrangler.json',
]

for (const artifact of requiredArtifacts) {
  accessSync(resolve(artifact), constants.R_OK)
}

function findFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(
    (entry) => {
      const entryPath = join(directory, entry.name)
      return entry.isDirectory() ? findFiles(entryPath) : [entryPath]
    },
  )
}

const buildFiles = findFiles(resolve('dist'))
const copiedSecretFile = buildFiles.find(
  (filePath) => basename(filePath) === '.dev.vars',
)

if (copiedSecretFile) {
  throw new Error(
    'The build contains .dev.vars. Worker secrets must not enter deployment artifacts.',
  )
}

const workerConfig = JSON.parse(
  readFileSync(
    resolve('dist/sweet_study_club/wrangler.json'),
    'utf8',
  ),
)

if (workerConfig.assets?.directory !== '../client') {
  throw new Error(
    'The generated Worker configuration does not point at the client assets.',
  )
}

console.log('Cloudflare Worker and PWA artifacts are complete.')
