import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BookOpen, CalendarDays, Clock3, Flame, GraduationCap, Megaphone, Target, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../app/api'
import { appRoutes } from '../app/navigation/routes'
import { queryKeys, useSettings } from '../app/session'
import type { UserProfile } from '../shared/api/profile'
import type { ProgressResponse } from '../shared/api/progress'
import { daysUntil, fa, formatDuration, greeting, jalaliDay, weekdayName } from '../shared/lib/format'
import { examForProfile } from '../shared/lib/education'
import { tehranClock } from '../shared/lib/tehran'
import GoalRing from '../components/GoalRing'
import PageHeading from '../components/PageHeading'
import QueryError from '../components/QueryError'
import ActiveTimerCard from '../features/study/ActiveTimerCard'
import FinishSessionSheet from '../features/study/FinishSessionSheet'
import StartStudySheet from '../features/study/StartStudySheet'
import TodayParts from '../features/study/TodayParts'
import TodayStudyRoom from '../features/focus/TodayStudyRoom'
import { LiveNowStrip } from '../features/social/LiveNow'
import { useNow, useStudyTimer } from '../features/study/useStudyTimer'
import './HomePage.css'

function WeekChart({ today, week }: { today: string; week: ProgressResponse | undefined }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const days = week?.current.byDay ?? []
  const max = Math.max(1, ...days.map(day => day.seconds))
  const change = week?.change.totalSeconds
  const selected = days.find(day => day.date === selectedDate)
  return <section className="surface today-week" aria-label="مطالعۀ این هفته">
    <img className="today-chart-bee" alt="" src="/images/figma/today-bee.webp" width={74} height={74} />
    <div><h2>مطالعۀ این هفته</h2><p className="text-xs text-muted-foreground">
      {week ? formatDuration(week.current.totalSeconds) : '—'}
      {change != null && ' · ' + (change === 0 ? 'برابر با هفتۀ قبل' : fa(Math.abs(Math.round(change))) + '٪ ' + (change > 0 ? 'بیشتر' : 'کمتر') + ' از هفتۀ قبل')}
    </p></div>
    <output className="text-xs text-muted-foreground">{selected && weekdayName(selected.date) + ' · ' + fa(Math.round(selected.seconds / 60)) + ' دقیقه'}</output>
    <div className="today-bars" role="group" aria-label="نمودار مطالعۀ روزهای این هفته">
      {days.map(day => <button type="button" className="today-bar-column" key={day.date} aria-pressed={day.date === selectedDate}
        aria-label={weekdayName(day.date) + ' · ' + fa(Math.round(day.seconds / 60)) + ' دقیقه'} onClick={() => setSelectedDate(day.date)}>
        <div className="today-bar-track"><div className="grow-bar" data-today={day.date === today || undefined} style={{ height: Math.max(3, day.seconds / max * 100) + '%' }} /></div>
        <span>{weekdayName(day.date)}</span>
      </button>)}
    </div>
  </section>
}

function Metric({ title, value, hint, progress, icon: Icon }: { title: string; value: string; hint?: string | undefined; progress?: number | undefined; icon: typeof Flame }) {
  return <div className="surface today-metric"><p><Icon size={15} />{title}</p><strong>{value}</strong>{hint && <small>{hint}</small>}
    {progress !== undefined && <progress className="h-1 w-full accent-primary" aria-label="پیشرفت تا سطح بعد" value={progress} max={1} />}
  </div>
}

