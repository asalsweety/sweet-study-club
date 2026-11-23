import { useEffect } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { api } from '../../app/api'
import { auth } from '../../app/auth'
import { useOnlineStatus } from '../../app/pwa/online-status'
import { invalidateStudyData, queryKeys } from '../../app/session'
import { ApiClientError } from '../../shared/api/api-client-error'
import type { StudyTimerState } from '../../shared/api/study-timer'
import { readJournal, useTimerJournal, writeJournal } from './timer-journal'

const inFlight = new Map<string, Promise<void>>()

async function uploadExclusively(accountId: string, client: QueryClient) {
  if (navigator.locks) {
    await navigator.locks.request('sweetstudy:timer-sync:' + accountId, () => upload(accountId, client))
    return
  }
  // Older browsers share the same IndexedDB even when Web Locks is unavailable.
  const owner = crypto.randomUUID()
  const lifetime = 60_000
  const held = await writeJournal(accountId, journal => {
    if (journal.syncLease && journal.syncLease.until > Date.now()) return false
    journal.syncLease = { owner, until: Date.now() + lifetime }
    return true
  })
  if (!held) return
  const renew = window.setInterval(() => {
    void writeJournal(accountId, journal => {
      if (journal.syncLease?.owner === owner) journal.syncLease.until = Date.now() + lifetime
    }).catch(() => {})
  }, lifetime / 3)
  try { await upload(accountId, client) } finally {
    window.clearInterval(renew)
    await writeJournal(accountId, journal => { if (journal.syncLease?.owner === owner) delete journal.syncLease })
  }
}

async function upload(accountId: string, client: QueryClient) {
  const queued = await readJournal(accountId)
  const entries = queued.finished.filter(entry => !entry.problem)
  if ((!entries.length && !queued.deletions.length) || (await auth.verifySession())?.user.id !== accountId) return
  for (const entry of entries) {
    try {
      if (entry.manual) await api.timer.recordLog(entry.manual, accountId)
      else await api.timer.syncOffline({ accountId, log: entry.log, baseVersion: entry.baseVersion })
    } catch (error) {
      if (!(error instanceof ApiClientError) || error.code === 'ACCOUNT_CHANGED' || (error.status !== 400 && error.status !== 409)) throw error
      await writeJournal(accountId, journal => {
        const match = journal.finished.find(item => item.log.id === entry.log.id)
        if (match) match.problem = error.status === 409
          ? 'این جلسه روی دستگاه دیگری تغییر کرده. نسخۀ این دستگاه در گزارش روزانه نگه داشته شده است.'
          : 'سرور این گزارش را نپذیرفت. نسخۀ این دستگاه در گزارش روزانه نگه داشته شده است.'
      })
      continue
    }
    await writeJournal(accountId, journal => {
      journal.finished = journal.finished.filter(item => item.log.id !== entry.log.id)
      if (journal.snapshot?.logId === entry.log.id) journal.snapshot = null
    })
    if (client.getQueryData<{ user: { id: string } }>(queryKeys.session)?.user.id !== accountId) return
    await client.cancelQueries({ queryKey: queryKeys.timer, exact: true })
    if (client.getQueryData<StudyTimerState | null>(queryKeys.timer)?.logId === entry.log.id) client.setQueryData(queryKeys.timer, null)
    invalidateStudyData(client)
    void client.invalidateQueries({ queryKey: queryKeys.timer, exact: true })
  }
  const latest = await readJournal(accountId)
  for (const job of latest.deletions.filter(job => !job.problem && !latest.finished.some(entry => entry.log.id === job.id))) {
    try {
      await api.timer.removeLog(job.id, accountId)
    } catch (error) {
      if (!(error instanceof ApiClientError) || error.status !== 404) throw error
    }
    await writeJournal(accountId, journal => { journal.deletions = journal.deletions.filter(item => item.id !== job.id) })
    if (client.getQueryData<{ user: { id: string } }>(queryKeys.session)?.user.id === accountId) invalidateStudyData(client)
  }
}

export function syncOfflineTimers(accountId: string, client: QueryClient) {
  const running = inFlight.get(accountId)
  if (running) return running
  const next = uploadExclusively(accountId, client).finally(() => inFlight.delete(accountId))
  inFlight.set(accountId, next)
  return next
}

export function useOfflineTimerSync(accountId: string | undefined) {
  const client = useQueryClient()
  const online = useOnlineStatus()
  const { data } = useTimerJournal(accountId)
  const pending = (data?.finished.filter(entry => !entry.problem).length ?? 0) + (data?.deletions.filter(job =>
    !job.problem && !data.finished.some(entry => entry.log.id === job.id && entry.problem)).length ?? 0)
  useEffect(() => {
    if (!accountId || !online || !pending) return
    const send = () => { void syncOfflineTimers(accountId, client).catch(() => { /* The durable queue retries on focus, reconnect and the timer. */ }) }
    send()
    const retry = window.setInterval(send, 30_000)
    window.addEventListener('focus', send)
    return () => { window.clearInterval(retry); window.removeEventListener('focus', send) }
  }, [accountId, online, pending, client])
}
