import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api } from '../../app/api'
import { auth } from '../../app/auth'
import { invalidateStudyData, queryKeys, useSession } from '../../app/session'
import { useOnlineStatus } from '../../app/pwa/online-status'
import { ApiClientError } from '../../shared/api/api-client-error'
import { subscribeVisibleClock } from '../../shared/lib/visible-clock'
import type { PomodoroPlan, StartTimerInput, StopTimerInput, StudyTimerState } from '../../shared/api/study-timer'
import { beginLocal, changeLocal, emptyJournal, finishLocal, visibleTimer, type LocalCommand } from './offline-timer'
import { journalKey, useTimerJournal, writeJournal } from './timer-journal'

export { elapsedSecondsOf } from './offline-timer'

/** Seconds left in the current pomodoro phase (negative once it has overrun). */
export function pomodoroRemaining(timer: StudyTimerState | null | undefined, now = Date.now()) {
  const pomodoro = timer?.pomodoro
  if (!pomodoro) return null
  const plan: PomodoroPlan = pomodoro.plan
  const resumesCurrentRound = pomodoro.phase === 'break' && pomodoro.interruptedFocusSeconds !== null
  const isLongBreak = pomodoro.phase === 'break' && !resumesCurrentRound && pomodoro.round % plan.rounds === 0
  const length = (pomodoro.phase === 'focus' ? plan.focusMinutes : isLongBreak ? plan.longBreakMinutes : plan.breakMinutes) * 60
  const spent = Math.floor((now - Date.parse(pomodoro.phaseStartedAt)) / 1000)
  return { phase: pomodoro.phase, round: pomodoro.round, rounds: plan.rounds, length, remaining: length - spent, isLongBreak, resumesCurrentRound }
}

/** Read wall-clock time only as often as the visible UI needs it. */
export function useNow(intervalMs: number | null = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => subscribeVisibleClock(intervalMs, setNow), [intervalMs])
  return now
}

export function useTimerView(poll = false) {
  const userId = useSession().data?.user.id
  const online = useOnlineStatus()
  const stored = useTimerJournal(userId)
  const remote = useQuery({ queryKey: queryKeys.timer, queryFn: api.timer.get, enabled: Boolean(userId), refetchInterval: poll && online ? 60_000 : false })
  const offline = !online || (remote.isError && remote.error instanceof ApiClientError && ['NETWORK_ERROR', 'OFFLINE_NOT_CACHED'].includes(remote.error.code))
  const journal = stored.data ?? emptyJournal()
  const source = offline && journal.observedAt ? undefined : remote.data
  const current = visibleTimer(journal, source)

  // Only the background polling subscriber records server observations.
  useEffect(() => {
    if (!poll || !online || !userId || remote.data === undefined || remote.isError) return
    const snapshot = remote.data
    const observedAt = remote.dataUpdatedAt
    void writeJournal(userId, journal => {
      if (observedAt <= journal.observedAt) return
      journal.snapshot = snapshot
      journal.observedAt = observedAt
      if (journal.uncertainStart && observedAt > journal.uncertainStart) delete journal.uncertainStart
    }).catch(() => { /* Online controls still work if browser storage is unavailable. */ })
  }, [poll, online, userId, remote.data, remote.isError, remote.dataUpdatedAt])
  return { current, userId, journal, offline, stored, remote }
}

