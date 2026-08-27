/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { themePresetOptions } from './model'

const legacyStyles = readFileSync(
  new URL('../../App.css', import.meta.url),
  'utf8',
)
const themePresetStyles = readFileSync(
  new URL('../../styles/theme-presets.css', import.meta.url),
  'utf8',
)

describe('theme coverage', () => {
  it('keeps legacy screens on semantic colors', () => {
    const fixedColorPattern =
      /#[\da-f]{3,8}\b|(?:rgb|hsl)a?\(|(?:color|background):\s*(?:white|black)\b/gi

    expect(legacyStyles.match(fixedColorPattern)).toBeNull()
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