export default function HomePage({ profile }: { profile: UserProfile }) {
  const now = useNow(30_000)
  const today = tehranClock(now).date
  const timer = useStudyTimer()
  const settings = useSettings()
  const schedule = useQuery({ queryKey: queryKeys.schedule(today), queryFn: () => api.schedule.day(today) })
  const progress = useQuery({ queryKey: queryKeys.progress('week'), queryFn: () => api.progress.period('week') })
  const gamification = useQuery({ queryKey: queryKeys.gamification, queryFn: api.progress.gamification })
  const broadcasts = useQuery({ queryKey: queryKeys.broadcasts, queryFn: api.shop.broadcasts, staleTime: 5 * 60_000 })
  const live = useQuery({ queryKey: queryKeys.live('friends'), queryFn: () => api.social.live('friends'), staleTime: 20_000 })
  const [params, setParams] = useSearchParams()
  const [starting, setStarting] = useState(false)
  const [startIntent, setStartIntent] = useState<'pomodoro' | 'pixel' | 'scheduled' | null>(null)
  const [selectedPartId, setSelectedPartId] = useState<string>()
  const [finishing, setFinishing] = useState(false)
  const openParts = schedule.data?.sessions.filter(s => !s.isCancelled && now >= Date.parse(s.startsAt) && now < Date.parse(s.endsAt)) ?? []
  const openPart = openParts[0] ?? null
  const sheetPart = selectedPartId ? openParts.find(s => s.id === selectedPartId) ?? null : openPart
  const todayMinutes = Math.floor((progress.data?.today.seconds ?? 0) / 60)
  const goalMinutes = progress.data?.today.goalMinutes ?? settings.data?.dailyGoalMinutes ?? 240
  const remaining = Math.max(0, goalMinutes - todayMinutes)
  const share = goalMinutes > 0 ? todayMinutes / goalMinutes : 0
  const goalValue = progress.data && goalMinutes > 0 ? fa(Math.round(share * 100)) + '٪' : '—'
  const goalHint = goalMinutes <= 0 ? 'تعیین هدف روزانه' : remaining ? fa(remaining) + ' دقیقه تا تکمیل هدف امروز' : 'هدف امروزت کامل شد'
  const streak = progress.data?.streak
  const level = gamification.data?.level
  const levelMetric = <Metric icon={GraduationCap} title="سطح مطالعه" value={level ? 'سطح ' + fa(level.level) : '—'}
    hint={level && fa(level.experience) + ' امتیاز تجربه'} progress={level?.progress} />
  const exam = examForProfile(settings.data?.educationGroup, settings.data?.educationStage)
  const examDays = settings.data?.konkurDate ? daysUntil(settings.data.konkurDate, now) : null
  const studying = live.data?.counts.studying
  const active = timer.timer
  useEffect(() => {
    const intent = params.get('start')
    if ((intent !== '1' && intent !== 'pomodoro' && intent !== 'pixel') || timer.isLoading) return
    if (!timer.timer) {
      setStartIntent(intent === '1' ? null : intent)
      setStarting(true)
    }
    setParams(current => { current.delete('start'); return current }, { replace: true })
  }, [params, setParams, timer.isLoading, timer.timer])
  function toggleStart(open: boolean) {
    setStarting(open)
    if (!open) {
      setStartIntent(null)
      setSelectedPartId(undefined)
    }
  }
  function startPart(sessionId?: string) {
    setSelectedPartId(sessionId)
    setStartIntent(sessionId ? 'scheduled' : null)
    setStarting(true)
  }

  return <div className={'today-page' + (active ? ' today-active' : '')}>
    <PageHeading
      eyebrow={active ? 'در حال مطالعه · جلسۀ فعال' : 'امروز · ' + weekdayName(today) + ' ' + jalaliDay(today)}
      title={active ? 'خسته نباشی ' + profile.displayName + '!' : greeting() + '، ' + profile.displayName}
      description={active ? 'همراهت کنار میز پیکسلی‌اش با تو مشغول مطالعه است.' : 'امروز ' + fa(todayMinutes) + ' دقیقه مطالعه کردی · ' + fa(remaining) + ' دقیقه تا هدف'}
      action={openPart && !active && <button disabled={timer.isLoading || Boolean(timer.error)} onClick={() => startPart(openPart.id)} className="today-open-part">پارت باشگاه باز است · الان شروع کن</button>}
    />
    {timer.error && <QueryError error={timer.error} retry={() => void timer.refetch()} />}
    <div className="today-dashboard">
      <div className="today-top">
        {timer.isLoading ? <div className="skeleton min-h-52 rounded-2xl" aria-label="در حال بررسی جلسۀ فعال" /> : active ? <ActiveTimerCard timer={timer} onStop={() => setFinishing(true)} /> : <>
          <div className="today-launch">
            <div className="today-mobile-preview"><TodayStudyRoom className="today-mobile-room" /></div>
            <StartStudySheet key={`${selectedPartId ?? ''}-${startIntent ?? ''}`} open={starting} onOpenChange={toggleStart} openPart={sheetPart} timer={timer} intent={startIntent} onStarted={() => toggleStart(false)} />
          </div>
          <section className="surface today-goal">
            <h2>هدف روزانه<Target size={17} /></h2>
            {progress.isError ? <QueryError error={progress.error} retry={() => void progress.refetch()} /> : <GoalRing value={share} size={136} stroke={8} label="پیشرفت هدف امروز">
              <strong>{goalValue}</strong><span>{fa(todayMinutes)} / {fa(goalMinutes)} دقیقه</span>
            </GoalRing>}
            <Link to={appRoutes.profile + '?section=settings'} title="تغییر هدف">{goalHint}</Link>
          </section>
        </>}
      </div>
      {active ? <section className="today-metrics today-session-metrics">
        <Metric icon={UsersRound} title="همراهان در حال مطالعه" value={studying === undefined ? '—' : fa(studying) + ' نفر'} />
        <Metric icon={BookOpen} title="تست‌های ثبت‌شده" value={fa(active.testCount) + ' تست'} hint="ثبت سریع در پایان جلسه" />
        <Metric icon={Target} title="تمرکز این جلسه" value={active.focusLockEnabled ? 'تمرکز کامل' : 'مطالعه'} hint={active.subjectName} />
      </section> : <section className="today-metrics today-idle-metrics" aria-label="نگاهی به مسیر تو">
        <Metric icon={UsersRound} title="پارت باشگاه" value={openPart ? 'الان باز است' : 'پارت باز نیست'} hint={openPart?.title} />
        {levelMetric}
        <Metric icon={Flame} title="روزهای پیوسته" value={streak ? fa(streak.current) + ' روز' : '—'} hint={streak && 'رکورد: ' + fa(streak.best) + ' روز'} />
        <Metric icon={Clock3} title="امروز" value={progress.data ? fa(todayMinutes) + ' دقیقه' : '—'} hint={goalValue + ' هدف'} />
        <Link className="surface today-mobile-goal" to={appRoutes.profile + '?section=settings'}><small>هدف امروز</small><strong>{goalValue}</strong></Link>
      </section>}
    </div>
    <div className="today-review">
      {progress.isError ? <QueryError error={progress.error} retry={() => void progress.refetch()} /> : <WeekChart today={today} week={progress.data} />}
      {schedule.isError ? <QueryError error={schedule.error} retry={() => void schedule.refetch()} /> : <TodayParts schedule={schedule.data} now={now} activeSessionId={active?.sessionId ?? null} onStart={active || timer.isLoading || timer.error ? undefined : startPart} />}
    </div>
    <section aria-label="پیشرفت مطالعۀ امروز" className={'grid gap-3 sm:grid-cols-3 ' + (active ? '' : 'md:hidden')}>
      {levelMetric}
      <Metric icon={Flame} title="بیشترین روزهای پیوسته" value={streak ? fa(streak.best) + ' روز' : '—'} hint={streak && 'رشتۀ فعلی: ' + fa(streak.current) + ' روز'} />
      <Link className="surface today-metric" to={appRoutes.profile + '?section=settings'}><p><Target size={15} />هدف امروز</p><strong>{fa(todayMinutes)} / {fa(goalMinutes)} دقیقه</strong><span className="text-xs">{goalHint}</span></Link>
    </section>
    <LiveNowStrip />
    <section className="surface today-links"><h2>قدم بعدی تو</h2>
      {exam && <Link to={appRoutes.profile + '?section=settings'} className="quick-link"><GraduationCap size={19} />{examDays === null ? 'تعیین تاریخ ' + exam : fa(Math.max(0, examDays)) + ' روز تا ' + exam}<ArrowLeft size={16} /></Link>}
      <Link to={appRoutes.planner} className="quick-link"><CalendarDays size={19} />روزت را بچین<ArrowLeft size={16} /></Link>
      <Link to={appRoutes.learning} className="quick-link"><BookOpen size={19} />چیزی تازه یاد بگیر<ArrowLeft size={16} /></Link>
    </section>
    {broadcasts.data?.slice(0, 1).map(item => <aside key={item.id} className="surface p-5"><h2 className="flex gap-2 font-bold"><Megaphone size={18} />{item.title}</h2><p>{item.body}</p></aside>)}
    <FinishSessionSheet open={finishing} onOpenChange={setFinishing} timer={timer} onFinished={() => setFinishing(false)} />
  </div>
}
