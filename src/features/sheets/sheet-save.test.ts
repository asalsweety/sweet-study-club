import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearSheetDraft, createSheetSaveQueue, keepSheetDraft, readSheetDraft, type SheetDraft } from './sheet-save'

const earlier = { title: 'برگۀ من', data: { notes: 'ریاضی' } }
const latest = { title: 'برگۀ من', data: { notes: 'ریاضی و علوم' } }

afterEach(() => vi.unstubAllGlobals())

describe('planner autosave', () => {
  it('keeps the latest snapshot behind an in-flight write', async () => {
    let finishFirst!: () => void
    const first = new Promise<void>(resolve => { finishFirst = resolve })
    const save = vi.fn<(draft: SheetDraft) => Promise<void>>().mockReturnValueOnce(first).mockResolvedValue(undefined)
    const markSaved = vi.fn()
    const queue = createSheetSaveQueue(undefined, save, vi.fn(), markSaved)
    queue.replace(earlier)
    const flushing = queue.flush()
    queue.replace(latest)
    expect(queue.flush()).toBe(flushing)
    expect(save.mock.calls).toEqual([[earlier]])
    finishFirst()
    expect(await flushing).toBe(true)
    expect(save.mock.calls).toEqual([[earlier], [latest]])
    expect(markSaved.mock.calls).toEqual([[latest]])
  })

  it('reopens and retries a failed draft without dropping new edits', async () => {
    const storage = new Map<string, string>()
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    })
    const key = 'planner-sheet-draft:user:sheet'
    const error = new Error('offline')
    const save = vi.fn<(draft: SheetDraft) => Promise<void>>().mockRejectedValueOnce(error).mockResolvedValue(undefined)
    const status = vi.fn()
    expect(keepSheetDraft(key, earlier)).toBe(true)
    const queue = createSheetSaveQueue(readSheetDraft(key), save, status, saved => clearSheetDraft(key, saved))
    expect(await queue.flush()).toBe(false)
    expect(status).toHaveBeenLastCalledWith({ kind: 'error', error })
    expect(readSheetDraft(key)).toEqual(earlier)
    expect(keepSheetDraft(key, latest)).toBe(true)
    clearSheetDraft(key, earlier)
    expect(readSheetDraft(key)).toEqual(latest)
    const reopened = createSheetSaveQueue(readSheetDraft(key), save, status, saved => clearSheetDraft(key, saved))
    expect(await reopened.flush()).toBe(true)
    expect(save).toHaveBeenLastCalledWith(latest)
    expect(readSheetDraft(key)).toBeUndefined()
  })
})
