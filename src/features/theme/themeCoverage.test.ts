/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setThemePreference, startThemeSync } from './model'

// Only the product UI layer appended at the end of index.css is guarded:
// the token definitions above it legitimately contain literal colors.
const indexStyles = readFileSync(new URL('../../index.css', import.meta.url), 'utf8')
const productStyles = indexStyles.slice(indexStyles.indexOf('/* ---- Premium motion + surfaces'))

afterEach(() => vi.unstubAllGlobals())

describe('theme coverage', () => {
  it('keeps product surfaces on semantic colors', () => {
    const fixedColorPattern =
      /#[\da-f]{3,8}\b|(?:rgb|hsl)a?\(|(?:color|background):\s*(?:white|black)\b/gi

    expect(productStyles.length).toBeGreaterThan(100)
    expect(productStyles.match(fixedColorPattern)).toBeNull()
  })

  it('starts light even on a dark device, and follows the device only when asked', () => {
    const preference = Object.assign(new EventTarget(), { matches: true })
    const toggle = vi.fn()
    const store = new Map<string, string>()
    vi.stubGlobal('window', {
      matchMedia: () => preference,
      localStorage: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value) },
      setTimeout: () => 0,
    })
    vi.stubGlobal('document', { documentElement: { classList: { toggle, add: vi.fn(), remove: vi.fn() } }, querySelector: () => null })

    const stop = startThemeSync()
    expect(toggle).toHaveBeenLastCalledWith('theme-dark', false)
    preference.dispatchEvent(new Event('change'))
    expect(toggle).toHaveBeenLastCalledWith('theme-dark', false)

    setThemePreference('system')
    expect(toggle).toHaveBeenLastCalledWith('theme-dark', true)
    preference.matches = false
    preference.dispatchEvent(new Event('change'))
    expect(toggle).toHaveBeenLastCalledWith('theme-dark', false)

    setThemePreference('dark')
    expect(toggle).toHaveBeenLastCalledWith('theme-dark', true)
    expect(store.get('sweet-study-theme')).toBe('dark')
    stop()
  })
})
