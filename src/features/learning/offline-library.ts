import { ApiClientError } from '../../shared/api/api-client-error'
import { get } from '../../shared/api/http'
import { offlinePackPageSchema, type OfflinePackInfo, type OfflineQuestion } from '../../shared/api/offline-learning'

const databaseName = 'sweet-study-offline-library'
const catalogStore = 'catalog'
const contentStore = 'content'
const stores = [catalogStore, contentStore]

export type SavedPackInfo = OfflinePackInfo & { questionCount: number; savedAt: number }
export type SavedPack = SavedPackInfo & { questions: OfflineQuestion[]; images: Record<string, Blob> }

async function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    throw new ApiClientError('این مرورگر از ذخیرۀ آفلاین پشتیبانی نمی‌کند.', { code: 'OFFLINE_STORAGE_UNAVAILABLE' })
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => {
      for (const store of stores) request.result.createObjectStore(store, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function transact<T>(mode: IDBTransactionMode, operation: (transaction: IDBTransaction) => IDBRequest<T>) {
  const database = await openDatabase()
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(stores, mode)
      const request = operation(transaction)
      transaction.oncomplete = () => resolve(request.result)
      transaction.onabort = () => reject(transaction.error ?? new Error('Offline library transaction failed.'))
    })
  } finally {
    database.close()
  }
}

export const listSavedPacks = () =>
  transact<SavedPackInfo[]>('readonly', (transaction) => transaction.objectStore(catalogStore).getAll())

export const getSavedPack = (id: string) =>
  transact<SavedPack | undefined>('readonly', (transaction) => transaction.objectStore(contentStore).get(id))

export async function removeSavedPack(id: string) {
  await transact('readwrite', (transaction) => {
    transaction.objectStore(contentStore).delete(id)
    return transaction.objectStore(catalogStore).delete(id)
  })
}

async function downloadImage(path: string): Promise<Blob> {
  try {
    const response = await fetch(path, { credentials: 'omit', redirect: 'error' })
    if (response.ok) {
      const image = await response.blob()
      if (/^image\/(jpeg|png|webp)$/i.test(image.type) && image.size > 0) return image
    }
  } catch {
    // The whole download remains retryable; don't replace a usable copy.
  }
  throw new ApiClientError('یک تصویر بسته دانلود نشد. اتصال را بررسی کن و دوباره تلاش کن.', { code: 'OFFLINE_IMAGE_DOWNLOAD_FAILED' })
}

export async function savePackOffline(id: string, onProgress: (downloaded: number) => void) {
  const questions: OfflineQuestion[] = []
  const path = `/api/learning/offline-packs/${encodeURIComponent(id)}`
  let page = await get(path, offlinePackPageSchema)
  const pack = page.pack
  while (true) {
    questions.push(...page.questions)
    onProgress(questions.length)
    if (!page.next) break
    page = await get(`${path}?${new URLSearchParams({ cursor: page.next })}`, offlinePackPageSchema)
  }
  if (questions.length === 0) {
    throw new ApiClientError('این بسته هنوز سؤال قابل دانلود ندارد.', { code: 'OFFLINE_PACK_EMPTY' })
  }

  const paths = [...new Set(questions.flatMap((question) => question.images))]
  const images: Record<string, Blob> = {}
  for (let index = 0; index < paths.length; index += 4) {
    const batch = paths.slice(index, index + 4)
    await Promise.all(batch.map(async (path) => { images[path] = await downloadImage(path) }))
  }

  const saved = { ...pack, questionCount: questions.length, savedAt: Date.now() }
  await transact('readwrite', (transaction) => {
    transaction.objectStore(contentStore).put({ ...saved, questions, images } satisfies SavedPack)
    return transaction.objectStore(catalogStore).put(saved)
  })
  return saved
}
