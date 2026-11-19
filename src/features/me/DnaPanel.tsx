import { useQuery } from '@tanstack/react-query'
import QueryError from '../../components/QueryError'
import { Dna } from 'lucide-react'
import { api } from '../../app/api'
import { queryKeys } from '../../app/session'
import { fa } from '../../shared/lib/format'

const chronotypes = {
  'early-bird': { emoji: '🌅', title: 'سحرخیز', text: 'بهترین تمرکزت صبح زود است.' },
  'afternoon-focus': { emoji: '☀️', title: 'تمرکز بعدازظهر', text: 'ظهر تا عصر، اوج بازدهی توست.' },
  'evening-scholar': { emoji: '🌇', title: 'پژوهشگر عصر', text: 'غروب‌ها بهتر درس می‌خوانی.' },
  'night-owl': { emoji: '🦉', title: 'جغد شب', text: 'شب‌ها ذهنت روشن‌تر است.' },
  discovering: { emoji: '🔍', title: 'در حال کشف', text: 'با چند جلسه‌ی دیگر الگویت را پیدا می‌کنیم.' },
} as const

const styles = {
  'deep-focus': 'تمرکز عمیق — جلسه‌های بلند و پیوسته',
  'sprint-learner': 'دونده‌ی سرعتی — جلسه‌های کوتاه و پرتعداد',
  balanced: 'متعادل — ترکیبی از جلسه‌های کوتاه و بلند',
  discovering: 'هنوز در حال شناختن سبک تو هستیم',
} as const

export default function DnaPanel({ compact = false }: { compact?: boolean }) {
  const query = useQuery({ queryKey: queryKeys.dna, queryFn: api.progress.dna })
  const dna = query.data
  if (query.isError && !dna) return <QueryError error={query.error} retry={() => void query.refetch()} />
  if (!dna) return <div className="skeleton h-72 rounded-2xl" />
  const type = chronotypes[dna.chronotype]
  const peak = Math.max(1, ...dna.hourlyMinutes)

  if (compact) {
    const bins = Array.from({ length: 12 }, (_, i) => (dna.hourlyMinutes[i * 2] ?? 0) + (dna.hourlyMinutes[i * 2 + 1] ?? 0))
    const max = Math.max(1, ...bins)
    return <section className="profile-dna surface grid content-start gap-4 p-6" aria-label="مطالعۀ DNA">
      <span className="w-fit rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">مطالعۀ DNA</span>
      <h2 className="text-xl font-bold">{type.title} · {styles[dna.style].split(' — ')[0]}</h2>
      <p className="text-sm text-muted-foreground">{type.text}</p>
      <div className="mt-2 flex h-20 items-end gap-1.5" role="img" aria-label="توزیع مطالعه در ساعت‌های روز">{bins.map((minutes, i) => <span key={i} title={`ساعت ${fa(i * 2)} · ${fa(minutes)} دقیقه`} className={`flex-1 rounded ${minutes >= max * .85 ? 'bg-primary' : 'bg-secondary'}`} style={{ height: `${Math.max(4, minutes / max * 100)}%` }} />)}</div>
      <p className="text-xs text-muted-foreground">میانگین هر جلسه {fa(dna.averageSessionMinutes)} دقیقه · {fa(dna.sessionsAnalyzed)} جلسه</p>
    </section>
  }
  return (
    <section className="glass rise flex flex-col gap-4 rounded-2xl p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold"><Dna size={19} className="text-primary" /> Study DNA</h2>
      <div className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-3xl bg-primary/10 text-4xl">{type.emoji}</span>
        <div>
          <p className="text-xl font-bold">{type.title}</p>
          <p className="text-sm text-muted-foreground">{type.text}</p>
          <p className="mt-1 text-xs font-bold text-primary">{styles[dna.style]}</p>
        </div>
      </div>
      <div className="flex h-20 items-end gap-0.5" role="img" aria-label="توزیع مطالعه در ساعت‌های روز">
        {dna.hourlyMinutes.map((minutes, hour) => (
          <span key={hour} title={`ساعت ${fa(hour)}: ${fa(minutes)} دقیقه`} className="flex-1 rounded-t bg-[image:var(--primary-gradient-vertical)]" style={{ height: `${Math.max(4, (minutes / peak) * 100)}%`, opacity: minutes === 0 ? 0.2 : 1 }} />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground"><span>۰</span><span>۶</span><span>۱۲</span><span>۱۸</span><span>۲۳</span></div>
      <dl className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-2xl bg-muted/50 p-2"><dt className="text-muted-foreground">اطمینان</dt><dd className="text-base font-bold">{fa(Math.round(dna.confidence * 100))}٪</dd></div>
        <div className="rounded-2xl bg-muted/50 p-2"><dt className="text-muted-foreground">جلسه‌ها</dt><dd className="text-base font-bold">{fa(dna.sessionsAnalyzed)}</dd></div>
        <div className="rounded-2xl bg-muted/50 p-2"><dt className="text-muted-foreground">میانگین</dt><dd className="text-base font-bold">{fa(dna.averageSessionMinutes)} د</dd></div>
      </dl>
    </section>
  )
}
