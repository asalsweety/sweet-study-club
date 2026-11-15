import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BookOpen, CalendarDays, Flame, GraduationCap, Megaphone, Play, Sparkles, Target, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../app/api'
import { appRoutes } from '../app/navigation/routes'
import { queryKeys, useSettings } from '../app/session'
import type { UserProfile } from '../shared/api/profile'
import { daysUntil, fa, formatDuration, greeting, jalaliDay, weekdayName } from '../shared/lib/format'
import { examForProfile } from '../shared/lib/education'
import { tehranClock } from '../shared/lib/tehran'
import { cn } from '../shared/lib/utils'
import AnimatedNumber from '../components/AnimatedNumber'
import GoalRing from '../components/GoalRing'
import PageHeading from '../components/PageHeading'
import QueryError from '../components/QueryError'
import { Button } from '../components/ui/button'
import ActiveTimerCard from '../features/study/ActiveTimerCard'
import FinishSessionSheet from '../features/study/FinishSessionSheet'
import StartStudySheet from '../features/study/StartStudySheet'
import TodayParts from '../features/study/TodayParts'
import { LiveNowStrip } from '../features/social/LiveNow'
import { useNow, useStudyTimer } from '../features/study/useStudyTimer'

function WeekChart({ today }: { today: string }) {
  const week = useQuery({ queryKey: queryKeys.progress('week'), queryFn: () => api.progress.period('week') })
  if (week.isError) return <QueryError error={week.error} retry={() => void week.refetch()} />
  const days = week.data?.current.byDay ?? []
  const max = Math.max(1, ...days.map((day) => day.seconds))
  const change = week.data?.change.totalSeconds ?? null
  return <section className="surface flex flex-col gap-5 p-6" aria-label="مطالعۀ این هفته">
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="text-sm font-bold">این هفته</h2><p className="mt-1 text-2xl font-extrabold">{week.data ? formatDuration(week.data.current.totalSeconds) : '—'}</p></div>
      {change !== null && <span className={cn('flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold', change >= 0 ? 'bg-[var(--success-soft)] text-[var(--success-text)]' : 'bg-muted text-muted-foreground')}><TrendingUp size={13} className={change < 0 ? 'rotate-180' : ''} />{fa(Math.abs(Math.round(change)))}٪</span>}
    </div>
    <div className="flex h-36 items-end gap-2" role="img" aria-label="نمودار مطالعۀ روزهای این هفته">
      {week.isPending ? Array.from({ length: 7 }, (_, index) => <div key={index} className="skeleton flex-1 rounded-xl" style={{ height: `${30 + (index % 3) * 20}%` }} />) : days.map((day, index) => {
        const isToday = day.date === today
        const future = day.date > today
        return <div key={day.date} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
          <span className="text-[0.65rem] font-bold text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">{day.seconds ? fa(Math.round(day.seconds / 60)) : ''}</span>
          <div className={cn('grow-bar w-full max-w-9 rounded-xl', isToday ? 'bg-[linear-gradient(180deg,var(--chart-4),var(--primary))] shadow-[var(--glow-primary)]' : future ? 'bg-muted/60' : 'bg-primary/25')} style={{ height: `${Math.max(future ? 4 : 6, (day.seconds / max) * 100)}%`, animationDelay: `${index * 60}ms` }} title={`${weekdayName(day.date)}: ${formatDuration(day.seconds)}`} />
          <span className={cn('text-[0.65rem]', isToday ? 'font-bold text-primary' : 'text-muted-foreground')}>{weekdayName(day.date).slice(0, 1)}</span>
        </div>
      })}
    </div>
  </section>
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
  const [params, setParams] = useSearchParams()
  const [starting, setStarting] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const openPart = schedule.data?.sessions.find((s) => !s.isCancelled && now >= Date.parse(s.startsAt) && now < Date.parse(s.endsAt)) ?? null
  const todaySeconds = progress.data?.today.seconds ?? 0
  const goalMinutes = progress.data?.today.goalMinutes ?? settings.data?.dailyGoalMinutes ?? 240
  const goalShare = goalMinutes > 0 ? todaySeconds / (goalMinutes * 60) : 0
  const examName = examForProfile(settings.data?.educationGroup, settings.data?.educationStage)
  const konkur = examName && settings.data?.konkurDate ? daysUntil(settings.data.konkurDate, now) : null
  const level = gamification.data?.level

  // The command palette and the PWA shortcut open the start sheet with ?start=1.
  useEffect(() => {
    if (params.get('start') !== '1' || timer.isLoading) return
    if (!timer.timer) setStarting(true)
    setParams((current) => { current.delete('start'); return current }, { replace: true })
  }, [params, setParams, timer.isLoading, timer.timer])

  const metrics: Array<{ icon: typeof Flame; title: string; value: number | undefined; unit: string; prefix?: string; hint: string; tone: string; progress?: number | undefined; countdown?: boolean }> = [
    { icon: Flame, title: 'روزهای پیوسته', value: progress.data?.streak.current, unit: 'روز', hint: progress.data ? `رکورد: ${fa(progress.data.streak.best)} روز` : 'قدم‌به‌قدم، یک عادت تازه', tone: 'text-[var(--chart-5)]' },
    { icon: Sparkles, title: 'سطح مطالعه', value: level?.level, unit: '', prefix: 'سطح ', hint: level ? `${fa(level.experience)} امتیاز تجربه` : 'با هر جلسه پیش برو', tone: 'text-[var(--chart-4)]', progress: level?.progress },
    ...(examName ? [{ icon: GraduationCap, title: `تا ${examName}`, value: konkur !== null && konkur > 0 ? konkur : undefined, unit: 'روز', hint: 'مسیر خودت را دنبال کن', tone: 'text-[var(--chart-2)]', countdown: true }] : [{ icon: Target, title: 'هدف روزانه', value: goalMinutes, unit: 'دقیقه', hint: 'از تنظیمات قابل تغییر است', tone: 'text-[var(--chart-2)]', countdown: false }]),
  ]

  return <div className="grid gap-7">
    <PageHeading eyebrow={`${weekdayName(today)}، ${jalaliDay(today)}`} title={`${greeting()}، ${profile.displayName}`} description={todaySeconds > 0 ? `امروز ${formatDuration(todaySeconds)} برای هدفت وقت گذاشتی. قدم بعدی با تو.` : 'یک نفس عمیق. یک قدم کوچک. امروز از همین‌جا شروع می‌شود.'} />
    {timer.error && <QueryError error={timer.error} retry={() => void timer.refetch()} />}
    <div className="today-grid">
      <div className="min-w-0 [grid-area:hero]">{timer.isLoading ? <div className="skeleton min-h-64 rounded-[1.75rem]" aria-label="در حال بررسی جلسۀ فعال" /> : timer.timer ? <ActiveTimerCard timer={timer} onStop={() => setFinishing(true)} /> : <section className="hero-card flex min-h-64 flex-col justify-between gap-8 p-6 sm:p-9">
        <div aria-hidden className="orb -left-10 -top-16 size-48 bg-primary/25" />
        <div aria-hidden className="orb -bottom-20 left-1/3 size-40 bg-[var(--chart-4)]/20 [animation-delay:-4s]" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow flex items-center gap-2">{openPart ? <><span className="live-dot text-primary" />پارت باشگاه باز است</> : 'وقتِ یک شروع تازه'}</p>
            <h2 className="mt-3 text-3xl font-extrabold leading-snug tracking-tight sm:text-4xl">فقط تو و<br className="sm:hidden" /> قدم بعدی.</h2>
            <p className="mt-3 max-w-md text-sm leading-8 text-muted-foreground">{openPart ? `پارت «${openPart.title}» الان باز است؛ می‌توانی همین حالا با بقیۀ اعضا شروع کنی.` : 'یک درس انتخاب کن، زمان را به ما بسپار و با ریتم خودت پیش برو.'}</p>
          </div>
          <span className="hidden size-14 shrink-0 place-items-center rounded-2xl border border-primary/20 bg-card/60 text-primary backdrop-blur [animation:float-y_6s_var(--ease-in-out)_infinite] sm:grid"><Sparkles size={24} strokeWidth={1.6} /></span>
        </div>
        <div className="relative flex flex-wrap items-center gap-4">
          <Button size="lg" disabled={Boolean(timer.error)} onClick={() => setStarting(true)} className="h-14 rounded-2xl px-7 text-base"><Play size={18} className="fill-current" />شروع مطالعه<ArrowLeft size={16} /></Button>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">{['آزاد', 'پومودورو', 'پارت‌های روزانه'].map((mode) => <span key={mode} className="rounded-full border border-border bg-card/60 px-3 py-1.5 backdrop-blur">{mode}</span>)}</div>
        </div>
      </section>}</div>
      <section className="surface relative flex flex-col items-center justify-center gap-4 overflow-hidden p-6 [grid-area:goal]">
        <div className="flex w-full items-center justify-between"><h2 className="text-sm font-bold">هدف امروز</h2><Target size={17} className="text-muted-foreground" /></div>
        {progress.isError ? <QueryError error={progress.error} retry={() => void progress.refetch()} /> : progress.isPending ? <div className="skeleton size-[152px] rounded-full" /> : <GoalRing value={goalShare} label="پیشرفت هدف امروز"><div><p className="text-4xl font-extrabold"><AnimatedNumber value={Math.floor(todaySeconds / 60)} /></p><p className="mt-1 text-xs text-muted-foreground">دقیقه مطالعه</p></div></GoalRing>}
        {goalShare >= 1 ? <p className="rounded-full bg-[var(--success-soft)] px-3 py-1 text-xs font-bold text-[var(--success-text)] [animation:pop-in_500ms_var(--ease-spring)_backwards]">🎉 هدف امروز کامل شد</p> : <Link to={`${appRoutes.profile}?section=settings`} viewTransition className="text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline">{goalMinutes > 0 ? `${fa(Math.round(goalShare * 100))}٪ از ${fa(goalMinutes)} دقیقه · تغییر هدف` : 'تعیین هدف روزانه'}</Link>}
      </section>
    <section aria-label="نگاهی به مسیر تو" className="grid grid-cols-1 gap-3 [grid-area:metrics] sm:grid-cols-3">
      {metrics.map(({ icon: Icon, title, value, unit, prefix, hint, tone, progress: share, countdown }) => <div key={title} className="surface lift relative overflow-hidden p-5">
        <p className="flex items-center gap-2 text-xs text-muted-foreground"><span className={cn('grid size-8 place-items-center rounded-xl bg-muted', tone)}><Icon size={16} /></span>{title}</p>
        <p className="mt-4 text-2xl font-extrabold">{value === undefined ? (countdown ? <Link to={`${appRoutes.profile}?section=settings`} viewTransition className="text-sm text-primary underline underline-offset-4">تعیین تاریخ</Link> : '—') : <>{prefix}<AnimatedNumber value={value} /> {unit && <span className="text-sm font-semibold text-muted-foreground">{unit}</span>}</>}</p>
        <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
        {share !== undefined && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-[var(--chart-4)] transition-[width] duration-1000 ease-out" style={{ width: `${Math.round(share * 100)}%` }} /></div>}
      </div>)}
    </section>
      <div className="min-w-0 [grid-area:parts]">{schedule.isError ? <QueryError error={schedule.error} retry={() => void schedule.refetch()} /> : <TodayParts schedule={schedule.data} now={now} activeSessionId={timer.timer?.sessionId ?? null} onStart={timer.timer || timer.isLoading || timer.error ? undefined : () => setStarting(true)} />}</div>
        <div className="min-w-0 [grid-area:week]"><WeekChart today={today} /></div>
        <LiveNowStrip className="[grid-area:live]" />
        <section className="surface px-5 py-4 [grid-area:links]"><h2 className="mb-1 pt-2 text-base font-bold">قدم بعدی تو</h2>{[{ to: appRoutes.planner, icon: CalendarDays, title: 'روزت را بچین', hint: 'یک برنامۀ سبک و قابل انجام' }, { to: appRoutes.learning, icon: BookOpen, title: 'چیزی تازه یاد بگیر', hint: 'تمرین و مرور، کنار هم' }].map(({ to, icon: Icon, title, hint }) => <Link key={to} to={to} viewTransition className="quick-link group"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary transition-transform duration-300 group-hover:scale-110"><Icon size={19} strokeWidth={1.8} /></span><div className="flex-1"><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs leading-6 text-muted-foreground">{hint}</p></div><ArrowLeft size={15} className="transition-transform duration-300 group-hover:-translate-x-1" /></Link>)}</section>
    </div>
    {broadcasts.data?.slice(0, 1).map((item) => <aside key={item.id} className="surface flex items-start gap-3 p-5"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"><Megaphone size={18} /></span><div><p className="text-sm font-bold">{item.title}</p><p className="mt-1 text-sm leading-7 text-muted-foreground">{item.body}</p></div></aside>)}
    <StartStudySheet key={openPart?.id ?? 'free'} open={starting} onOpenChange={setStarting} openPart={openPart} timer={timer} onStarted={() => setStarting(false)} />
    <FinishSessionSheet open={finishing} onOpenChange={setFinishing} timer={timer} onFinished={() => setFinishing(false)} />
  </div>
}
