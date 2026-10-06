import { useQuery } from '@tanstack/react-query'
import { ArrowDownRight, ArrowUpRight, Award, CalendarCheck, Clock, Heart, Target, Timer } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../app/api'
import { appRoutes } from '../app/navigation/routes'
import { queryKeys, useSubjects } from '../app/session'
import type { UserProfile } from '../shared/api/profile'
import type { PeriodKind } from '../shared/api/progress'
import { fa, formatDuration, formatHours, jalaliDay } from '../shared/lib/format'
import { cn } from '../shared/lib/utils'
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
    <span className={cn('inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-black', up ? 'bg-[var(--success-soft)] text-[var(--success-text)]' : 'bg-[var(--destructive-soft)] text-[var(--destructive-text)]')}>
      {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {fa(Math.abs(value))}٪
    </span>
  )
}

function Metric({ icon, label, value, extra }: { icon: React.ReactNode; label: string; value: string; extra?: React.ReactNode }) {
  return (
    <div className="glass flex flex-col gap-2 rounded-3xl p-4">
      <span className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </span>
      <span className="text-xl font-black">{value}</span>
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
    <div className="flex flex-col gap-5">
      <header className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">پیشرفت {profile.displayName}</h1>
          {data && (
            <p className="text-sm text-muted-foreground">
              {jalaliDay(data.current.from)}{data.current.from !== data.current.to && ` تا ${jalaliDay(data.current.to)}`}
            </p>
          )}
        </div>
        <div className="flex rounded-2xl bg-muted/70 p-1 text-sm font-bold">
          {periods.map((item) => (
            <button key={item.id} type="button" onClick={() => setPeriod(item.id)} className={cn('rounded-xl px-4 py-2 transition', period === item.id ? 'bg-card shadow-sm' : 'text-muted-foreground')}>
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {!data ? (
        <div className="grid gap-4 sm:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-28 rounded-3xl" />)}</div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric icon={<Clock size={16} />} label="مجموع مطالعه" value={formatDuration(data.current.totalSeconds)} extra={<span className="flex items-center gap-2 text-xs text-muted-foreground"><Change value={data.change.totalSeconds} /> نسبت به {meta.previous}</span>} />
            <Metric icon={<CalendarCheck size={16} />} label="میانگین روزهای مطالعه" value={formatDuration(data.current.averageSecondsPerStudyDay)} extra={<span className="flex items-center gap-2 text-xs text-muted-foreground"><Change value={data.change.averageSecondsPerStudyDay} /> {fa(data.current.studyDays)} روز فعال</span>} />
            <Metric icon={<Award size={16} />} label="بهترین روز" value={data.current.bestDay ? formatHours(data.current.bestDay.seconds) : '—'} extra={data.current.bestDay && <span className="text-xs text-muted-foreground">{jalaliDay(data.current.bestDay.date)}</span>} />
            <Metric icon={<Timer size={16} />} label="طولانی‌ترین جلسه" value={formatDuration(data.current.longestSessionSeconds)} extra={<span className="text-xs text-muted-foreground">{fa(data.current.sessions)} جلسه</span>} />
          </section>

          <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <div className="glass rise rounded-[2rem] p-5 sm:p-6">
              <h2 className="mb-4 text-lg font-black">روند مطالعه</h2>
              <DayBars days={data.current.byDay} compact={data.current.byDay.length > 14} />
            </div>
            <div className="glass rise flex flex-col gap-4 rounded-[2rem] p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-lg font-black"><Heart size={18} className="text-primary" /> درس محبوب: {data.current.favoriteSubject ?? '—'}</h2>
              <SubjectBreakdown rows={data.current.bySubject} colors={colors} />
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
            <div className="glass rise flex flex-col gap-3 rounded-[2rem] p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-lg font-black"><Target size={18} className="text-primary" /> تست‌ها</h2>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-muted/50 p-3"><p className="text-xl font-black">{fa(data.current.tests.total)}</p><p className="text-xs text-muted-foreground">کل</p></div>
                <div className="rounded-2xl bg-[var(--success-soft)] p-3"><p className="text-xl font-black text-[var(--success-text)]">{fa(data.current.tests.correct)}</p><p className="text-xs text-muted-foreground">درست</p></div>
                <div className="rounded-2xl bg-[var(--destructive-soft)] p-3"><p className="text-xl font-black text-[var(--destructive-text)]">{fa(data.current.tests.wrong)}</p><p className="text-xs text-muted-foreground">غلط</p></div>
              </div>
              <p className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-3 text-center text-sm font-bold">
                درصد کل: <span className="text-lg font-black text-primary">{data.current.tests.percent === null ? '—' : `${fa(data.current.tests.percent)}٪`}</span>
              </p>
            </div>
            <div className="glass rise flex flex-col gap-3 rounded-[2rem] p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black">۲۰ هفته‌ی اخیر</h2>
                <span className="text-xs text-muted-foreground">زنجیره: {fa(data.streak.current)} روز · رکورد {fa(data.streak.best)}</span>
              </div>
              {heatmap.data ? <Heatmap days={heatmap.data} /> : <div className="skeleton h-28 rounded-2xl" />}
              <Link to={`${appRoutes.profile}#export`} className="mt-1 text-sm font-bold text-primary hover:underline">خروجی PDF، تصویر و CSV ←</Link>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
