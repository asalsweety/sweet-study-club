import { useSyncExternalStore } from 'react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const emit = () => { for (const listener of listeners) listener() }

/** Already opened from the home screen (Android, desktop, or iOS). */
export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

/** iPhone/iPad have no install prompt; people add the app from the Share menu. */
export function isAppleMobile() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches

/** Call once at startup: the browser fires this event only once, early. */
export function listenForInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred = event as InstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    installed = true
    deferred = null
    emit()
  })
}

export type InstallMode = 'prompt' | 'apple' | 'manual' | null

function readMode(): InstallMode {
  if (installed || isStandalone()) return null
  if (deferred) return 'prompt'
  if (isAppleMobile()) return 'apple'
  // Other phones (e.g. Firefox, Samsung Internet) install from the browser menu.
  return isTouchDevice() ? 'manual' : null
}

export function useInstallMode() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    readMode,
    () => null,
  )
}

/** Shows the browser's own install dialog; resolves true when accepted. */
export async function promptInstall() {
  if (!deferred) return false
  const event = deferred
  deferred = null
  emit()
  await event.prompt()
  const { outcome } = await event.userChoice
  return outcome === 'accepted'
}
