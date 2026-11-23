import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TrendingUp, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { NativeSelect } from '../../components/ui/native-select'
import { Textarea } from '../../components/ui/textarea'
import type { Provider, ScoreInput } from '../../shared/api/learning'
import { fa, jalaliShort } from '../../shared/lib/format'
import { providerNames } from '../../shared/lib/learning-catalog'
import { tehranClock } from '../../shared/lib/tehran'
import { learningApi } from './api'
import { Panel, QueryState } from './components'
import { useOnlineStatus } from '../../app/pwa/online-status'

export default function ScoresPanel({ onAnalyze }: { onAnalyze: (id: string) => void }) {
  const online = useOnlineStatus()
  const client = useQueryClient()
  const scores = useQuery({ queryKey: ['learning', 'scores'], queryFn: learningApi.scores })
  const [provider, setProvider] = useState<Provider>('maz')
  const [form, setForm] = useState<ScoreInput>({ provider: 'maz', title: '', date: tehranClock(Date.now()).date, score: 0, notes: '' })
  const save = useMutation({ mutationFn: () => learningApi.saveScore(form), onSuccess: () => { setProvider(form.provider); setForm((f) => ({ ...f, title: '', score: 0, notes: '' })); void client.invalidateQueries({ queryKey: ['learning', 'scores'] }) } })
  const remove = useMutation({ mutationFn: learningApi.deleteScore, onSuccess: () => client.invalidateQueries({ queryKey: ['learning', 'scores'] }) })
  const selected = scores.data?.filter((s) => s.provider === provider) ?? []
  const average = selected.length ? selected.reduce((sum, s) => sum + s.score, 0) / selected.length : null
  const min = Math.max(0, Math.min(...selected.map((s) => s.score)) - 300)
  const max = Math.max(...selected.map((s) => s.score), min + 600) + 300
  const points = selected.map((s, i) => `${selected.length === 1 ? 300 : 30 + i / (selected.length - 1) * 540},${155 - (s.score - min) / (max - min) * 130}`)
  return <Panel className="grid gap-4">
    <h2 className="flex items-center gap-2 text-lg font-bold"><TrendingUp className="text-primary" size={20} />پروفایل تراز آزمون‌ها</h2>
    <label className="grid gap-2 text-sm font-bold">روند تراز در یک مؤسسه<NativeSelect value={provider} onChange={(e) => setProvider(e.target.value as Provider)}>{Object.entries(providerNames).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</NativeSelect></label>
    {!scores.data && <QueryState pending={scores.isPending} error={scores.error} retry={scores.refetch} />}
    <div className="flex items-end justify-between"><span className="text-sm text-muted-foreground">میانگین {providerNames[provider]}</span><span className="text-2xl font-bold text-primary">{average === null ? '—' : fa(Math.round(average))}</span></div>
    {selected.length > 0 && <figure><svg role="img" aria-label={`روند ${selected.length} تراز ${providerNames[provider]}`} viewBox="0 0 600 180" className="w-full text-primary" style={{ direction: 'ltr' }}><path d="M30 155H570" fill="none" stroke="currentColor" opacity="0.2" /><polyline points={points.join(' ')} fill="none" stroke="currentColor" strokeWidth="3" />{points.map((point, i) => { const [x, y] = point.split(','); return <circle key={selected[i]!.id} cx={x} cy={y} r="5" fill="currentColor"><title>{selected[i]!.title}: {fa(selected[i]!.score)}</title></circle> })}</svg><figcaption className="text-xs text-muted-foreground">از قدیمی به جدید · تراز مؤسسه‌های مختلف جدا نمایش داده می‌شود.</figcaption></figure>}
    <ul className="grid max-h-80 gap-2 overflow-y-auto">{selected.map((s) => <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/40 p-3 text-sm"><div className="min-w-0 flex-1"><p className="font-bold">{s.title}</p><p className="mt-1 text-xs text-muted-foreground">{jalaliShort(s.date)} · تراز {fa(s.score)}</p>{s.notes && <p className="mt-1 whitespace-pre-wrap text-xs leading-6">{s.notes}</p>}</div><Button size="sm" variant="ghost" disabled={!online} onClick={() => onAnalyze(s.id)}>تحلیل</Button><Button size="icon-sm" variant="ghost" aria-label={`حذف تراز ${s.title}`} disabled={!online || remove.isPending} onClick={() => remove.mutate(s.id)}><Trash2 size={15} /></Button></li>)}</ul>
    {scores.data && !selected.length && <p className="text-sm text-muted-foreground">هنوز تراز این منبع را وارد نکرده‌ای.</p>}
    {online && <details className="rounded-2xl border border-border/60 p-4"><summary className="cursor-pointer text-sm font-bold">ثبت تراز جدید</summary><form className="mt-4 grid gap-3" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
      <label className="grid gap-1 text-sm">مؤسسه<NativeSelect value={form.provider} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value as Provider }))}>{Object.entries(providerNames).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</NativeSelect></label>
      <label className="grid gap-1 text-sm">عنوان آزمون<Input required maxLength={200} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="مثلاً آزمون جامع مهر" /></label>
      <div className="grid grid-cols-2 gap-3"><label className="grid gap-1 text-sm">تاریخ (میلادی)<Input type="date" required value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></label><label className="grid gap-1 text-sm">تراز<Input type="number" min={0} max={20000} step="any" required value={form.score || ''} onChange={(e) => setForm((f) => ({ ...f, score: Number(e.target.value) }))} /></label></div>
      <label className="grid gap-1 text-sm">جزئیات و درصد درس‌ها برای تحلیل<Textarea maxLength={5000} rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></label>
      <Button type="submit" disabled={save.isPending}>ثبت تراز</Button><QueryState error={save.error} />{save.isSuccess && <p role="status" className="text-xs text-primary">تراز ثبت شد.</p>}
    </form></details>}<QueryState error={remove.error} />
  </Panel>
}
