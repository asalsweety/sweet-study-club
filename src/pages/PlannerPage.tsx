import PageHeading from '../components/PageHeading'
import QueryError from '../components/QueryError'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../app/api'
import { plannerTitle } from '../app/navigation/items'
import { queryKeys } from '../app/session'
import type { PlannerItem } from '../shared/api/planner'
import { errorMessage } from '../shared/api/http'
import { clockTime, fa, jalaliDay, jalaliShort, weekdayName } from '../shared/lib/format'
import { addDays, tehranClock } from '../shared/lib/tehran'
import { cn } from '../shared/lib/utils'
import { confirmAction } from '../shared/lib/confirm'
import { Button } from '../components/ui/button'
import PlannerItemEditor, { type PlannerDraft } from '../features/planner/PlannerItemEditor'

const weekdays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

export default function PlannerPage({ displayName }: { displayName: string }) {
  const client = useQueryClient()
  const today = tehranClock(Date.now()).date
  const [selected, setSelected] = useState(today)
  const [anchor, setAnchor] = useState(() => addDays(today, -tehranClock(Date.now()).weekday))
  const [editing, setEditing] = useState<PlannerItem | 'new' | null>(null)
  const [params, setParams] = useSearchParams()
  useEffect(() => {
    if (params.get('add') !== '1') return
    setSelected(today)
    setAnchor(addDays(today, -tehranClock(Date.now()).weekday))
    setEditing('new')
    setParams(current => { current.delete('add'); return current }, { replace: true })
  }, [params, setParams, today])
  const from = anchor
  const to = addDays(anchor, 34)
  const key = queryKeys.planner(from, to)
  const items = useQuery({ queryKey: key, queryFn: () => api.planner.list(from, to) })
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['planner'] }),
      client.invalidateQueries({ queryKey: queryKeys.reminders }),
    ])
  }

  const save = useMutation({
    mutationFn: (draft: PlannerDraft) =>
      editing && editing !== 'new' ? api.planner.update(editing.id, draft) : api.planner.create({ ...draft, date: selected }),
    onSuccess: () => {
      setEditing(null)
      void refresh()
    },
  })
  const toggle = useMutation({ mutationFn: (item: PlannerItem) => api.planner.update(item.id, { isDone: !item.isDone }), onSuccess: refresh })
  const remove = useMutation({ mutationFn: (id: string) => api.planner.remove(id), onSuccess: refresh })

  const days = useMemo(() => Array.from({ length: 35 }, (_, index) => addDays(anchor, index)), [anchor])
  const byDate = useMemo(() => {
    const dates = new Map<string, PlannerItem[]>()
    for (const item of items.data ?? []) {
      const group = dates.get(item.date)
      if (group) group.push(item)
      else dates.set(item.date, [item])
    }
    return dates
  }, [items.data])
  const dayItems = byDate.get(selected) ?? []
  const done = dayItems.filter((item) => item.kind === 'task' && item.isDone).length
  const tasks = dayItems.filter((item) => item.kind === 'task').length

  return (
    <div className="grid gap-6">
      <PageHeading eyebrow="یک روز، یک قدم" title={plannerTitle(displayName)} description="کارهای مهم را مشخص کن؛ برای استراحت هم جا بگذار." action={<Button onClick={() => setEditing('new')}><Plus />کار جدید</Button>} />
      {items.isError && <QueryError error={items.error} retry={() => void items.refetch()} />}
      <div className="grid items-start gap-5 xl:grid-cols-[1fr_1.15fr]">
      <section className="glass rise rounded-2xl p-5 sm:p-6">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">تقویم مطالعه</h2>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" aria-label="هفته‌های قبل" onClick={() => setAnchor(addDays(anchor, -28))}>
              <ChevronRight />
            </Button>
            <Button size="sm" variant="secondary" className="rounded-xl" onClick={() => { setAnchor(addDays(today, -tehranClock(Date.now()).weekday)); setSelected(today) }}>
              امروز
            </Button>
            <Button size="icon" variant="ghost" aria-label="هفته‌های بعد" onClick={() => setAnchor(addDays(anchor, 28))}>
              <ChevronLeft />
            </Button>
          </div>
        </header>
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {weekdays.map((day) => (
            <span key={day} className="pb-1 text-xs font-bold text-muted-foreground">{day}</span>
          ))}
          {days.map((date) => {
            const list = byDate.get(date) ?? []
            const open = list.filter((item) => item.kind === 'task' && !item.isDone).length
            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelected(date)}
                aria-label={`${weekdayName(date)}، ${jalaliDay(date)}`}
                aria-pressed={date === selected}
                aria-current={date === today ? 'date' : undefined}
                className={cn(
                  'flex aspect-square flex-col items-center justify-center gap-0.5 rounded-2xl text-sm transition-all',
                  date === selected ? 'bg-primary font-bold text-primary-foreground ' : 'hover:bg-secondary',
                  date === today && date !== selected && 'ring-2 ring-primary/50',
                  date < today && date !== selected && 'text-muted-foreground',
                )}
              >
                <span>{jalaliShort(date).split(' ')[0]}</span>
                {list.length > 0 && (
                  <span className={cn('h-1.5 w-1.5 rounded-full', open > 0 ? (date === selected ? 'bg-white' : 'bg-primary') : 'bg-[var(--success)]')} />
                )}
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {jalaliDay(from)} تا {jalaliDay(to)}
        </p>
      </section>

      <section className="glass rise rounded-2xl p-5 sm:p-6">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{weekdayName(selected)}، {jalaliDay(selected)}</h2>
            <p className="text-sm text-muted-foreground">{tasks > 0 ? `${fa(done)} از ${fa(tasks)} کار انجام شد` : 'برای این روز هنوز چیزی ننوشتی.'}</p>
          </div>
          <Button onClick={() => setEditing('new')} className="rounded-2xl bg-primary font-bold">
            <Plus /> افزودن
          </Button>
        </header>
        {tasks > 0 && (
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-[image:var(--primary-gradient-horizontal)] transition-all duration-700" style={{ width: `${(done / tasks) * 100}%` }} />
          </div>
        )}
        {(save.isError || remove.isError || toggle.isError) && <p className="mb-3 text-sm text-destructive">{errorMessage(save.error ?? remove.error ?? toggle.error)}</p>}
        {!items.isPending && !items.isError && dayItems.length === 0 && <div className="rounded-xl border border-dashed border-border p-8 text-center"><p className="text-sm font-bold">یک روز خالی، کلی امکان.</p><p className="my-3 text-sm leading-7 text-muted-foreground">اولین کار امروز را اضافه کن؛ لازم نیست برنامه‌ات شلوغ باشد.</p><Button variant="outline" onClick={() => setEditing('new')}><Plus />افزودن اولین کار</Button></div>}
        <ul className="flex flex-col gap-2">
          {items.isPending && <li className="skeleton h-16 rounded-2xl" />}
          {dayItems.map((item) => (
            <li key={item.id} className={cn('group flex items-start gap-3 rounded-2xl bg-muted/40 p-3.5 transition-all', item.isDone && 'opacity-60')}>
              {item.kind === 'task' ? (
                <input type="checkbox" checked={item.isDone} onChange={() => toggle.mutate(item)} aria-label={`انجام شد: ${item.title}`} className="mt-1 size-5 accent-[var(--primary)]" />
              ) : (
                <span aria-hidden className="mt-0.5">📝</span>
              )}
              <div className="min-w-0 flex-1">
                <p className={cn('font-bold', item.isDone && 'line-through')}>{item.title}</p>
                <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  {item.subjectName && <span>{item.subjectName}</span>}
                  {item.plannedMinutes && <span>{fa(item.plannedMinutes)} دقیقه</span>}
                  {item.plannedTests && <span>{fa(item.plannedTests)} تست</span>}
                  {item.remindAt && (
                    <span className="flex items-center gap-1"><Bell size={12} /> {clockTime(item.remindAt)}</span>
                  )}
                </p>
                {item.details && <p className="mt-1 text-sm leading-6 text-foreground/80">{item.details}</p>}
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" aria-label="ویرایش" onClick={() => setEditing(item)}><Pencil size={16} /></Button>
                <Button size="icon" variant="ghost" aria-label="حذف" disabled={remove.isPending} onClick={async () => { if (await confirmAction({ title: 'حذف از برنامه', description: `«${item.title}» از برنامه‌ات حذف شود؟` })) remove.mutate(item.id) }}><Trash2 size={16} /></Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      </div>
      {editing && (
        <PlannerItemEditor
          key={editing === 'new' ? `new-${selected}` : editing.id}
          open
          date={selected}
          item={editing === 'new' ? null : editing}
          saving={save.isPending}
          onClose={() => setEditing(null)}
          onSave={(draft) => save.mutate(draft)}
        />
      )}
    </div>
  )
}
