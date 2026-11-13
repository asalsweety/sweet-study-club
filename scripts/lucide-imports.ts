import { readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import type { Plugin } from 'vite'

const require = createRequire(import.meta.url)
const libraryDirectory = dirname(require.resolve('lucide-react/package.json'))
const entry = readFileSync(resolve(libraryDirectory, 'dist/esm/lucide-react.mjs'), 'utf8')
const iconPaths = new Map<string, string>()

// Resolve aliases from the installed package rather than guessing PascalCase
// filenames (e.g. BarChart3 is an alias of ChartColumn).
for (const match of entry.matchAll(/export \{([^}]+)\} from '\.\/icons\/([^']+)'/g)) {
  for (const alias of match[1]!.matchAll(/default as (\w+)/g)) {
    iconPaths.set(alias[1]!, `lucide-react/dist/esm/icons/${match[2]}`)
  }
}

const namedImport = /\bimport\s+(type\s+)?\{([^}]+)\}\s+from\s*(['"])lucide-react\3/g

export function rewriteLucideImports(code: string) {
  return code.replace(namedImport, (original: string, typeOnly: string | undefined, names: string) => {
    if (typeOnly) return original
    const imports: string[] = []
    const remaining: string[] = []
    for (const specifier of names.split(',')) {
      const name = specifier.trim()
      if (!name) continue
      const [exported, local = exported] = name.split(/\s+as\s+/)
      const path = iconPaths.get(exported!)
      if (!path) remaining.push(name)
      else imports.push(`import ${local} from '${path}';`)
    }
    if (remaining.length) imports.push(`import { ${remaining.join(', ')} } from 'lucide-react';`)
    // Keep subsequent source lines in place for development stack traces.
    return imports.join(' ') + '\n'.repeat(original.split('\n').length - 1)
  })
}

export function lucideImports(): Plugin {
  return {
    name: 'lucide-named-imports',
    enforce: 'pre',
    config() {
      const icons = new Set<string>()
      for (const file of readdirSync(resolve('src'), { recursive: true, encoding: 'utf8' })) {
        if (!/\.tsx?$/.test(file)) continue
        const transformed = rewriteLucideImports(readFileSync(resolve('src', file), 'utf8'))
        for (const match of transformed.matchAll(/from '(lucide-react\/dist\/esm\/icons\/[^']+)'/g)) icons.add(match[1]!)
      }
      return {
        optimizeDeps: {
          // Prebundle the used deep imports; the full catalog exports ~1MB
          // of development JS even though this app needs only a few dozen icons.
          include: [...icons].sort(),
          exclude: ['lucide-react'],
        },
      }
    },
    transform(code, id) {
      if (!/[/\\]src[/\\].*\.tsx?$/.test(id) || !code.includes('lucide-react')) return
      const transformed = rewriteLucideImports(code)
      if (transformed !== code) return { code: transformed, map: null }
    },
  }
}
