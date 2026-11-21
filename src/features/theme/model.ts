const darkModeQuery = '(prefers-color-scheme: dark)'
const storageKey = 'sweet-study-theme'
const statusBarColors = { light: '#feeac7', dark: '#0e0b22' } as const

export type ThemePreference = 'light' | 'dark' | 'system'

export function readSystemColorMode() {
  return window.matchMedia(darkModeQuery).matches ? 'dark' : 'light'
}

export function subscribeToColorMode(update: () => void) {
  const preference = window.matchMedia(darkModeQuery)
  preference.addEventListener('change', update)
  return () => preference.removeEventListener('change', update)
}

let preference: ThemePreference = 'light'
let applied: 'light' | 'dark' = 'light'
const listeners = new Set<() => void>()

/** The last choice on this device, so the first paint matches before the account loads. */
function readStoredPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(storageKey)
    return stored === 'dark' || stored === 'system' ? stored : 'light'
  } catch {
    return 'light'
  }
}

function paint() {
  const dark = preference === 'dark' || (preference === 'system' && readSystemColorMode() === 'dark')
  applied = dark ? 'dark' : 'light'
  for (const listener of listeners) listener()
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.classList.toggle('theme-dark', dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', statusBarColors[dark ? 'dark' : 'light'])
}

/** Light unless the member picked dark or "follow the device". */
export function setThemePreference(next: ThemePreference) {
  if (next === preference) return
  preference = next
  const root = document.documentElement
  root.classList.add('theme-switching')
  window.setTimeout(() => root.classList.remove('theme-switching'), 320)
  try {
    window.localStorage.setItem(storageKey, next)
  } catch {
    // Private mode: the account setting still applies on every visit.
  }
  paint()
}

export const getThemePreference = () => preference
/** The mode actually on screen right now. */
export const readAppliedColorMode = () => applied
export function subscribeToAppliedColorMode(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** Applies the saved theme at startup and keeps "system" in step with the device. */
export function startThemeSync() {
  preference = readStoredPreference()
  paint()
  return subscribeToColorMode(() => {
    if (preference === 'system') paint()
  })
}
