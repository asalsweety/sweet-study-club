import { useSyncExternalStore } from 'react'
import { readSystemColorMode, subscribeToColorMode } from './model'

export function useTheme() {
  const mode = useSyncExternalStore(subscribeToColorMode, readSystemColorMode, () => 'light' as const)
  return { mode }
}
