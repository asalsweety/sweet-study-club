import { useEffect, useState } from 'react'
import {
  applyThemeToDocument,
  readStoredColorMode,
  readStoredThemePreset,
  storeColorMode,
  storeThemePreset,
  type ColorMode,
  type ThemePreset,
} from './model'

export function useTheme() {
  const [preset, setPreset] = useState<ThemePreset>(readStoredThemePreset)
  const [mode, setMode] = useState<ColorMode>(readStoredColorMode)

  useEffect(() => {
    applyThemeToDocument(preset, mode)
  }, [preset, mode])

  return {
    preset,
    mode,
    setPreset: (next: ThemePreset) => {
      setPreset(next)
      storeThemePreset(next)
    },
    setMode: (next: ColorMode) => {
      setMode(next)
      storeColorMode(next)
    },
  }
}
