import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PackageCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { NativeSelect } from '../../components/ui/native-select'
import type { PrepInput, Provider, Track } from '../../shared/api/learning'
import { fa, jalaliDay } from '../../shared/lib/format'
import { learningTracks, providerNames, subjectName } from '../../shared/lib/learning-catalog'
import { tehranClock } from '../../shared/lib/tehran'
import { learningApi } from './api'
import { Panel, QueryState } from './components'
import type { PracticePreset } from './PracticeBuilder'

const stepNames = { learn: 'مرور درسنامه و مایندمپ', practice: 'تست آموزشی', review: 'مرور سؤال‌های سررسیدشده', mock: 'آزمون شبیه‌ساز' }
export default function PrepPanel({ track, onPractice, onLearn }: { track: Track; onPractice: (p: PracticePreset) => void; onLearn: (subject: string) => void }) {
  const client = useQueryClient()
  const packs = useQuery({ queryKey: ['learning', 'prep'], queryFn: learningApi.prep })
  const providers = (track.startsWith('konkur') ? ['konkur', 'ghalamchi', 'gaj', 'maz', 'konkuri-nerd', 'other'] : ['national', 'authored', 'other']) as Provider[]
  const [form, setForm] = useState<PrepInput>({ title: '', track, provider: providers[0]!, targetDate: tehranClock(Date.now()).date, subjectIds: [] })
  const create = useMutation({ mutationFn: () => learningApi.createPrep(form), onSuccess: () => { setForm((f) => ({ ...f, title: '', subjectIds: [] })); void client.invalidateQueries({ queryKey: ['learning', 'prep'] }) } })
  const toggle = useMutation({ mutationFn: ({ id, stepId, done }: { id: string; stepId: string; done: boolean }) => learningApi.togglePrep(id, stepId, done), onSettled: () => client.invalidateQueries({ queryKey: ['learning', 'prep'] }) })
  const remove = useMutation({ mutationFn: learningApi.deletePrep, onSuccess: () => client.invalidateQueries({ queryKey: ['learning', 'prep'] }) })
  const subjects = learningTracks.find((t) => t.id === track)!.subjects
  return <div className="grid gap-5">
    <Panel><h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><PackageCheck className="text-primary" />پک آمادگی آزمون</h2><p className="text-sm leading-8 text-muted-foreground">برای آزمون بعدی ماز، قلم‌چی، گاج یا هر منبع دیگر، درس‌ها و تاریخ هدف را انتخاب کن. هر درس چهار گام قابل پیگیری دارد.</p>
      <form className="mt-4 grid gap-4" onSubmit={(e) => { e.preventDefault(); create.mutate() }}><div className="grid gap-3 sm:grid-cols-3"><label className="grid gap-2 text-sm font-bold">نام پک<Input required maxLength={160} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="آمادگی آزمون آبان" /></label><label className="grid gap-2 text-sm font-bold">{track.startsWith('konkur') ? 'مؤسسه' : 'منبع آزمون'}<NativeSelect value={form.provider} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value as Provider }))}>{providers.map((id) => <option key={id} value={id}>{providerNames[id]}</option>)}</NativeSelect></label><label className="grid gap-2 text-sm font-bold">تاریخ هدف (میلادی)<Input type="date" required value={form.targetDate} onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))} /></label></div>
        <fieldset><legend className="mb-3 text-sm font-bold">درس‌های آزمون</legend><div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">{subjects.map((s) => <label key={s.id} className="flex items-center gap-2 rounded-xl bg-muted/40 p-3 text-sm"><input type="checkbox" checked={form.subjectIds.includes(s.id)} onChange={(e) => setForm((f) => ({ ...f, subjectIds: e.target.checked ? [...f.subjectIds, s.id] : f.subjectIds.filter((id) => id !== s.id) }))} /><span aria-hidden>{s.emoji}</span>{s.name}</label>)}</div></fieldset>
        <Button type="submit" className="justify-self-start rounded-xl" disabled={create.isPending || !form.subjectIds.length}>ساخت پک</Button><QueryState error={create.error} />
      </form>
    </Panel>
    <QueryState pending={packs.isPending} error={packs.error} retry={packs.refetch} empty={packs.data?.filter((p) => p.track === track).length === 0 && 'هنوز پک آمادگی نساخته‌ای.'} />
    <QueryState error={toggle.error || remove.error} />
    {packs.data?.filter((p) => p.track === track).map((pack) => { const done = pack.steps.filter((s) => s.done).length; return <Panel key={pack.id}>
      <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-bold">{pack.title}</h3><p className="mt-1 text-xs text-muted-foreground">{providerNames[pack.provider]} · هدف: {jalaliDay(pack.targetDate)} · {fa(done)} از {fa(pack.steps.length)} گام</p></div><Button variant="ghost" size="icon-sm" disabled={remove.isPending} aria-label={`حذف پک ${pack.title}`} onClick={() => remove.mutate(pack.id)}><Trash2 size={16} /></Button></div>
      <div className="my-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${done / pack.steps.length * 100}%` }} /></div>
      <div className="grid gap-4 sm:grid-cols-2">{pack.subjectIds.map((subject) => <div key={subject} className="rounded-2xl border border-border/60 p-4"><h4 className="mb-3 text-sm font-bold">{subjectName(subject)}</h4><ul className="grid gap-3">{pack.steps.filter((s) => s.subjectId === subject).map((step) => <li key={step.id} className="flex items-center gap-2"><label className="flex min-h-9 flex-1 items-center gap-2 text-sm"><input type="checkbox" checked={step.done} disabled={toggle.isPending} onChange={(e) => toggle.mutate({ id: pack.id, stepId: step.id, done: e.target.checked })} /><span className={step.done ? 'text-muted-foreground line-through' : ''}>{stepNames[step.kind]}</span></label><Button size="sm" variant="ghost" onClick={() => step.kind === 'learn' ? onLearn(subject) : onPractice({ subjectIds: [subject], pool: step.kind === 'review' ? 'due' : 'all', mode: step.kind === 'mock' ? 'exam' : 'practice' })}>شروع</Button></li>)}</ul></div>)}</div>
    </Panel> })}
  </div>
}
