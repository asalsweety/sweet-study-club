import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Radio } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../../app/api'
import { queryKeys } from '../../app/session'
import { appRoutes } from '../../app/navigation/routes'
import Avatar from '../../components/Avatar'
import { fa, formatDuration } from '../../shared/lib/format'
import { cn } from '../../shared/lib/utils'

function useLiveFriends() {
  return useQuery({ queryKey: queryKeys.live('friends'), queryFn: () => api.social.live('friends'), refetchInterval: 45_000, staleTime: 20_000 })
}

/** Friends studying right now, shown on Today so live study is part of the timer flow. */
export function LiveNowStrip({ className }: { className?: string }) {
  const live = useLiveFriends()
  const studying = (live.data?.people ?? []).filter((person) => person.status === 'studying' || person.status === 'break')
  if (live.isPending || live.isError) return null
  return (
    <section aria-label="دوستانی که همین الان درس می‌خوانند" className={cn('surface flex items-center gap-4 overflow-hidden px-5 py-4', className)}>
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[var(--success-soft)] text-[var(--success-text)]"><Radio size={18} className="motion-safe:animate-pulse" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{studying.length ? `${fa(studying.length)} دوست همین الان در حال مطالعه` : 'مطالعۀ زنده'}</p>
        {studying.length ? (
          <ul className="snap-rail mt-2 flex gap-3 overflow-x-auto [scrollbar-width:none]">
            {studying.slice(0, 8).map((person) => (
              <li key={person.userId} className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-card py-1 pe-3 ps-1">
                <span className="relative"><Avatar name={person.displayName} url={person.avatarUrl} size="sm" /><span aria-hidden className="absolute -bottom-0.5 -left-0.5 size-3 rounded-full border-2 border-card bg-[var(--success)]" /></span>
                <span className="text-xs"><span className="font-bold">{person.displayName}</span>{person.subjectName && <span className="text-muted-foreground"> · {person.subjectName}</span>}<span className="text-muted-foreground"> · {formatDuration(person.elapsedSeconds)}</span></span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-1 text-xs text-muted-foreground">وقتی دوستانت جلسه شروع کنند، همین‌جا می‌بینی‌شان.</p>}
      </div>
      <Link to={appRoutes.friends} viewTransition className="flex shrink-0 items-center gap-1 rounded-xl px-2 py-2 text-xs font-bold text-primary hover:bg-secondary">همه<ArrowLeft size={14} /></Link>
    </section>
  )
}

/** Compact count for the focus room header. */
export function LiveNowPill({ className }: { className?: string }) {
  const live = useLiveFriends()
  const studying = (live.data?.people ?? []).filter((person) => person.status === 'studying' || person.status === 'break')
  if (!studying.length) return null
  return (
    <span className={className} title={studying.map((person) => person.displayName).join('، ')}>
      <span aria-hidden className="size-2 rounded-full bg-[#7ee2a8] motion-safe:animate-pulse" />
      {fa(studying.length)} دوست هم‌زمان با تو
    </span>
  )
}
