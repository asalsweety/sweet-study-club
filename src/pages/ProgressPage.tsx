import PageHeading from '../components/PageHeading'
import QueryError from '../components/QueryError'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownRight, ArrowUpRight, Clock, Flame, Target, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../app/api'
import { appRoutes } from '../app/navigation/routes'
import { queryKeys, useSubjects } from '../app/session'
import type { UserProfile } from '../shared/api/profile'
import type { PeriodKind } from '../shared/api/progress'
import { fa, formatDuration, jalaliDay } from '../shared/lib/format'
import { cn } from '../shared/lib/utils'
import './club-reports.css'
import { DayBars, Heatmap, SubjectBreakdown } from '../features/progress/charts'

const periods: { id: PeriodKind; label: string; previous: string }[] = [
  { id: 'day', label: 'روزانه', previous: 'دیروز' },
  { id: 'week', label: 'هفتگی', previous: 'هفته‌ی قبل' },
  { id: 'month', label: 'ماهانه', previous: 'ماه قبل' },
]

function Change({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted-foreground">تازه</span>
  const up = value >= 0
  return (
    <span className={cn('inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold', up ? 'bg-[var(--success-soft)] text-[var(--success-text)]' : 'bg-[var(--destructive-soft)] text-[var(--destructive-text)]')}>
      {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {fa(Math.abs(value))}٪
    </span>
  )
}

function Metric({ icon, label, value, extra }: { icon: React.ReactNode; label: string; value: string; extra?: React.ReactNode }) {
  return (
    <div className="club-panel flex min-h-[127px] min-w-0 flex-col justify-between gap-2">
      <span className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </span>
      <span className="text-xl font-bold">{value}</span>
      {extra}
    </div>
  )
}

export default function ProgressPage({ profile }: { profile: UserProfile }) {
  const [period, setPeriod] = useState<PeriodKind>('week')
  const progress = useQuery({ queryKey: queryKeys.progress(period), queryFn: () => api.progress.period(period) })
  const heatmap = useQuery({ queryKey: queryKeys.heatmap, queryFn: () => api.progress.heatmap(140) })
  const subjects = useSubjects()
  const colors = new Map((subjects.data ?? []).map((subject) => [subject.name, subject.color]))
  const data = progress.data
  const meta = periods.find((item) => item.id === period)!

  return (
    <div className="club-report flex flex-col gap-5">
      <PageHeading eyebrow="اثر قدم‌های کوچک" title={`پیشرفت ${profile.displayName}`} description={data ? `${jalaliDay(data.current.from)} تا ${jalaliDay(data.current.to)}` : 'زمانی که گذاشتی، عادتی که ساختی و مسیری که پیش رو داری.'} action={
        <div className="club-tabs w-80 max-w-full">
          {periods.map((item) => (
            <button key={item.id} type="button" aria-pressed={period === item.id} onClick={() => setPeriod(item.id)} className={cn('rounded-xl px-4 py-2 transition', period === item.id ? 'bg-card shadow-sm' : 'text-muted-foreground')}>
              {item.label}
            </button>
          ))}
        </div>
      } />

      {progress.isError && <QueryError error={progress.error} retry={() => void progress.refetch()} />}
      {!data && !progress.isError ? (
        <div className="grid gap-4 sm:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-28 rounded-3xl" />)}</div>
      ) : data ? (
        <>
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Metric icon={<Target size={16} />} label="طولانی‌ترین جلسه" value={formatDuration(data.current.longestSessionSeconds)} extra={<span className="text-xs text-muted-foreground">{fa(data.current.sessions)} جلسه</span>} />
            <Metric icon={<Flame size={16} />} label="بهترین روز" value={data.current.bestDay ? formatDuration(data.current.bestDay.seconds) : '—'} extra={data.current.bestDay && <span className="text-xs text-muted-foreground">{jalaliDay(data.current.bestDay.date)}</span>} />
            <Metric icon={<TrendingUp size={16} />} label="میانگین روزهای مطالعه" value={formatDuration(data.current.averageSecondsPerStudyDay)} extra={<span className="flex items-center gap-2 text-xs text-muted-foreground"><Change value={data.change.averageSecondsPerStudyDay} /> {fa(data.current.studyDays)} روز فعال</span>} />
            <Metric icon={<Clock size={16} />} label="مجموع مطالعه" value={formatDuration(data.current.totalSeconds)} extra={<span className="flex items-center gap-2 text-xs text-muted-foreground"><Change value={data.change.totalSeconds} /> نسبت به {meta.previous}</span>} />
          </section>

          <section className="grid items-start gap-5 lg:grid-cols-[2.033fr_1fr]">
            <div className="club-panel flex min-h-[230px] min-w-0 flex-col justify-between gap-4">
              <h2 className="text-base font-bold">نمودار مطالعه‌ی روزانه</h2>
              <DayBars days={data.current.byDay} />
            </div>
            <div className="club-panel flex min-h-[230px] min-w-0 flex-col gap-3">
              <h2 className="text-base font-bold">تست‌ها · درصد کل: {data.current.tests.percent === null ? '—' : `${fa(data.current.tests.percent)}٪`}</h2>
              <div className="grid grid-cols-3 gap-2.5 text-center">
                {([
                  ['غلط', data.current.tests.wrong, 'text-destructive'],
                  ['درست', data.current.tests.correct, 'text-[var(--success-text)]'],
                  ['کل', data.current.tests.total, 'text-foreground'],
                ] as const).map(([label, count, tone]) => <div key={label} className="grid min-h-[76px] content-center gap-1.5 rounded-[14px] bg-muted p-2">
                  <span className={cn('text-xl font-bold', tone)}>{fa(count)}</span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>)}
              </div>
            </div>
          </section>
          <section className="club-panel flex min-h-[221px] min-w-0 flex-col justify-between gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold">نقشه‌ی حرارتی مطالعه · ۲۰ هفته‌ی اخیر</h2>
              <span className="text-xs font-bold text-primary">زنجیره: {fa(data.streak.current)} روز · رکورد {fa(data.streak.best)} روز</span>
            </div>
            {heatmap.isError ? <QueryError error={heatmap.error} retry={() => void heatmap.refetch()} /> : heatmap.data ? <Heatmap days={heatmap.data} /> : <div className="skeleton h-28 rounded-2xl" />}
          </section>
          <section className="club-panel grid gap-3">
            <h2 className="text-base font-bold">مطالعه به تفکیک درس</h2>
            {data.current.favoriteSubject && <p className="text-sm text-muted-foreground">درس محبوب: {data.current.favoriteSubject}</p>}
            <SubjectBreakdown rows={data.current.bySubject} colors={colors} />
          </section>
          <Link to={`${appRoutes.profile}?section=export`} className="self-start text-xs font-bold text-primary hover:underline">خروجی PDF، تصویر و CSV ←</Link>
        </>
      ) : null}
    </div>
  )
}
