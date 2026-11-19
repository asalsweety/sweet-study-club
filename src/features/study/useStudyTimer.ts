import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api } from '../../app/api'
import { invalidateStudyData, queryKeys } from '../../app/session'
import { ApiClientError } from '../../shared/api/api-client-error'
import { subscribeVisibleClock } from '../../shared/lib/visible-clock'
import type { PomodoroPlan, StartTimerInput, StudyTimerState } from '../../shared/api/study-timer'

export function elapsedSecondsOf(timer: StudyTimerState | null | undefined, now = Date.now()) {
  if (!timer) return 0
  if (timer.timerStatus === 'paused' || !timer.currentSegmentStartedAt) return timer.accumulatedSeconds
  return timer.accumulatedSeconds + Math.max(0, Math.floor((now - Date.parse(timer.currentSegmentStartedAt)) / 1000))
}

/** Seconds left in the current pomodoro phase (negative once it has overrun). */
export function pomodoroRemaining(timer: StudyTimerState | null | undefined, now = Date.now()) {
  const pomodoro = timer?.pomodoro
  if (!pomodoro) return null
  const plan: PomodoroPlan = pomodoro.plan
  const isLongBreak = pomodoro.phase === 'break' && pomodoro.round % plan.rounds === 0
  const length = (pomodoro.phase === 'focus' ? plan.focusMinutes : isLongBreak ? plan.longBreakMinutes : plan.breakMinutes) * 60
  const spent = Math.floor((now - Date.parse(pomodoro.phaseStartedAt)) / 1000)
  return { phase: pomodoro.phase, round: pomodoro.round, rounds: plan.rounds, length, remaining: length - spent, isLongBreak }
}

/** Read wall-clock time only as often as the visible UI needs it. */
export function useNow(intervalMs: number | null = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => subscribeVisibleClock(intervalMs, setNow), [intervalMs])
  return now
}

export function useStudyTimer() {
  const client = useQueryClient()
  // BackgroundServices owns the single app-wide polling interval.
  const timer = useQuery({ queryKey: queryKeys.timer, queryFn: api.timer.get })
  const current = timer.data ?? null

  const settle = async (next: StudyTimerState | null) => {
    // An older poll must not overwrite the timer returned by the command.
    await client.cancelQueries({ queryKey: queryKeys.timer, exact: true })
    client.setQueryData(queryKeys.timer, next)
  }
  const onConflict = (error: unknown) => {
    // Another tab/device changed the timer: adopt the server's truth.
    if (error instanceof ApiClientError && error.status === 409) void client.invalidateQueries({ queryKey: queryKeys.timer })
  }
  const command = () => ({ commandId: crypto.randomUUID(), expectedVersion: current?.version ?? 1 })

  const start = useMutation({
    mutationFn: (input: Omit<StartTimerInput, 'commandId'>) => api.timer.start({ ...input, commandId: crypto.randomUUID() }),
    onSuccess: async (next) => {
      await settle(next)
      // Study totals, awards and coins are calculated from completed sessions.
      void client.invalidateQueries({ queryKey: ['live'] })
      void client.invalidateQueries({ queryKey: queryKeys.friends })
    },
    onError: onConflict,
  })
  const pause = useMutation({ mutationFn: () => api.timer.pause(command()), onSuccess: settle, onError: onConflict })
  const resume = useMutation({ mutationFn: () => api.timer.resume(command()), onSuccess: settle, onError: onConflict })
  const update = useMutation({
    mutationFn: (input: { testCount?: number; focusLockEnabled?: boolean }) => api.timer.update({ ...command(), ...input }),
    onSuccess: settle,
    onError: onConflict,
  })
  const stop = useMutation({
    mutationFn: (input: { testCount: number; testsCorrect: number; testsWrong: number; focusRating: number | null; note: string | null }) =>
      api.timer.stop({ ...command(), ...input }),
    onSuccess: async () => {
      await settle(null)
      invalidateStudyData(client)
    },
    onError: onConflict,
  })

  return {
    timer: current,
    isLoading: timer.isPending,
    error: timer.error,
    refetch: timer.refetch,
    start,
    pause,
    resume,
    update,
    stop,
    busy: start.isPending || pause.isPending || resume.isPending || stop.isPending,
  }
}
