import { CalendarClock, PartyPopper } from 'lucide-react'
import type { DaySchedule } from '../../shared/api/schedule'
import { clockTime } from '../../shared/lib/format'
import { cn } from '../../shared/lib/utils'
import { Button } from '../../components/ui/button'

type TodayPartsProps = {
  schedule: DaySchedule | undefined
  now: number
  activeSessionId: string | null
  onStart?: (() => void) | undefined
}

export default function TodayParts({ schedule, now, activeSessionId, onStart }: TodayPartsProps) {
  if (!schedule) return <div className="skeleton h-64 rounded-2xl" />

  return (
    <section className="glass rise rounded-2xl p-5 sm:p-6">
      <header className="mb-4 flex items-center gap-2">
        <CalendarClock size={19} className="text-primary" />
        <h2 className="text-lg font-bold">برنامهٔ باشگاه امروز</h2>
      </header>

      {schedule.isHoliday ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-[var(--warning-soft)] p-6 text-center">
          <PartyPopper className="text-[var(--warning-text)]" />
          <p className="font-bold text-[var(--warning-text)]">امروز تعطیل است</p>
          {schedule.holidayNote && <p className="text-sm text-muted-foreground">{schedule.holidayNote}</p>}
        </div>
      ) : schedule.sessions.length === 0 ? (
        <div className="rounded-xl bg-muted/40 px-5 py-8 text-center"><p className="text-sm font-bold">امروز با ریتم خودت پیش برو.</p><p className="mt-2 text-xs leading-7 text-muted-foreground">جلسهٔ گروهی نداریم؛ می‌توانی مطالعهٔ آزاد یا پومودورو را شروع کنی.</p>{onStart && <Button variant="outline" className="mt-4" onClick={onStart}>شروع یک جلسه</Button>}</div>
      ) : (
        <ol className="relative flex flex-col gap-2 before:absolute before:inset-y-3 before:right-[0.9rem] before:w-px before:bg-border">
          {schedule.sessions.map((session) => {
            const start = Date.parse(session.startsAt)
            const end = Date.parse(session.endsAt)
            const state = session.isCancelled ? 'cancelled' : now >= end ? 'past' : now >= start ? 'open' : 'upcoming'
            const progress = state === 'open' ? (now - start) / (end - start) : state === 'past' ? 1 : 0
            return (
              <li key={session.id} className="relative flex items-center gap-3 pr-9">
                <span
                  aria-hidden
                  className={cn(
                    'absolute right-2 size-3.5 rounded-full border-2 border-card',
                    state === 'open' && 'bg-primary ring-4 ring-primary/25 motion-safe:animate-pulse',
                    state === 'past' && 'bg-[var(--success)]',
                    state === 'upcoming' && 'bg-muted-foreground/40',
                    state === 'cancelled' && 'bg-destructive/50',
                  )}
                />
                <div
                  className={cn(
                    'relative flex flex-1 flex-wrap items-center justify-between gap-3 overflow-hidden rounded-2xl px-4 py-3 transition-colors',
                    state === 'open' ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-muted/40',
                    (state === 'past' || state === 'cancelled') && 'opacity-70',
                  )}
                >
                  <div className="relative min-w-0">
                    <p className={cn('font-bold', state === 'cancelled' && 'line-through')}>{session.title}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">
                      {clockTime(session.startsAt)} – {clockTime(session.endsAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-muted-foreground">
                    {session.id === activeSessionId
                      ? 'در حال مطالعه'
                      : state === 'open'
                        ? 'الان باز است'
                        : state === 'past'
                          ? 'تمام شد'
                          : state === 'cancelled'
                            ? 'لغو شد'
                            : 'به‌زودی'}
                  </span>
                  {state === 'open' && onStart && <Button size="sm" onClick={onStart}>شروع</Button>}
                  {state === 'open' && (
                    <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-primary/20">
                      <span className="block h-full bg-primary" style={{ width: `${Math.round(progress * 100)}%` }} />
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
