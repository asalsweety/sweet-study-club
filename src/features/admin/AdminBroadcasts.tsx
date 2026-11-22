import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Megaphone, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api } from '../../app/api'
import { queryKeys } from '../../app/session'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { NativeSelect } from '../../components/ui/native-select'
import { Textarea } from '../../components/ui/textarea'
import { broadcastInputSchema, type BroadcastInput } from '../../shared/api/shop'
import BroadcastCard from '../broadcasts/BroadcastCard'
import { broadcastDestinations, broadcastTones } from '../broadcasts/labels'
import { QueryState } from '../learning/components'
import { Field } from './Field'
import { fromTehranInput, tehranInput } from './form-values'

type Broadcast = Awaited<ReturnType<typeof api.admin.broadcasts>>[number]
const dateLabel = new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', dateStyle: 'short', timeStyle: 'short' })

function broadcastStatus(message: Broadcast) {
  if (!message.published) return 'مخفی'
  if (message.expiresAt && Date.parse(message.expiresAt) <= Date.now()) return 'منقضی‌شده'
  if (message.startsAt && Date.parse(message.startsAt) > Date.now()) return 'زمان‌بندی‌شده'
  return 'در حال نمایش'
}

function readTime(value: string, original: string | null) {
  if (original && tehranInput(original) === value) return original
  return value ? fromTehranInput(value) : null
}

