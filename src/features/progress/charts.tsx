import { useState } from 'react'
import { fa, formatHours, jalaliShort } from '../../shared/lib/format'
import { cn } from '../../shared/lib/utils'

type Day = { date: string; seconds: number }

export function DayBars({ days }: { days: Day[] }) {
  const max = Math.max(1, ...days.map((day) => day.seconds))
  const [selectedDate, setSelectedDate] = useState<string>()
  const selected = days.find(day => day.date === selectedDate) ?? days.at(-1)
  const dense = days.length > 14
  return (
    <div className="grid gap-2">
      {dense && selected ? (
        <select aria-label="روز نمودار" className="w-fit max-w-full rounded-md bg-card text-xs" value={selected.date} onChange={event => setSelectedDate(event.target.value)}>
          {days.map(day => <option key={day.date} value={day.date}>{jalaliShort(day.date)} · {formatHours(day.seconds)}</option>)}
        </select>
      ) : selected && <output className="text-xs text-muted-foreground">{jalaliShort(selected.date)} · {formatHours(selected.seconds)}</output>}
      <div className={cn('flex h-[118px] min-w-0', dense ? 'gap-1' : 'gap-2 lg:gap-5')} role="group" aria-label="نمودار مطالعه‌ی روزانه">
        {days.map((day, index) => (
          <button key={day.date} type="button" className="flex min-w-0 flex-1 flex-col items-center gap-1"
            aria-label={`${jalaliShort(day.date)}، ${formatHours(day.seconds)}`} aria-pressed={day.date === selected?.date}
            onClick={() => setSelectedDate(day.date)} onFocus={() => setSelectedDate(day.date)} onMouseEnter={() => setSelectedDate(day.date)}>
            <span className="flex w-full flex-1 items-end">
              <span className={cn('w-full rounded-[min(12px,1vw)]', day.seconds === max ? 'bg-primary' : day.seconds ? 'bg-primary/45' : 'bg-muted')}
                style={{ height: `${Math.max(3, day.seconds / max * 100)}%` }} />
            </span>
            <span className="h-4 text-[10px] text-muted-foreground">{(!dense || index % 5 === 0) && jalaliShort(day.date).split(' ')[0]}</span>
          </button>
        ))}
      </div>
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
    <div className="grid w-fit max-w-full auto-cols-[16px] grid-flow-col grid-rows-7 gap-x-1.5 gap-y-[5px] overflow-x-auto" role="img" aria-label="نقشه‌ی حرارتی مطالعه">
      {days.map((day, index) => (
        <span key={day.date} title={`${jalaliShort(day.date)}: ${formatHours(day.seconds)}`} className={cn('size-4 rounded-[4px] [animation:pop-in_420ms_var(--ease-spring)_backwards]', shades[level(day.seconds)])} style={{ animationDelay: `${Math.floor(index / 7) * 22}ms` }} />
      ))}
    </div>
  )
}
