import { useSyncExternalStore } from 'react'
import { readAppliedColorMode, subscribeToAppliedColorMode } from './model'

/** The light/dark mode currently applied to the app (not the device setting). */
export function useTheme() {
  const mode = useSyncExternalStore(subscribeToAppliedColorMode, readAppliedColorMode, () => 'light' as const)
  return { mode }
}
