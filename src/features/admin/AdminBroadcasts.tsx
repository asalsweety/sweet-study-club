import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Megaphone, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api } from '../../app/api'
import { queryKeys } from '../../app/session'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { broadcastInputSchema, type BroadcastInput } from '../../shared/api/shop'
import { jalaliShort } from '../../shared/lib/format'
import { QueryState } from '../learning/components'
import { Field } from './Field'
import { formText, fromTehranInput, tehranInput } from './form-values'

type Broadcast = Awaited<ReturnType<typeof api.admin.broadcasts>>[number]

function BroadcastForm({ message, close, refresh }: { message: Broadcast | null; close: () => void; refresh: () => void }) {
  const save = useMutation({
    mutationFn: (input: BroadcastInput) => api.admin.saveBroadcast(message?.id ?? null, input),
    onSuccess: () => { refresh(); close() },
  })
  const [invalid, setInvalid] = useState(false)
  const initialExpiry = message ? message.expiresAt : new Date(Date.now() + 7 * 86_400_000).toISOString()
  const expiry = initialExpiry ? tehranInput(initialExpiry) : ''

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const time = formText(form, 'expires')
    const expiresAt = time === expiry ? initialExpiry : fromTehranInput(time)
    const parsed = broadcastInputSchema.safeParse({ title: formText(form, 'title'), body: formText(form, 'body'), expiresAt })
    setInvalid(!parsed.success || Boolean(time && !expiresAt))
    if (parsed.success && (!time || expiresAt)) save.mutate(parsed.data)
  }

  return <form className="grid gap-3 rounded-2xl border border-border bg-card p-4" onSubmit={submit}>
    <fieldset className="grid gap-3" disabled={save.isPending}>
      <Field label="عنوان"><Input name="title" maxLength={120} required defaultValue={message?.title} /></Field>
      <Field label="متن"><Textarea name="body" rows={4} maxLength={2000} required defaultValue={message?.body} /></Field>
      <Field label="پایان نمایش (تهران، خالی برای بدون انقضا)"><Input name="expires" type="datetime-local" dir="ltr" defaultValue={expiry} /></Field>
      <div className="flex gap-2"><Button type="submit">{message ? 'ذخیره اطلاعیه' : 'انتشار اطلاعیه'}</Button><Button type="button" variant="ghost" onClick={close}>انصراف</Button></div>
    </fieldset>
    {invalid && <p role="alert" className="text-sm text-destructive">عنوان، متن و تاریخ پایان نمایش را بررسی کن.</p>}
    <QueryState error={save.error} />
  </form>
}

export default function AdminBroadcasts() {
  const client = useQueryClient()
  const messages = useQuery({ queryKey: ['admin', 'broadcasts'], queryFn: api.admin.broadcasts })
  const [editing, setEditing] = useState<Broadcast | 'new' | null>(null)
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['admin', 'broadcasts'] })
    void client.invalidateQueries({ queryKey: queryKeys.broadcasts })
  }
  const remove = useMutation({ mutationFn: api.admin.deleteBroadcast, onSuccess: refresh })
  return <section className="glass grid gap-3 rounded-2xl p-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-lg font-bold"><Megaphone className="size-5 text-primary" /> اطلاعیه‌های باشگاه</h2>
      <Button size="sm" onClick={() => setEditing('new')}><Plus /> اطلاعیه جدید</Button>
    </div>
    {editing !== null && <BroadcastForm key={editing === 'new' ? 'new' : editing.id} message={editing === 'new' ? null : editing} close={() => setEditing(null)} refresh={refresh} />}
    <QueryState pending={messages.isPending} error={messages.error} retry={messages.refetch} empty={messages.data?.length === 0 && 'هنوز اطلاعیه‌ای ثبت نشده است.'} />
    <QueryState error={remove.error} />
    <ul className="grid gap-2">{messages.data?.map((message) => <li key={message.id} className="grid gap-2 rounded-xl bg-muted/40 p-3">
      <div className="flex flex-wrap justify-between gap-2"><h3 className="text-sm font-bold">{message.title}</h3><p className="text-xs text-muted-foreground">{jalaliShort(message.createdAt.slice(0, 10))} · {message.expiresAt && Date.parse(message.expiresAt) <= Date.now() ? 'منقضی‌شده' : 'منتشرشده'}</p></div>
      <p className="whitespace-pre-line break-words text-sm">{message.body}</p>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => setEditing(message)}>ویرایش</Button>
        <Button size="sm" variant="outline" disabled={remove.isPending || editing !== null} onClick={() => {
          if (window.confirm('این اطلاعیه حذف شود؟')) remove.mutate(message.id)
        }}>حذف</Button>
      </div>
    </li>)}</ul>
  </section>
}
