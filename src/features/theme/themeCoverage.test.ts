/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { themePresetOptions } from './model'

// Only the product UI layer appended at the end of index.css is guarded:
// the token definitions above it legitimately contain literal colors.
const indexStyles = readFileSync(new URL('../../index.css', import.meta.url), 'utf8')
const productStyles = indexStyles.slice(indexStyles.indexOf('/* ---- Premium motion + surfaces'))
const themePresetStyles = readFileSync(
  new URL('../../styles/theme-presets.css', import.meta.url),
  'utf8',
)

describe('theme coverage', () => {
  it('keeps product surfaces on semantic colors', () => {
    const fixedColorPattern =
      /#[\da-f]{3,8}\b|(?:rgb|hsl)a?\(|(?:color|background):\s*(?:white|black)\b/gi

    expect(productStyles.length).toBeGreaterThan(100)
    expect(productStyles.match(fixedColorPattern)).toBeNull()
  })

  it('provides a dark variant for every selectable TweakCN palette', () => {
    const tweakCnPresets = themePresetOptions.filter(
      ({ value }) => value !== 'sweet',
    )

    for (const { value } of tweakCnPresets) {
      expect(themePresetStyles).toContain(
        `.theme-preset.theme-${value}.theme-dark`,
      )
    }
  })
})
