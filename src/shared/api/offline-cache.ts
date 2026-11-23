export const offlineAccountKey = 'sweet-study:offline-account:v1'
const readCacheKey = 'sweet-study:offline-reads:v1'
const maxCacheSize = 1_500_000
const coreReads = new Set(['/api/profile', '/api/settings', '/api/subjects', '/api/study/timer'])
const savedReads = new Set([
  ...coreReads,
  '/api/schedule/day', '/api/study/logs', '/api/progress', '/api/progress/heatmap',
  '/api/gamification', '/api/study-dna', '/api/leaderboard', '/api/planner/reminders',
  '/api/shop/chibi', '/api/shop/entitlements', '/api/learning/scores',
])

export function readOfflineStorage(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') } catch { return null }
}

export function offlineAccountId() {
  const stored = readOfflineStorage(offlineAccountKey) as { user?: { id?: unknown } } | null
  return typeof stored?.user?.id === 'string' ? stored.user.id : undefined
}

export function isSavedRead(path: string) {
  return savedReads.has(path.split('?')[0] ?? '')
}

function readCache(accountId: string): Record<string, unknown> {
  const cache = readOfflineStorage(readCacheKey) as { accountId?: unknown; entries?: Record<string, unknown> } | null
  return cache?.accountId === accountId && cache.entries && typeof cache.entries === 'object' ? cache.entries : {}
}

export function readSavedResponse(accountId: string, path: string) {
  return accountId === offlineAccountId() ? readCache(accountId)[path] : undefined
}

export function saveResponse(accountId: string, path: string, value: unknown) {
  if (accountId !== offlineAccountId()) return
  try {
    const entries = readCache(accountId)
    delete entries[path]
    entries[path] = value
    let json = JSON.stringify({ accountId, entries })
    for (const key of Object.keys(entries)) {
      if (json.length <= maxCacheSize) break
      if (coreReads.has(key) || key === path) continue
      delete entries[key]
      json = JSON.stringify({ accountId, entries })
    }
    if (json.length <= maxCacheSize) localStorage.setItem(readCacheKey, json)
  } catch { /* Storage may be disabled or full. The online result is still usable. */ }
}

export function saveOfflineAccount(session: { user: { id: string } } | null) {
  try {
    const accountId = offlineAccountId()
    if (session) localStorage.setItem(offlineAccountKey, JSON.stringify(session))
    else localStorage.removeItem(offlineAccountKey)
    if (session?.user.id !== accountId) localStorage.removeItem(readCacheKey)
  } catch { /* Private browsing or a full disk can disable offline storage. */ }
}
