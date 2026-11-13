import { describe, expect, it } from 'vitest'
import { rewriteLucideImports } from './lucide-imports'

describe('Lucide development imports', () => {
  it('loads individual icons and resolves aliases from the installed catalog', () => {
    const result = rewriteLucideImports("import { Timer as Clock, BarChart3 } from 'lucide-react'")
    expect(result).toContain("import Clock from 'lucide-react/dist/esm/icons/timer.mjs'")
    expect(result).not.toContain("from 'lucide-react'")
    expect(result).toContain('chart-column.mjs')
  })

  it('preserves type imports, other exports, and line numbers', () => {
    const source = "import {\n Timer,\n type LucideIcon,\n createLucideIcon,\n} from 'lucide-react'\nconst after = 1"
    const result = rewriteLucideImports(source)
    expect(result).toContain("import { type LucideIcon, createLucideIcon } from 'lucide-react'")
    expect(result.split('\n').length).toBe(source.split('\n').length)
    const typeOnly = "import type { LucideIcon } from 'lucide-react'"
    expect(rewriteLucideImports(typeOnly)).toBe(typeOnly)
  })
})
