import { useQuery } from '@tanstack/react-query'
import { Medal } from 'lucide-react'
import { api } from '../../app/api'
import { queryKeys } from '../../app/session'
import { fa, jalaliShort } from '../../shared/lib/format'
import { cn } from '../../shared/lib/utils'

const tierRing = {
  bronze: 'from-amber-700/30 to-amber-500/10',
  silver: 'from-slate-400/40 to-slate-200/10',
  gold: 'from-yellow-400/50 to-amber-200/10',
  special: 'from-pink-400/50 to-violet-300/20',
}

export default function BadgesPanel() {
  const data = useQuery({ queryKey: queryKeys.gamification, queryFn: api.progress.gamification }).data
  if (!data) return <div className="skeleton h-72 rounded-[2rem]" />
  const earned = data.badges.filter((badge) => badge.earned).length

  return (
    <section className="glass rise flex flex-col gap-4 rounded-[2rem] p-5 sm:p-6">
      <header className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-black"><Medal size={19} className="text-primary" /> نشان‌ها</h2>
        <span className="text-sm font-bold text-muted-foreground">{fa(earned)} از {fa(data.badges.length)}</span>
      </header>

      <div className="rounded-3xl bg-[image:var(--primary-gradient)] p-4 text-primary-foreground shadow-lg shadow-primary/25">
        <div className="flex items-end justify-between">
          <p className="text-3xl font-black">سطح {fa(data.level.level)}</p>
          <p className="text-sm opacity-80">{fa(data.level.experience)} XP</p>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-white transition-all duration-1000" style={{ width: `${Math.round(data.level.progress * 100)}%` }} />
        </div>
        <p className="mt-2 text-xs opacity-80">{fa(Math.max(0, data.level.nextLevelAt - data.level.experience))} XP تا سطح بعد · هر دقیقه ۱ XP، هر تست درست ۲ XP</p>
      </div>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {data.badges.map((badge) => (
          <li
            key={badge.id}
            className={cn(
              'relative flex flex-col items-center gap-1 rounded-2xl bg-gradient-to-b p-3 text-center transition',
              badge.earned ? tierRing[badge.tier] : 'from-muted to-muted/40 opacity-55 grayscale',
            )}
            title={badge.description}
          >
            <span className="text-3xl" aria-hidden>{badge.emoji}</span>
            <span className="text-xs font-black">{badge.title}</span>
            <span className="text-[10px] text-muted-foreground">{badge.earned && badge.awardedAt ? jalaliShort(badge.awardedAt.slice(0, 10)) : badge.description}</span>
            {badge.earned && !badge.seen && <span className="absolute top-2 left-2 size-2 rounded-full bg-primary motion-safe:animate-ping" aria-label="جدید" />}
          </li>
        ))}
      </ul>
    </section>
  )
}
