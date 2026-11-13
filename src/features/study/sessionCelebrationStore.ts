import { useSyncExternalStore } from 'react'

export type FinishedSession = {
  subjectName: string
  durationSeconds: number
  percent: number | null
  tests: number
  rating: number | null
}

let current: FinishedSession | null = null
const listeners = new Set<() => void>()
const set = (next: FinishedSession | null) => { current = next; for (const listener of listeners) listener() }

/** Opens the app-wide celebration for a just-recorded session. */
export function showSessionCelebration(session: FinishedSession) { set(session) }

export function closeSessionCelebration() { set(null) }

export function useSessionCelebration() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener) },
    () => current,
    () => current,
  )
}
