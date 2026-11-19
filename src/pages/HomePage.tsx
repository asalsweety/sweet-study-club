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
import StudySticker from '../components/StudySticker'
import { Button } from '../components/ui/button'
import StudyHelper from '../features/helper/StudyHelper'
import ActiveTimerCard from '../features/study/ActiveTimerCard'
import FinishSessionSheet from '../features/study/FinishSessionSheet'
import StartStudySheet from '../features/study/StartStudySheet'
import TodayParts from '../features/study/TodayParts'
import { LiveNowStrip } from '../features/social/LiveNow'
import { useNow, useStudyTimer } from '../features/study/useStudyTimer'
import './HomePage.css'

function WeekChart({ today }: { today: string }) {
  const week = useQuery({ queryKey: queryKeys.progress('week'), queryFn: () => api.progress.period('week') })
  if (week.isError) return <QueryError error={week.error} retry={() => void week.refetch()} />
  const days = week.data?.current.byDay ?? []
  const max = Math.max(1, ...days.map((day) => day.seconds))
  const change = week.data?.change.totalSeconds ?? null
  return <section className="surface flex flex-col gap-4 p-4 sm:p-5" aria-label="مطالعۀ این هفته">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-sm font-bold">این هفته</h2>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="text-xl font-extrabold sm:text-2xl">{week.data ? formatDuration(week.data.current.totalSeconds) : '—'}</p>
          {change !== null && <span className={cn('flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold', change >= 0 ? 'bg-[var(--success-soft)] text-[var(--success-text)]' : 'bg-muted text-muted-foreground')}><TrendingUp size={13} className={change < 0 ? 'rotate-180' : ''} />{fa(Math.abs(Math.round(change)))}٪</span>}
        </div>
      </div>
      <StudySticker kind="bee" className="size-9 shrink-0 sm:size-11" />
    </div>
    <div className="flex h-28 items-end gap-2 sm:h-32" role="img" aria-label="نمودار مطالعۀ روزهای این هفته">
      {week.isPending ? Array.from({ length: 7 }, (_, index) => <div key={index} className="skeleton flex-1 rounded-xl" style={{ height: `${30 + (index % 3) * 20}%` }} />) : days.map((day, index) => {
        const isToday = day.date === today
        const future = day.date > today
        return <div key={day.date} className="group flex h-full min-w-0 flex-1 flex-col items-center gap-2">
          <span className="h-4 shrink-0 text-[0.65rem] font-bold text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">{day.seconds ? fa(Math.round(day.seconds / 60)) : ''}</span>
          <div className="flex min-h-0 w-full flex-1 items-end justify-center">
            <div className={cn('grow-bar w-3/4 max-w-16 rounded-md', isToday ? 'bg-primary' : future ? 'bg-muted/60' : 'bg-primary/25')} style={{ height: `${Math.max(future ? 4 : 6, (day.seconds / max) * 100)}%`, animationDelay: `${index * 60}ms` }} title={`${weekdayName(day.date)}: ${formatDuration(day.seconds)}`} />
          </div>
          <span className={cn('text-[0.65rem]', isToday ? 'font-bold text-primary' : 'text-muted-foreground')}>
            <span className="xl:hidden">{weekdayName(day.date).slice(0, 1)}</span>
            <span className="hidden xl:inline">{weekdayName(day.date)}</span>
          </span>
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

  return <div className="today-page grid gap-5">
    <PageHeading
      eyebrow={`${weekdayName(today)}، ${jalaliDay(today)}`}
      title={`${greeting()}، ${profile.displayName}`}
      description={todaySeconds > 0 ? `امروز ${formatDuration(todaySeconds)} برای هدفت وقت گذاشتی. قدم بعدی با تو.` : 'یک نفس عمیق. یک قدم کوچک. امروز از همین‌جا شروع می‌شود.'}
      action={!timer.timer && <StudyHelper inline />}
    />
    {timer.error && <QueryError error={timer.error} retry={() => void timer.refetch()} />}
    <div className="today-grid today-dashboard">
      <div className={cn('min-w-0 [grid-area:hero]', timer.timer && 'today-active-timer')}>{timer.isLoading ? <div className="skeleton min-h-52 rounded-2xl" aria-label="در حال بررسی جلسۀ فعال" /> : timer.timer ? <ActiveTimerCard timer={timer} onStop={() => setFinishing(true)} /> : <section className="surface flex h-full flex-col justify-center gap-5 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow flex items-center gap-2">{openPart ? <><span className="live-dot text-primary" />پارت باشگاه باز است</> : 'وقتِ یک شروع تازه'}</p>
            <h2 className="mt-1 text-2xl font-extrabold leading-snug tracking-tight sm:text-3xl">فقط تو و قدم بعدی.</h2>
            <p className="mt-2 max-w-lg text-sm leading-7 text-muted-foreground">{openPart ? `در «${openPart.title}» با بقیۀ اعضا درس بخوان.` : 'یک درس انتخاب کن و با ریتم خودت پیش برو.'}</p>
          </div>
          <StudySticker kind="books" className="size-11 shrink-0 sm:size-14" />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button size="lg" disabled={Boolean(timer.error)} onClick={() => setStarting(true)} className="w-full rounded-2xl sm:w-auto"><Play size={18} className="fill-current" />شروع مطالعه<ArrowLeft size={16} /></Button>
          <p className="text-xs leading-6 text-muted-foreground">آزاد، پومودورو یا پارت‌های روزانه</p>
        </div>
      </section>}</div>
      <section className="surface grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 overflow-hidden p-4 [grid-area:goal] sm:flex sm:flex-col sm:justify-center sm:gap-2.5 sm:p-5">
        <div className="col-start-1 row-start-1 flex w-full items-center gap-2 self-end sm:justify-between sm:self-auto">
          <h2 className="text-sm font-bold">هدف امروز</h2>
          <Target size={17} className="shrink-0 text-muted-foreground" />
        </div>
        {progress.isError ? (
          <div className="col-span-2 w-full"><QueryError error={progress.error} retry={() => void progress.refetch()} /></div>
        ) : (
          <div className="col-start-2 row-span-2 row-start-1 w-24 sm:w-32">
            {progress.isPending ? <div className="skeleton aspect-square w-full rounded-full" /> : (
              <GoalRing value={goalShare} label="پیشرفت هدف امروز" size={128} stroke={10}>
                <div>
                  <p className="text-2xl font-extrabold sm:text-3xl"><AnimatedNumber value={Math.floor(todaySeconds / 60)} /></p>
                  <p className="mt-0.5 text-[0.625rem] text-muted-foreground sm:mt-1 sm:text-xs">دقیقه مطالعه</p>
                </div>
              </GoalRing>
            )}
          </div>
        )}
        <div className="col-start-1 row-start-2 self-start sm:self-auto">
          {goalShare >= 1 ? (
            <p className="rounded-full bg-[var(--success-soft)] px-3 py-1 text-xs font-bold text-[var(--success-text)] [animation:pop-in_500ms_var(--ease-spring)_backwards]">🎉 هدف امروز کامل شد</p>
          ) : (
            <Link to={`${appRoutes.profile}?section=settings`} viewTransition className="text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
              {goalMinutes > 0 ? `${fa(Math.round(goalShare * 100))}٪ از ${fa(goalMinutes)} دقیقه · تغییر هدف` : 'تعیین هدف روزانه'}
            </Link>
          )}
        </div>
      </section>
    <section aria-label="نگاهی به مسیر تو" className="grid grid-cols-3 gap-2 [grid-area:metrics] sm:gap-3">
      {metrics.map(({ icon: Icon, title, value, unit, prefix, hint, tone, progress: share, countdown }) => <div key={title} className="surface min-w-0 overflow-hidden p-2.5 sm:p-4">
        <p className="flex flex-col items-start gap-1.5 text-xs leading-5 text-muted-foreground sm:flex-row sm:items-center sm:gap-2"><span className={cn('grid size-7 shrink-0 place-items-center rounded-lg bg-muted', tone)}><Icon size={15} /></span>{title}</p>
        <p className="mt-1.5 text-base leading-6 font-extrabold sm:text-xl">{value === undefined ? (countdown ? <Link to={`${appRoutes.profile}?section=settings`} viewTransition className="text-xs text-primary underline underline-offset-4 sm:text-sm">تعیین تاریخ</Link> : '—') : <>{prefix}<AnimatedNumber value={value} /> {unit && <span className="text-xs font-semibold text-muted-foreground">{unit}</span>}</>}</p>
        <p className="mt-0.5 text-[0.6875rem] leading-5 text-muted-foreground sm:text-xs">{hint}</p>
        {share !== undefined && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-[var(--chart-4)] transition-[width] duration-1000 ease-out" style={{ width: `${Math.round(share * 100)}%` }} /></div>}
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
