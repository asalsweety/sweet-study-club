import type { ReactNode } from 'react'
import { BookOpen, Lightbulb, RefreshCw } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { errorMessage } from '../../shared/api/http'
import { fa } from '../../shared/lib/format'
import type { z } from 'zod'
import type { topicSchema } from '../../shared/api/learning'

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-border bg-card p-5 sm:p-6 ${className}`}>{children}</section>
}
export function QueryState({ pending, error, empty, retry }: { pending?: boolean; error?: unknown; empty?: string | false; retry?: () => unknown }) {
  if (pending) return <p role="status" className="py-8 text-center text-sm text-muted-foreground">در حال بارگذاری…</p>
  if (error) return <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">{errorMessage(error)}{retry && <Button variant="outline" size="sm" onClick={() => { void retry() }}><RefreshCw size={14} /> تلاش دوباره</Button>}</div>
  if (empty) return <div className="grid justify-items-center gap-3 py-8 text-center text-sm text-muted-foreground"><BookOpen className="size-8 text-primary/60" /><p className="max-w-md leading-7">{empty}</p></div>
  return null
}
export function MindMap({ topic, micro = false }: { topic: z.infer<typeof topicSchema>; micro?: boolean }) {
  return <div className="grid gap-4">
    <h3 className="text-lg font-bold">{topic.title}</h3>
    {topic.important.length > 0 && <aside className="rounded-xl border border-primary/15 bg-primary/5 p-4"><p className="mb-2 flex items-center gap-2 text-sm font-bold text-primary"><Lightbulb size={16} />نکته‌های مهم</p><ul className="list-inside list-disc space-y-2 text-sm leading-7">{topic.important.map((p, i) => <li key={i}>{p}</li>)}</ul></aside>}
    {micro ? <p className="whitespace-pre-wrap text-sm leading-8">{topic.microLesson || 'برای این مبحث هنوز میکرودرسنامه‌ای ثبت نشده است.'}</p> : <div aria-label={`مایندمپ ${topic.title}`} className="grid gap-3 border-r-2 border-primary/30 pr-4 sm:grid-cols-2">{topic.branches.map((b, i) => <div key={i} className="relative rounded-2xl bg-muted/50 p-4"><span aria-hidden className="absolute top-6 -right-4 h-px w-4 bg-primary/30" /><h4 className="mb-2 text-sm font-bold text-primary">{b.title}</h4><ul className="space-y-2 text-sm leading-7">{b.points.map((point, j) => <li key={j}>{point}</li>)}</ul></div>)}</div>}
  </div>
}
export function CountBadge({ value, label }: { value: number; label: string }) {
  return <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">{fa(value)} {label}</span>
}
