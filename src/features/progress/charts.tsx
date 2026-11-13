import { fa, formatHours, jalaliShort } from '../../shared/lib/format'
import { cn } from '../../shared/lib/utils'

type Day = { date: string; seconds: number }

export function DayBars({ days, compact = false }: { days: Day[]; compact?: boolean }) {
  const max = Math.max(3600, ...days.map((day) => day.seconds))
  return (
    <div className="flex h-44 items-end gap-1.5" role="img" aria-label="نمودار مطالعه‌ی روزانه">
      {days.map((day, index) => {
        const height = Math.round((day.seconds / max) * 100)
        return (
          <div key={day.date} className="group flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] font-bold text-muted-foreground opacity-0 transition group-hover:opacity-100">{formatHours(day.seconds)}</span>
            <div
              className={cn('grow-bar w-full rounded-t-xl bg-[image:var(--primary-gradient-vertical)] transition-[height,filter] duration-700 hover:brightness-110', day.seconds === 0 && 'bg-none bg-muted')}
              style={{ height: `${Math.max(day.seconds === 0 ? 4 : 8, height)}%`, animationDelay: `${Math.min(index, 30) * 25}ms` }}
              title={`${jalaliShort(day.date)}: ${formatHours(day.seconds)}`}
            />
            {!compact && <span className="truncate text-[10px] text-muted-foreground">{jalaliShort(day.date).split(' ')[0]}</span>}
          </div>
        )
      })}
    </div>
  )
}

type SubjectRow = { name: string; seconds: number; tests: number; percent: number | null }

export function SubjectBreakdown({ rows, colors }: { rows: SubjectRow[]; colors: Map<string, string> }) {
  const total = rows.reduce((sum, row) => sum + row.seconds, 0) || 1
  if (rows.length === 0) return <p className="rounded-2xl bg-muted/50 p-5 text-center text-sm text-muted-foreground">هنوز جلسه‌ای در این بازه نیست.</p>
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
        {rows.map((row) => (
          <span key={row.name} style={{ width: `${(row.seconds / total) * 100}%`, background: colors.get(row.name) ?? 'var(--primary)' }} />
        ))}
      </div>
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center gap-3 text-sm">
            <span className="size-3 shrink-0 rounded-full" style={{ background: colors.get(row.name) ?? 'var(--primary)' }} />
            <span className="flex-1 font-bold">{row.name}</span>
            {row.tests > 0 && <span className="text-xs text-muted-foreground">{fa(row.tests)} تست{row.percent !== null && ` · ${fa(row.percent)}٪`}</span>}
            <span className="w-14 text-left font-bold tabular-nums">{formatHours(row.seconds)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Heatmap({ days }: { days: Day[] }) {
  const level = (seconds: number) => (seconds === 0 ? 0 : seconds < 3600 ? 1 : seconds < 3 * 3600 ? 2 : seconds < 6 * 3600 ? 3 : 4)
  const shades = ['bg-muted', 'bg-primary/25', 'bg-primary/50', 'bg-primary/75', 'bg-primary']
  return (
    <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-1" role="img" aria-label="نقشه‌ی حرارتی مطالعه">
      {days.map((day, index) => (
        <span key={day.date} title={`${jalaliShort(day.date)}: ${formatHours(day.seconds)}`} className={cn('size-3.5 rounded-[4px] [animation:pop-in_420ms_var(--ease-spring)_backwards]', shades[level(day.seconds)])} style={{ animationDelay: `${Math.floor(index / 7) * 22}ms` }} />
      ))}
    </div>
  )
}
