import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import ts from 'typescript'

const root = resolve('dist/client')
const assets = resolve(root, 'assets')
const files = readdirSync(assets).filter((name) => /\.(js|css)$/.test(name))
const visited = new Set()

function visit(path) {
  if (visited.has(path)) return
  visited.add(path)
  const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, false, ts.ScriptKind.JS)
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue
    const specifier = statement.moduleSpecifier
    if (specifier && ts.isStringLiteral(specifier) && specifier.text.startsWith('.')) visit(resolve(dirname(path), specifier.text))
  }
}

const html = readFileSync(resolve(root, 'index.html'), 'utf8')
const entry = html.match(/<script[^>]*src="([^"]+)"/)?.[1]
if (!entry) throw new Error('No application entry in dist/client/index.html. Run npm run build first.')
visit(resolve(root, entry.replace(/^\//, '')))
for (const name of files.filter((name) => /^(App|AuthScreen)-.*\.js$/.test(name))) visit(resolve(assets, name))

const sizeOf = (path) => statSync(path).size
const entryPaths = [...visited]
const imagePaths = readdirSync(resolve(root, 'images'))
  .filter((name) => name.startsWith('onboarding-study-room.'))
  .map((name) => resolve(root, 'images', name))
if (!imagePaths.length) throw new Error('The onboarding image is missing from the build.')
const report = {
  entryJavaScript: {
    files: entryPaths.length,
    bytes: entryPaths.reduce((sum, path) => sum + sizeOf(path), 0),
    gzipBytes: entryPaths.reduce((sum, path) => sum + gzipSync(readFileSync(path)).length, 0),
  },
  cssBytes: files.filter((name) => name.endsWith('.css')).reduce((sum, name) => sum + sizeOf(resolve(assets, name)), 0),
  onboardingImageBytes: imagePaths.reduce((sum, path) => sum + sizeOf(path), 0),
  totalJavaScriptBytes: files.filter((name) => name.endsWith('.js')).reduce((sum, name) => sum + sizeOf(resolve(assets, name)), 0),
}
console.log(JSON.stringify(report, null, 2))

if (process.argv.includes('--check')) {
  const budgets = [
    ['Account entry JavaScript', report.entryJavaScript.bytes, 430_000],
    ['Account entry JavaScript (gzip)', report.entryJavaScript.gzipBytes, 140_000],
    ['Stylesheet', report.cssBytes, 170_000],
    ['Onboarding imagery', report.onboardingImageBytes, 150_000],
  ]
  for (const [label, actual, budget] of budgets) {
    if (actual > budget) throw new Error(`${label} is ${actual} bytes; budget is ${budget}.`)
  }
  console.log('Performance budgets passed.')
}
