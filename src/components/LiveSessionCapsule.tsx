import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../app/api'
import { appRoutes } from '../app/navigation/routes'
import { queryKeys } from '../app/session'
import { elapsedSecondsOf, useNow } from '../features/study/useStudyTimer'
import { formatClock } from '../shared/lib/format'
import { cn } from '../shared/lib/utils'
import ClockText from './ClockText'

/**
 * A running session stays one tap away on every page: a capsule in the
 * header on desktop and floating above the tab bar on phones.
 */
export default function LiveSessionCapsule({ className }: { className?: string }) {
  const timer = useQuery({ queryKey: queryKeys.timer, queryFn: api.timer.get }).data
  const running = timer?.timerStatus === 'running'
  const now = useNow(timer ? (running ? 1000 : null) : null)
  if (!timer) return null
  return (
    <Link
      to={appRoutes.focus}
      viewTransition
      className={cn('live-capsule', !running && 'is-paused', className)}
      aria-label={`جلسهٔ ${timer.subjectName}${running ? ' در جریان است' : ' متوقف است'}؛ رفتن به اتاق تمرکز`}
    >
      <span aria-hidden className="live-dot" />
      <span className="max-w-[7rem] truncate">{timer.subjectName}</span>
      <ClockText value={formatClock(elapsedSecondsOf(timer, now))} ticking={running} className="text-base opacity-95" />
    </Link>
  )
}
