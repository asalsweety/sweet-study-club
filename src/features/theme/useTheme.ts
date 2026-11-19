import { useEffect, useSyncExternalStore } from 'react'
import {
  applyThemeToDocument, readStoredColorMode, readStoredThemePreset,
  storeColorMode, storeThemePreset, type ColorMode, type ThemePreset,
} from './model'

const themeEvent = 'study-theme-change'
function subscribe(update: () => void) {
  window.addEventListener(themeEvent, update)
  window.addEventListener('storage', update)
  return () => {
    window.removeEventListener(themeEvent, update)
    window.removeEventListener('storage', update)
  }
}
export function useTheme() {
  const preset = useSyncExternalStore(subscribe, readStoredThemePreset)
  const mode = useSyncExternalStore(subscribe, readStoredColorMode)
  useEffect(() => { applyThemeToDocument(preset, mode) }, [preset, mode])
  return {
    preset, mode,
    setPreset: (next: ThemePreset) => {
      storeThemePreset(next)
      window.dispatchEvent(new Event(themeEvent))
    },
    setMode: (next: ColorMode) => {
      storeColorMode(next)
      window.dispatchEvent(new Event(themeEvent))
    },
  }
}
