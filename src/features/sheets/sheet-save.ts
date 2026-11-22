import { z } from 'zod'
import { sheetDataSchema } from '../../shared/api/sheets'

const draftSchema = z.object({ title: z.string().max(80), data: sheetDataSchema })
export type SheetDraft = z.infer<typeof draftSchema>
export type SheetSaveStatus =
  | { kind: 'saved' | 'saving' | 'dirty' }
  | { kind: 'error'; error: unknown }

export function readSheetDraft(key: string): SheetDraft | undefined {
  try {
    const stored = sessionStorage.getItem(key)
    if (stored !== null) return draftSchema.parse(JSON.parse(stored))
  } catch { /* The editor can still save directly to the server. */ }
}

export function keepSheetDraft(key: string, draft: SheetDraft): boolean {
  try {
    sessionStorage.setItem(key, JSON.stringify(draft))
    return true
  } catch { return false }
}

export function clearSheetDraft(key: string, saved?: SheetDraft) {
  try {
    if (!saved || sessionStorage.getItem(key) === JSON.stringify(saved)) sessionStorage.removeItem(key)
  } catch { /* Browser storage is unavailable. */ }
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
