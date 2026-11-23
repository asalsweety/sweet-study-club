import { z } from 'zod'
import { sheetDataSchema } from '../../shared/api/sheets'

const draftSchema = z.object({ title: z.string().max(80), data: sheetDataSchema })
export type SheetDraft = z.infer<typeof draftSchema>
export type SheetSaveStatus =
  | { kind: 'saved' | 'saving' | 'dirty' }
  | { kind: 'error'; error: unknown }

export function readSheetDraft(key: string): SheetDraft | undefined {
  for (const area of ['sessionStorage', 'localStorage'] as const) {
    try {
      const stored = globalThis[area]?.getItem(key)
      if (stored) return draftSchema.parse(JSON.parse(stored))
    } catch { /* Try the other copy. */ }
  }
}

export function keepSheetDraft(key: string, draft: SheetDraft): boolean {
  let kept = false
  for (const area of ['sessionStorage', 'localStorage'] as const) {
    try {
      const storage = globalThis[area]
      if (storage) { storage.setItem(key, JSON.stringify(draft)); kept = true }
    } catch { /* IndexedDB autosave can still succeed. */ }
  }
  return kept
}

export function clearSheetDraft(key: string, saved?: SheetDraft) {
  for (const area of ['sessionStorage', 'localStorage'] as const) {
    try {
      const storage = globalThis[area]
      if (storage && (!saved || storage.getItem(key) === JSON.stringify(saved))) storage.removeItem(key)
    } catch { /* Browser storage is unavailable. */ }
  }
}

/** Drain full-page snapshots serially, keeping the latest one when saving fails. */
export function createSheetSaveQueue(
  initial: SheetDraft | undefined,
  save: (draft: SheetDraft) => Promise<void>,
  onStatus: (status: SheetSaveStatus) => void,
  onSaved: (draft: SheetDraft) => void,
) {
  let pending = initial
  let inFlight: Promise<boolean> | undefined

  async function drain() {
    while (pending) {
      const snapshot = pending
      onStatus({ kind: 'saving' })
      try {
        await save(snapshot)
      } catch (error) {
        if (pending !== snapshot) continue
        onStatus({ kind: 'error', error })
        return false
      }
      if (pending === snapshot) {
        pending = undefined
        onSaved(snapshot)
      }
    }
    onStatus({ kind: 'saved' })
    return true
  }

  return {
    replace(draft: SheetDraft) {
      pending = draft
      onStatus({ kind: 'dirty' })
    },
    flush() {
      if (inFlight) return inFlight
      if (!pending) return Promise.resolve(true)
      inFlight = drain().finally(() => { inFlight = undefined })
      return inFlight
    },
    discard() { pending = undefined },
  }
}
