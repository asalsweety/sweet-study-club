import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../app/api'
import { confirmAction } from '../../shared/lib/confirm'
import { errorMessage } from '../../shared/api/http'
import type { StudyPart } from '../../shared/api/schedule'
import { jalaliDay } from '../../shared/lib/format'
import { addDays, minuteLabel, tehranClock } from '../../shared/lib/tehran'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Switch } from '../../components/ui/switch'

const toMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number)
  return (hours ?? 0) * 60 + (minutes ?? 0)
}

function PartRow({ part, onSave, onDelete }: { part: StudyPart; onSave: (part: StudyPart) => void; onDelete: () => void }) {
  const [draft, setDraft] = useState(part)
  const dirty = JSON.stringify(draft) !== JSON.stringify(part)
  return (
    <li className="grid grid-cols-[3rem_1fr_auto] items-center gap-2 rounded-2xl bg-muted/40 p-2 sm:grid-cols-[3rem_1fr_6rem_6rem_auto_auto]">
      <Input type="number" min={1} max={50} value={draft.position} onChange={(e) => setDraft({ ...draft, position: Number(e.target.value) })} aria-label="ترتیب" />
      <Input value={draft.title} maxLength={80} onChange={(e) => setDraft({ ...draft, title: e.target.value })} aria-label="عنوان پارت" />
      <Input type="time" dir="ltr" value={minuteLabel(draft.startMinute)} onChange={(e) => setDraft({ ...draft, startMinute: toMinutes(e.target.value) })} aria-label="شروع" />
      <Input type="time" dir="ltr" value={minuteLabel(draft.endMinute)} onChange={(e) => setDraft({ ...draft, endMinute: toMinutes(e.target.value) })} aria-label="پایان" />
      <Switch checked={draft.isActive} onCheckedChange={(isActive) => setDraft({ ...draft, isActive })} aria-label="فعال" />
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" disabled={!dirty} onClick={() => onSave(draft)} aria-label="ذخیره"><Save size={16} /></Button>
        <Button size="icon" variant="ghost" onClick={onDelete} aria-label="حذف"><Trash2 size={16} /></Button>
      </div>
    </li>
  )
}

export default function AdminSchedule() {
  const client = useQueryClient()
  const today = tehranClock(Date.now()).date
  const parts = useQuery({ queryKey: ['admin', 'parts'], queryFn: api.admin.parts })
  const overrides = useQuery({ queryKey: ['admin', 'overrides'], queryFn: () => api.admin.overrides(today, addDays(today, 60)) })
  const [holidayDate, setHolidayDate] = useState(today)
  const [holidayNote, setHolidayNote] = useState('')
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['admin'] })
    void client.invalidateQueries({ queryKey: ['schedule'] })
  }
  const input = (part: StudyPart) => ({ position: part.position, title: part.title, startMinute: part.startMinute, endMinute: part.endMinute, isActive: part.isActive })

  const save = useMutation({ mutationFn: (part: StudyPart) => api.admin.updatePart(part.id, input(part)), onSuccess: refresh })
  const create = useMutation({
    mutationFn: () => {
      const last = parts.data?.at(-1)
      const start = Math.min(1380, (last?.endMinute ?? 420) + 15)
      return api.admin.createPart({ position: (last?.position ?? 0) + 1, title: `پارت ${(last?.position ?? 0) + 1}`, startMinute: start, endMinute: Math.min(1440, start + 60), isActive: true })
    },
    onSuccess: refresh,
  })
  const remove = useMutation({ mutationFn: (id: string) => api.admin.deletePart(id), onSuccess: refresh })
  const holiday = useMutation({
    mutationFn: () => api.admin.createOverride({ date: holidayDate, partId: null, kind: 'holiday', note: holidayNote.trim() || null }),
    onSuccess: () => {
      setHolidayNote('')
      refresh()
    },
  })
  const removeOverride = useMutation({ mutationFn: (id: string) => api.admin.deleteOverride(id), onSuccess: refresh })
  const error = save.error ?? create.error ?? remove.error ?? holiday.error

  return (
    <section className="glass flex flex-col gap-4 rounded-2xl p-5">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-bold">پارت‌های روزانه</h2>
        <Button size="sm" onClick={() => create.mutate()} className="rounded-xl"><Plus size={16} /> پارت جدید</Button>
      </header>
      {error && <p className="text-sm text-destructive">{errorMessage(error)}</p>}
      <ul className="flex flex-col gap-2">
        {parts.data?.map((part) => (
          <PartRow key={`${part.id}-${part.position}-${part.startMinute}`} part={part} onSave={(next) => save.mutate(next)} onDelete={async () => { if (await confirmAction({ title: 'حذف پارت', description: `«${part.title}» از برنامۀ روزانۀ باشگاه حذف شود؟` })) remove.mutate(part.id) }} />
        ))}
      </ul>

      <h3 className="mt-2 font-bold">تعطیلی‌ها</h3>
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); holiday.mutate() }}>
        <Input type="date" dir="ltr" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} className="w-44" aria-label="تاریخ تعطیلی" />
        <Input value={holidayNote} maxLength={200} onChange={(e) => setHolidayNote(e.target.value)} placeholder="توضیح (مثلاً عید فطر)" className="min-w-40 flex-1" />
        <Button type="submit" variant="secondary" className="rounded-xl">افزودن تعطیلی</Button>
      </form>
      <ul className="flex flex-col gap-1.5">
        {overrides.data?.map((item) => (
          <li key={item.id} className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-sm">
            <span>{jalaliDay(item.date)} · {item.kind === 'holiday' ? 'تعطیل' : 'لغو پارت'} {item.note && `· ${item.note}`}</span>
            <Button size="icon" variant="ghost" onClick={() => removeOverride.mutate(item.id)} aria-label="حذف"><Trash2 size={15} /></Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
