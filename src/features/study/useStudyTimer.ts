import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api } from '../../app/api'
import { invalidateStudyData, queryKeys } from '../../app/session'
import { ApiClientError } from '../../shared/api/client'
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

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

export function useStudyTimer() {
  const client = useQueryClient()
  const timer = useQuery({ queryKey: queryKeys.timer, queryFn: api.timer.get, refetchInterval: 60_000 })
  const current = timer.data ?? null

  const settle = (next: StudyTimerState | null) => client.setQueryData(queryKeys.timer, next)
  const onConflict = (error: unknown) => {
    // Another tab/device changed the timer: adopt the server's truth.
    if (error instanceof ApiClientError && error.status === 409) void client.invalidateQueries({ queryKey: queryKeys.timer })
  }
  const command = () => ({ commandId: crypto.randomUUID(), expectedVersion: current?.version ?? 1 })

  const start = useMutation({
    mutationFn: (input: Omit<StartTimerInput, 'commandId'>) => api.timer.start({ ...input, commandId: crypto.randomUUID() }),
    onSuccess: (next) => {
      settle(next)
      invalidateStudyData(client)
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
    onSuccess: () => {
      settle(null)
      invalidateStudyData(client)
    },
    onError: onConflict,
  })

  return {
    timer: current,
    isLoading: timer.isPending,
    start,
    pause,
    resume,
    update,
    stop,
    busy: start.isPending || pause.isPending || resume.isPending || stop.isPending,
  }
}
