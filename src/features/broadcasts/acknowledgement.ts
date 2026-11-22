const seenInTab = new Map<string, number>()

export function noticeKey(userId: string, id: string) {
  return `sweetstudy:notice:ack:${encodeURIComponent(userId)}:${encodeURIComponent(id)}`
}

function savedRevision(key: string) {
  let revision = seenInTab.get(key) ?? 0
  try {
    const stored = Number(localStorage.getItem(key))
    if (Number.isSafeInteger(stored)) revision = Math.max(revision, stored)
  } catch { /* In private browsing, the tab's acknowledgement still applies. */ }
  return revision
}

export function hasSeenNotice(userId: string, id: string, revision: number) {
  return savedRevision(noticeKey(userId, id)) >= revision
}

export function acknowledgeNotice(userId: string, id: string, revision: number) {
  const key = noticeKey(userId, id)
  const newest = Math.max(savedRevision(key), revision)
  seenInTab.set(key, newest)
  try { localStorage.setItem(key, String(newest)) } catch { /* The tab has the revision. */ }
}
