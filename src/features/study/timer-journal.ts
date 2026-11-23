import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { emptyJournal, type TimerJournal } from './offline-timer'

const store = 'accounts'
const eventName = 'sweetstudy:offline-timer-change'
export const journalKey = (id: string | undefined) => ['offline-timer', id] as const

function openJournal() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('sweetstudy-offline-timers', 1)
    request.onupgradeneeded = () => request.result.createObjectStore(store)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function transact<T>(id: string, mode: IDBTransactionMode, action: (stored: TimerJournal) => T) {
  const db = await openJournal()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(store, mode)
      const objects = tx.objectStore(store)
      const get = objects.get(id)
      let result: T
      get.onsuccess = () => {
        try {
          const data = (get.result as TimerJournal | undefined) ?? emptyJournal()
          result = action(data)
          if (mode === 'readwrite') objects.put(data, id)
        } catch (error) { tx.abort(); reject(error) }
      }
      tx.oncomplete = () => resolve(result)
      tx.onabort = () => reject(tx.error ?? Error('ذخیرۀ زمان مطالعه در این مرورگر ممکن نشد.'))
    })
  } finally { db.close() }
}

export const readJournal = (id: string) => transact(id, 'readonly', journal => journal)
export async function writeJournal<T>(id: string, change: (journal: TimerJournal) => T) {
  const result = await transact(id, 'readwrite', change)
  window.dispatchEvent(new CustomEvent(eventName, { detail: id }))
  try { localStorage.setItem(eventName, JSON.stringify([id, crypto.randomUUID()])) } catch { /* Current-tab updates still work. */ }
  return result
}

export function useTimerJournal(id: string | undefined) {
  const client = useQueryClient()
  useEffect(() => {
    if (!id) return
    const changed = () => { void client.invalidateQueries({ queryKey: journalKey(id) }) }
    const onTab = (event: Event) => { if ((event as CustomEvent).detail === id) changed() }
    const onStorage = (event: StorageEvent) => { if (event.key === eventName) changed() }
    window.addEventListener(eventName, onTab)
    window.addEventListener('storage', onStorage)
    return () => { window.removeEventListener(eventName, onTab); window.removeEventListener('storage', onStorage) }
  }, [id, client])
  return useQuery({ queryKey: journalKey(id), enabled: Boolean(id), queryFn: () => readJournal(id!), staleTime: Infinity, networkMode: 'always', retry: false })
}
