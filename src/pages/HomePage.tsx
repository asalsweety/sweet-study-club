import { useQuery } from '@tanstack/react-query'
import { Flame, GraduationCap, Megaphone, Play, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { api } from '../app/api'
import { queryKeys, useSettings } from '../app/session'
import type { UserProfile } from '../shared/api/profile'
import { daysUntil, fa, formatDuration, greeting, jalaliDay, weekdayName } from '../shared/lib/format'
import { tehranClock } from '../shared/lib/tehran'
import GoalRing from '../components/GoalRing'
import { Button } from '../components/ui/button'
import ActiveTimerCard from '../features/study/ActiveTimerCard'
import FinishSessionSheet from '../features/study/FinishSessionSheet'
import StartStudySheet from '../features/study/StartStudySheet'
import TodayParts from '../features/study/TodayParts'
import { useNow, useStudyTimer } from '../features/study/useStudyTimer'

function StatTile({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string | undefined }) {
  return (
    <div className="glass flex items-center gap-3 rounded-3xl p-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-lg font-black">{value}</p>
        {hint && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}
      </div>
    </div>
  )
}

export default function HomePage({ profile }: { profile: UserProfile }) {
  const now = useNow(30_000)
  const today = tehranClock(now).date
  const timer = useStudyTimer()
  const settings = useSettings()
  const schedule = useQuery({ queryKey: queryKeys.schedule(today), queryFn: () => api.schedule.day(today) })
  const progress = useQuery({ queryKey: queryKeys.progress('day'), queryFn: () => api.progress.period('day') })
  const gamification = useQuery({ queryKey: queryKeys.gamification, queryFn: api.progress.gamification })
  const broadcasts = useQuery({ queryKey: queryKeys.broadcasts, queryFn: api.shop.broadcasts, staleTime: 5 * 60_000 })
  const [starting, setStarting] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const openPart =
    schedule.data?.sessions.find((s) => !s.isCancelled && now >= Date.parse(s.startsAt) && now < Date.parse(s.endsAt)) ?? null
  const todaySeconds = progress.data?.today.seconds ?? 0
  const goalMinutes = progress.data?.today.goalMinutes ?? settings.data?.dailyGoalMinutes ?? 240
  const konkur = settings.data?.konkurDate ? daysUntil(settings.data.konkurDate, now) : null
  const level = gamification.data?.level

  return (
    <div className="flex flex-col gap-5">
      <section className="rise flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">
            {weekdayName(today)}، {jalaliDay(today)}
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            {greeting()}، <span className="text-gradient">{profile.displayName}</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {todaySeconds > 0 ? `امروز ${formatDuration(todaySeconds)} درس خواندی. ادامه بده!` : 'امروز هنوز شروع نکردی؛ با یک جلسه‌ی کوتاه شروع کن.'}
          </p>
        </div>
        <GoalRing value={goalMinutes === 0 ? 1 : todaySeconds / (goalMinutes * 60)} label="پیشرفت هدف امروز">
          <div>
            <p className="text-2xl font-black tabular-nums">{fa(Math.floor(todaySeconds / 60))}</p>
            <p className="text-[11px] text-muted-foreground">از {fa(goalMinutes)} دقیقه</p>
          </div>
        </GoalRing>
      </section>

      {toast && (
        <p role="status" className="rise rounded-2xl bg-[var(--success-soft)] px-4 py-3 text-sm font-bold text-[var(--success-text)]">
          {toast}
        </p>
      )}

      {broadcasts.data?.slice(0, 1).map((item) => (
        <aside key={item.id} className="rise flex items-start gap-3 rounded-3xl border border-[var(--warning)]/40 bg-[var(--warning-soft)] p-4">
          <Megaphone size={18} className="mt-0.5 shrink-0 text-[var(--warning-text)]" />
          <div>
            <p className="font-bold text-[var(--warning-text)]">{item.title}</p>
            <p className="text-sm leading-7 text-foreground/80">{item.body}</p>
          </div>
        </aside>
      ))}

      {timer.timer ? (
        <ActiveTimerCard timer={timer} onStop={() => setFinishing(true)} />
      ) : (
        <section className="glass rise relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
          <div aria-hidden className="absolute -top-20 -left-10 size-56 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">آماده‌ی تمرکز؟</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {openPart ? `${openPart.title} همین الان باز است.` : 'مطالعه‌ی آزاد یا پومودورو را شروع کن.'}
              </p>
            </div>
            <Button size="lg" onClick={() => setStarting(true)} className="h-12 rounded-2xl bg-[image:var(--primary-gradient)] px-6 text-base font-black shadow-lg shadow-primary/30">
              <Play /> شروع مطالعه
            </Button>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile icon={<Flame size={20} />} label="زنجیره‌ی روزها" value={`${fa(progress.data?.streak.current ?? 0)} روز`} hint={`بهترین: ${fa(progress.data?.streak.best ?? 0)} روز`} />
        <StatTile
          icon={<Sparkles size={20} />}
          label="سطح"
          value={level ? `سطح ${fa(level.level)}` : '—'}
          hint={level ? `${fa(level.experience)} XP · ${fa(Math.round(level.progress * 100))}٪ تا سطح بعد` : undefined}
        />
        <StatTile
          icon={<GraduationCap size={20} />}
          label="تا کنکور"
          value={konkur === null ? 'تاریخ را تنظیم کن' : konkur > 0 ? `${fa(konkur)} روز` : 'روز موعود 🎓'}
          hint={konkur === null ? 'از صفحه‌ی «من»' : undefined}
        />
      </section>

      <TodayParts schedule={schedule.data} now={now} activeSessionId={timer.timer?.sessionId ?? null} />

      <StartStudySheet key={openPart?.id ?? 'free'} open={starting} onOpenChange={setStarting} openPart={openPart} timer={timer} onStarted={() => setStarting(false)} />
      <FinishSessionSheet
        open={finishing}
        onOpenChange={setFinishing}
        timer={timer}
        onFinished={(summary) => {
          setFinishing(false)
          setToast(summary)
        }}
      />
    </div>
  )
}
