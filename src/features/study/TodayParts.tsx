import { PartyPopper } from 'lucide-react'
import type { DaySchedule } from '../../shared/api/schedule'
import { clockTime } from '../../shared/lib/format'
import { Button } from '../../components/ui/button'

type TodayPartsProps = {
  schedule: DaySchedule | undefined
  now: number
  activeSessionId: string | null
  onStart?: ((sessionId?: string) => void) | undefined
}

export default function TodayParts({ schedule, now, activeSessionId, onStart }: TodayPartsProps) {
  if (!schedule) return <div className="skeleton h-64 rounded-2xl" />
  return <section className="surface today-parts">
    <h2>برنامۀ باشگاه امروز</h2>
    {schedule.isHoliday ? (
      <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl bg-muted p-6"><PartyPopper /><p>امروز تعطیل است</p>{schedule.holidayNote && <p>{schedule.holidayNote}</p>}</div>
    ) : schedule.sessions.length === 0 ? (
      <div className="mt-4 rounded-xl bg-muted p-4 text-center">
        <p>جلسۀ گروهی نداریم.</p>{onStart && <Button variant="outline" className="mt-3" onClick={() => onStart()}>شروع یک جلسه</Button>}
      </div>
    ) : <ul className="mt-4 grid gap-3">
      {schedule.sessions.map(session => {
        const start = Date.parse(session.startsAt)
        const end = Date.parse(session.endsAt)
        const past = now >= end
        const open = !session.isCancelled && !past && now >= start
        const label = session.id === activeSessionId ? 'در حال مطالعه' : session.isCancelled ? 'لغو شد' : past ? 'تمام شد' : open ? 'الان باز است' : 'به‌زودی'
        return <li key={session.id} className="flex min-h-12 flex-wrap items-center justify-between gap-1 rounded-xl bg-muted px-3 py-2 text-xs">
          <div><strong>{session.title}</strong><p dir="ltr" className="text-muted-foreground">{clockTime(session.startsAt)} – {clockTime(session.endsAt)}</p></div>
          {open && onStart ? <Button size="sm" variant="secondary" aria-label={'شروع ' + session.title} onClick={() => onStart(session.id)}>شروع پارت</Button> : <span>{label}</span>}
          {open && <progress className="h-1 w-full accent-primary" aria-label={'پیشرفت ' + session.title} value={now - start} max={end - start} />}
        </li>
      })}
    </ul>}
  </section>
}
