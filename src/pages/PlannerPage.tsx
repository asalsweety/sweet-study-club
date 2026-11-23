import PageHeading from '../components/PageHeading'
import QueryError from '../components/QueryError'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useOnlineStatus } from '../app/pwa/online-status'
import { plannerTitle } from '../app/navigation/items'
import { queryKeys, useSession } from '../app/session'
import type { PlannerItem } from '../shared/api/planner'
import { errorMessage } from '../shared/api/http'
import { clockTime, fa, jalaliDay, jalaliShort, weekdayName } from '../shared/lib/format'
import { addDays, tehranClock } from '../shared/lib/tehran'
import { cn } from '../shared/lib/utils'
import { confirmAction } from '../shared/lib/confirm'
import { Button } from '../components/ui/button'
import PlannerItemEditor, { type PlannerDraft } from '../features/planner/PlannerItemEditor'
import { createOfflineTask, deleteOfflineTask, listOfflineTasks, onPlannerChange, plannerPending, retryPlanner, syncOfflinePlanner, updateOfflineTask } from '../features/planner/offline-planner'

const weekdays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']
const SheetsView = lazy(() => import('../features/sheets/SheetsView'))

/** Two views: day-to-day tasks, and the fillable Sweet Study planner sheets. */
export default function PlannerPage({ displayName }: { displayName: string }) {
  const [params] = useSearchParams()
  const member = useSession().data?.user.id
  const sheets = params.get('view') === 'sheets' || params.has('sheet')
  const tabs = (
    <nav className="section-tabs" aria-label="بخش‌های برنامه">
      <Link to="?view=tasks" aria-current={sheets ? undefined : 'page'}>کارها و تقویم</Link>
      <Link to="?view=sheets" aria-current={sheets ? 'page' : undefined}>دفتر پلنر</Link>
    </nav>
  )
  if (!member) return null
  if (!sheets) return <><PlannerSyncStatus member={member} /><PlannerTasks key={member} member={member} displayName={displayName} tabs={tabs} /></>
  return (
    <div className="grid gap-6">
      <PlannerSyncStatus member={member} />
      {!params.has('sheet') && <PageHeading eyebrow="دفتر برنامه‌ریزی Sweet Study" title="دفتر پلنر" description="برگه‌های پلنر را همین‌جا پر کن؛ هر صفحه خودکار ذخیره می‌شود." action={tabs} />}
      <Suspense fallback={<div className="skeleton h-96 rounded-2xl" aria-label="در حال بارگذاری" />}><SheetsView /></Suspense>
    </div>
  )
}

function PlannerSyncStatus({ member }: { member: string }) {
  const online = useOnlineStatus()
  const client = useQueryClient()
  const key = ['planner-pending', member]
  const { data } = useQuery({ queryKey: key, queryFn: () => plannerPending(member), networkMode: 'always', retry: false })
  useEffect(() => {
    void syncOfflinePlanner(member)
    return onPlannerChange(member, () => {
      for (const prefix of ['planner-pending', 'planner', 'planner-sheets']) void client.invalidateQueries({ queryKey: [prefix, member] })
      void client.invalidateQueries({ queryKey: queryKeys.reminders })
    })
  }, [client, member, online])
  const failed = data?.failed
  if (online && !data?.count) return null
  return <aside role="status" className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-muted p-3 text-sm">
    <span>{!online && 'آفلاین هستی. '}{data?.count ? `${fa(data.count)} تغییر روی این دستگاه در انتظار همگام‌سازی است.` : 'تغییرات این دستگاه پس از اتصال فرستاده می‌شوند.'}</span>
    {failed && <span>{failed.error}</span>}
    {online && <Button variant="outline" size="sm" onClick={() => void retryPlanner(member)}>تلاش دوباره</Button>}
    {failed && <Button variant="ghost" size="sm" onClick={async () => {
      if (await confirmAction({ title: 'کنار گذاشتن تغییرات ارسال‌نشده', description: 'تغییرات محلی این مورد کنار گذاشته شوند؟', confirmLabel: 'کنار گذاشتن' })) await retryPlanner(member, failed.id)
    }}>کنار گذاشتن تغییرات این مورد</Button>}
  </aside>
}

function PlannerTasks({ member, displayName, tabs }: { member: string; displayName: string; tabs: ReactNode }) {
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
  const key = ['planner', member, from, to]
  const online = useOnlineStatus()
  const items = useQuery({ queryKey: key, queryFn: () => listOfflineTasks(member, from, to), networkMode: 'always' })
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['planner'] }),
      client.invalidateQueries({ queryKey: queryKeys.reminders }),
    ])
  }

  const save = useMutation({
    networkMode: 'always',
    mutationFn: async (draft: PlannerDraft) => {
      if (!editing || editing === 'new') return createOfflineTask(member, { ...draft, date: selected })
      const changed = Object.fromEntries(Object.entries(draft).filter(([key, value]) => editing[key as keyof PlannerDraft] !== value))
      if (Object.keys(changed).length) await updateOfflineTask(member, editing.id, changed)
    },
    onSuccess: () => {
      setEditing(null)
      void refresh()
    },
  })
  const toggle = useMutation({ networkMode: 'always', mutationFn: (item: PlannerItem) => updateOfflineTask(member, item.id, { isDone: !item.isDone }), onSuccess: refresh })
  const remove = useMutation({ networkMode: 'always', mutationFn: (id: string) => deleteOfflineTask(member, id), onSuccess: refresh })

  const days = useMemo(() => Array.from({ length: 35 }, (_, index) => addDays(anchor, index)), [anchor])
  const byDate = useMemo(() => {
    const dates = new Map<string, PlannerItem[]>()
    for (const item of items.data?.items ?? []) {
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
      <PageHeading eyebrow="یک روز، یک قدم" title={plannerTitle(displayName)} description="کارهای مهم را مشخص کن؛ برای استراحت هم جا بگذار." action={<div className="flex flex-wrap items-center gap-2">{tabs}<Button onClick={() => setEditing('new')}><Plus />کار جدید</Button></div>} />
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
        {!online && items.data?.dates && !items.data.dates.includes(selected) && <p className="mb-3 text-sm text-muted-foreground">برنامۀ قبلی این روز روی این دستگاه دریافت نشده است. می‌توانی کار تازه‌ای اضافه کنی.</p>}
        {!items.isPending && !items.isError && dayItems.length === 0 && (online || items.data?.dates?.includes(selected)) && <div className="rounded-xl border border-dashed border-border p-8 text-center"><p className="text-sm font-bold">یک روز خالی، کلی امکان.</p><p className="my-3 text-sm leading-7 text-muted-foreground">اولین کار امروز را اضافه کن؛ لازم نیست برنامه‌ات شلوغ باشد.</p><Button variant="outline" onClick={() => setEditing('new')}><Plus />افزودن اولین کار</Button></div>}
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
