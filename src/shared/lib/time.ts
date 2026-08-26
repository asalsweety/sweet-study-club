type TimerState = {
  timer_status: 'running' | 'paused'
  current_segment_started_at: string | null
  accumulated_seconds: number
}

type ScheduledWindow = {
  starts_at: string
  ends_at: string
}

function finiteSeconds(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
}

export function formatTimer(totalSeconds: number) {
  const safeSeconds = finiteSeconds(totalSeconds)
  const hours = String(Math.floor(safeSeconds / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((safeSeconds % 3600) / 60)).padStart(2, '0')
  const seconds = String(safeSeconds % 60).padStart(2, '0')

  return `${hours}:${minutes}:${seconds}`
}

export function calculateElapsed(
  state: TimerState | null,
  nowMilliseconds = Date.now(),
) {
  if (!state) return 0

  const accumulatedSeconds = finiteSeconds(state.accumulated_seconds)

  if (
    state.timer_status !== 'running' ||
    !state.current_segment_started_at
  ) {
    return accumulatedSeconds
  }

  const segmentStartedAt = Date.parse(state.current_segment_started_at)

  if (!Number.isFinite(segmentStartedAt)) {
    return accumulatedSeconds
  }

  const currentSegmentSeconds = finiteSeconds(
    (nowMilliseconds - segmentStartedAt) / 1000,
  )

  return accumulatedSeconds + currentSegmentSeconds
}

export function findActiveScheduledSession<T extends ScheduledWindow>(
  sessions: readonly T[],
  nowMilliseconds = Date.now(),
) {
  return sessions.find((session) => {
    const startsAt = Date.parse(session.starts_at)
    const endsAt = Date.parse(session.ends_at)

    return (
      Number.isFinite(startsAt) &&
      Number.isFinite(endsAt) &&
      startsAt <= nowMilliseconds &&
      endsAt > nowMilliseconds
    )
  })
}

export function dateInTehran(nowMilliseconds = Date.now()) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(nowMilliseconds))

  const values = new Map(parts.map((part) => [part.type, part.value]))

  return `${values.get('year')}-${values.get('month')}-${values.get('day')}`
}