function BroadcastForm({ message, close, refresh }: { message: Broadcast | null; close: () => void; refresh: () => void }) {
  const save = useMutation({
    mutationFn: (input: BroadcastInput) => api.admin.saveBroadcast(message?.id ?? null, input),
    onSuccess: () => { refresh(); close() },
  })
  const [draft, setDraft] = useState<BroadcastInput>(message ?? {
    title: '', body: '', startsAt: null, expiresAt: null, published: true, pinned: false, tone: 'notice', destination: null,
  })
  const [start, setStart] = useState(message?.startsAt ? tehranInput(message.startsAt) : '')
  const [end, setEnd] = useState(message?.expiresAt ? tehranInput(message.expiresAt) : '')
  const [error, setError] = useState('')
  let submitLabel = 'انتشار اطلاعیه'
  if (message) submitLabel = 'ذخیره تغییرات'
  else if (!draft.published) submitLabel = 'ذخیره پیش‌نویس'
  else if (start && Date.parse(start + '+03:30') > Date.now()) submitLabel = 'زمان‌بندی انتشار'
  function change<K extends keyof BroadcastInput>(key: K, value: BroadcastInput[K]) {
    setDraft(current => ({ ...current, [key]: value }))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const startsAt = readTime(start, message?.startsAt ?? null)
    const expiresAt = readTime(end, message?.expiresAt ?? null)
    const parsed = broadcastInputSchema.safeParse({
      title: draft.title, body: draft.body, tone: draft.tone, published: draft.published,
      pinned: draft.pinned, popup: draft.popup ?? false, destination: draft.destination, startsAt, expiresAt,
    })
    if (!parsed.success || (start && !startsAt) || (end && !expiresAt)) {
      setError('عنوان و متن را وارد کن و زمان پایان را بعد از شروع بگذار.')
      return
    }
    if (draft.published && expiresAt && Date.parse(expiresAt) <= Date.now()) {
      setError('برای نمایش اطلاعیه، زمان پایان را در آینده بگذار یا خالی کن.')
      return
    }
    setError('')
    save.mutate(parsed.data)
  }

  return <form className="grid gap-3 rounded-2xl border border-border bg-card p-4" onSubmit={submit}>
    <fieldset className="grid gap-3" disabled={save.isPending}>
      <Field label="عنوان"><Input name="title" maxLength={120} required value={draft.title} onChange={e => change('title', e.target.value)} /></Field>
      <Field label="متن"><Textarea name="body" rows={4} maxLength={2000} required value={draft.body} onChange={e => change('body', e.target.value)} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="نوع اطلاعیه"><NativeSelect value={draft.tone} onChange={e => change('tone', e.target.value as BroadcastInput['tone'])}>
          {Object.entries(broadcastTones).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </NativeSelect></Field>
        <Field label="پیوند به بخش باشگاه"><NativeSelect value={draft.destination ?? ''} onChange={e => change('destination', e.target.value as BroadcastInput['destination'] || null)}>
          <option value="">بدون پیوند</option>{Object.entries(broadcastDestinations).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </NativeSelect></Field>
        <Field label="شروع نمایش (به وقت تهران)"><Input type="datetime-local" dir="ltr" value={start} onChange={e => setStart(e.target.value)} />
          <span className="text-xs font-normal text-muted-foreground">خالی یعنی نمایش از زمان انتشار</span>
        </Field>
        <Field label="پایان نمایش (به وقت تهران)"><Input type="datetime-local" dir="ltr" value={end} onChange={e => setEnd(e.target.value)} />
          <span className="text-xs font-normal text-muted-foreground">خالی یعنی نمایش تا توقف دستی</span>
        </Field>
      </div>
      <Field label="وضعیت انتشار"><NativeSelect value={draft.published ? 'published' : 'hidden'} onChange={e => change('published', e.target.value === 'published')}>
        <option value="published">انتشار برای اعضا</option><option value="hidden">مخفی / پیش‌نویس</option>
      </NativeSelect></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.pinned} onChange={e => change('pinned', e.target.checked)} /> سنجاق کردن بالای اطلاعیه‌ها</label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={draft.popup ?? false} onChange={e => change('popup', e.target.checked)} />
        <span>نمایش در پنجرهٔ بازشو برای اعضا<span className="mt-1 block text-xs leading-6 text-muted-foreground">در هر مرورگر برای هر عضو یک‌بار نمایش داده می‌شود. تغییر عنوان، متن، نوع یا پیوند، پنجره را دوباره نمایش می‌دهد.</span></span>
      </label>
      {(draft.title || draft.body) && <div className="grid gap-2"><p className="text-sm font-bold">پیش‌نمایش در صفحۀ امروز</p><BroadcastCard preview message={draft} /></div>}
      <div className="flex gap-2"><Button type="submit">{submitLabel}</Button><Button type="button" variant="ghost" onClick={close}>انصراف</Button></div>
    </fieldset>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <QueryState error={save.error} />
  </form>
}

export default function AdminBroadcasts() {
  const client = useQueryClient()
  const messages = useQuery({ queryKey: ['admin', 'broadcasts'], queryFn: api.admin.broadcasts, refetchInterval: 60_000 })
  const [editing, setEditing] = useState<Broadcast | 'new' | null>(null)
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['admin', 'broadcasts'] })
    void client.invalidateQueries({ queryKey: queryKeys.broadcasts })
  }
  const remove = useMutation({ mutationFn: api.admin.deleteBroadcast, onSuccess: refresh })
  const hide = useMutation({ mutationFn: api.admin.hideBroadcast, onSuccess: refresh })
  return <section className="glass grid gap-3 rounded-2xl p-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-lg font-bold"><Megaphone className="size-5 text-primary" /> اطلاعیه‌های باشگاه</h2>
      <Button size="sm" onClick={() => setEditing('new')}><Plus /> اطلاعیه جدید</Button>
    </div>
    <p className="text-sm text-muted-foreground">اعضای واردشده اطلاعیه‌ها را بالای صفحۀ «امروز» می‌بینند.</p>
    {editing !== null && <BroadcastForm key={editing === 'new' ? 'new' : editing.id} message={editing === 'new' ? null : editing} close={() => setEditing(null)} refresh={refresh} />}
    <QueryState pending={messages.isPending} error={messages.error} retry={messages.refetch} empty={messages.data?.length === 0 && 'هنوز اطلاعیه‌ای ثبت نشده است.'} />
    <QueryState error={remove.error} />
    <QueryState error={hide.error} />
    <ul className="grid gap-2">{messages.data?.map((message) => <li key={message.id} className="grid gap-2 rounded-xl bg-muted/40 p-3">
      <div className="flex flex-wrap justify-between gap-2"><h3 className="break-words text-sm font-bold">{message.title}</h3><span className="text-sm font-bold">{broadcastStatus(message)}</span></div>
      <p className="whitespace-pre-line break-words text-sm">{message.body}</p>
      <p className="text-xs leading-6 text-muted-foreground">
        {broadcastTones[message.tone]}{message.pinned && ' · سنجاق‌شده'}{message.popup && ' · پنجرهٔ بازشو'} · از {dateLabel.format(Date.parse(message.startsAt ?? message.createdAt))}
        {' · '}{message.expiresAt ? 'تا ' + dateLabel.format(Date.parse(message.expiresAt)) : 'بدون انقضا'}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => setEditing(message)}>ویرایش</Button>
        {message.published && (!message.expiresAt || Date.parse(message.expiresAt) > Date.now()) && <Button size="sm" variant="outline"
          disabled={hide.isPending || editing !== null} onClick={() => hide.mutate(message.id)}>توقف نمایش</Button>}
        <Button size="sm" variant="outline" disabled={remove.isPending || editing !== null} onClick={() => {
          if (window.confirm('این اطلاعیه حذف شود؟')) remove.mutate(message.id)
        }}>حذف</Button>
      </div>
    </li>)}</ul>
  </section>
}
