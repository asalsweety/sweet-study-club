/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { followSystemColorMode } from './model'

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

  it('applies the device color mode at startup and follows changes', () => {
    const preference = Object.assign(new EventTarget(), { matches: true })
    const toggle = vi.fn()
    vi.stubGlobal('window', { matchMedia: () => preference })
    vi.stubGlobal('document', { documentElement: { classList: { toggle } } })

    const stop = followSystemColorMode()
    expect(toggle).toHaveBeenCalledWith('dark', true)
    preference.matches = false
    preference.dispatchEvent(new Event('change'))
    expect(toggle).toHaveBeenCalledWith('dark', false)
    stop()
    toggle.mockClear()
    preference.dispatchEvent(new Event('change'))
    expect(toggle).not.toHaveBeenCalled()
  })
})