export function useStudyTimer() {
  const client = useQueryClient()
  const { current, userId, journal, offline, stored, remote } = useTimerView()

  const settle = async (next: StudyTimerState | null) => {
    await client.cancelQueries({ queryKey: queryKeys.timer, exact: true })
    if (client.getQueryData<{ user: { id: string } }>(queryKeys.session)?.user.id !== userId) return
    client.setQueryData(queryKeys.timer, next)
    if (userId) await writeJournal(userId, entry => {
      entry.snapshot = next
      entry.observedAt = Date.now()
      delete entry.uncertainStart
    }).catch(() => {})
  }
  const onConflict = (error: unknown) => {
    // Another tab/device changed the timer: adopt the server's truth.
    if (error instanceof ApiClientError && error.status === 409) void client.invalidateQueries({ queryKey: queryKeys.timer })
  }
  const command = () => ({ commandId: crypto.randomUUID(), expectedVersion: current?.version ?? 1 })
  const shouldUseDevice = () => !navigator.onLine || offline || Boolean(journal.local)
  function owner() {
    if (!userId || userId !== auth.getOfflineAccountId()) throw new ApiClientError('برای ذخیرۀ جلسه یک بار وارد حسابت شو.', { code: 'OFFLINE_OWNER_MISSING' })
    return userId
  }
  function active() { if (!current) throw Error('جلسۀ فعالی پیدا نشد.'); return current }
  async function refreshLocal() { await client.invalidateQueries({ queryKey: journalKey(userId), exact: true }) }

  const start = useMutation({
    networkMode: 'always',
    mutationFn: async (input: Omit<StartTimerInput, 'commandId'>) => {
      const unsettledServerTimer = remote.data && journal.finished.some(entry => !entry.problem && entry.log.id === remote.data?.logId)
      if (shouldUseDevice() || unsettledServerTimer) {
        if (current) throw Error('یک جلسۀ مطالعه در حال اجراست.')
        const next = await writeJournal(owner(), entry => beginLocal(entry, input, crypto.randomUUID(), Date.now()))
        await refreshLocal()
        return next
      }
      const started = Date.now()
      try {
        const next = await api.timer.start({ ...input, commandId: crypto.randomUUID() })
        await settle(next)
        return next
      } catch (error) {
        if (userId && error instanceof ApiClientError && error.code === 'NETWORK_ERROR') {
          await writeJournal(userId, entry => { entry.uncertainStart = started }).catch(() => {})
        }
        throw error
      }
    },
    onSuccess: () => {
      // Study totals, awards and coins are calculated from completed sessions.
      void client.invalidateQueries({ queryKey: ['live'] })
      void client.invalidateQueries({ queryKey: queryKeys.friends })
    },
    onError: onConflict,
  })
  async function change(action: LocalCommand, send: () => Promise<StudyTimerState>) {
    if (shouldUseDevice()) {
      const next = await writeJournal(owner(), entry => changeLocal(entry, active(), action, Date.now()))
      await refreshLocal()
      return next
    }
    const next = await send()
    await settle(next)
    return next
  }
  const pause = useMutation({ networkMode: 'always', mutationFn: () => change({ type: 'pause' }, () => api.timer.pause(command())), onError: onConflict })
  const resume = useMutation({ networkMode: 'always', mutationFn: () => change({ type: 'resume' }, () => api.timer.resume(command())), onError: onConflict })
  const update = useMutation({
    networkMode: 'always',
    mutationFn: (fields: { testCount?: number; focusLockEnabled?: boolean }) =>
      change({ type: 'update', fields }, () => api.timer.update({ ...command(), ...fields })),
    onError: onConflict,
  })
  const stop = useMutation({
    networkMode: 'always',
    mutationFn: async (input: Omit<StopTimerInput, 'commandId' | 'expectedVersion'>) => {
      if (shouldUseDevice()) {
        const result = await writeJournal(owner(), entry => finishLocal(entry, active(), input, Date.now()))
        await refreshLocal()
        return result
      }
      const result = await api.timer.stop({ ...command(), ...input })
      await settle(null)
      return result
    },
    onSuccess: () => invalidateStudyData(client),
    onError: onConflict,
  })

  return {
    timer: current,
    offline,
    local: Boolean(journal.local),
    pending: journal.finished,
    isLoading: stored.isPending || (!offline && !journal.local && remote.isPending),
    error: offline ? stored.error : journal.local ? null : remote.error,
    refetch: offline && stored.isError ? stored.refetch : remote.refetch,
    start,
    pause,
    resume,
    update,
    stop,
    busy: start.isPending || pause.isPending || resume.isPending || stop.isPending,
  }
}
