import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Upload } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { NativeSelect } from '../../components/ui/native-select'
import { Textarea } from '../../components/ui/textarea'
import { importPackSchema, type LearningPack, type Track } from '../../shared/api/learning'
import { fa, jalaliDay } from '../../shared/lib/format'
import { learningTracks, providerNames, subjectName } from '../../shared/lib/learning-catalog'
import { minuteLabel, tehranClock } from '../../shared/lib/tehran'
import { learningApi } from '../learning/api'
import { Panel, QueryState } from '../learning/components'

function PackRow({ pack, refresh }: { pack: LearningPack; refresh: () => void }) {
  const local = tehranClock(Date.parse(pack.availableAt))
  const [time, setTime] = useState(`${local.date}T${minuteLabel(local.minuteOfDay)}`)
  const [active, setActive] = useState(pack.isActive)
  const update = useMutation({ mutationFn: () => learningApi.admin.update(pack.id, active, new Date(`${time}:00+03:30`).toISOString()), onSuccess: refresh })
  return <li className="grid gap-3 rounded-2xl bg-muted/40 p-4"><div><h3 className="text-sm font-bold">{pack.title}</h3><p className="mt-1 text-xs text-muted-foreground">{providerNames[pack.provider]} · {fa(pack.questionCount)} سؤال{pack.isSample && ' · نمونه'} · {pack.isActive ? Date.parse(pack.availableAt) > Date.now() ? 'زمان‌بندی‌شده' : 'منتشرشده' : 'بایگانی'}</p></div><div className="flex flex-wrap items-end gap-3"><label className="grid min-w-0 flex-1 gap-1 text-xs font-bold">زمان انتشار (تهران، تاریخ میلادی)<Input type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} /></label><label className="flex h-10 items-center gap-2 text-xs"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />فعال</label><Button size="sm" disabled={update.isPending || !time} onClick={() => update.mutate()}>ذخیره</Button></div><QueryState error={update.error} /></li>
}

export default function AdminLearning() {
  const client = useQueryClient()
  const [track, setTrack] = useState<Track>('konkur')
  const packs = useQuery({ queryKey: ['admin', 'learning', track], queryFn: () => learningApi.admin.packs(track) })
  const [source, setSource] = useState('')
  const [fileError, setFileError] = useState('')
  const [success, setSuccess] = useState('')
  const parse = () => {
    try { return importPackSchema.safeParse(JSON.parse(source)) } catch { return null }
  }
  const parsed = source.trim() ? parse() : null
  const refresh = () => { void client.invalidateQueries({ queryKey: ['admin', 'learning'] }); void client.invalidateQueries({ queryKey: ['learning'] }) }
  const save = useMutation({ mutationFn: () => {
    if (!parsed?.success) throw new Error('Invalid pack')
    return learningApi.admin.import(parsed.data)
  }, onSuccess: () => {
    setSuccess(`بستۀ «${parsed?.success ? parsed.data.title : ''}» وارد شد.`)
    if (parsed?.success) setTrack(parsed.data.track)
    setSource(''); refresh()
  } })
  const loadExample = async () => {
    try {
      const response = await fetch('/examples/learning-pack.json')
      if (!response.ok) throw new Error('Example unavailable')
      setSource(JSON.stringify(importPackSchema.parse(await response.json()), null, 2)); setFileError('')
    } catch { setFileError('فایل نمونه بارگذاری نشد.') }
  }
  const invalidSubjects = parsed?.success ? parsed.data.questions.filter((q) => !learningTracks.find((t) => t.id === parsed.data.track)?.subjects.some((s) => s.id === q.subjectId)) : []
  return <Panel className="grid gap-4">
    <h2 className="flex items-center gap-2 text-xl font-bold"><BookOpen className="text-primary" />مدیریت محتوای یادگیری</h2>
    <p className="text-sm leading-8 text-muted-foreground">دفترچه‌های کشوری، تألیفی و هفتگی را با پاسخ، توضیح، فصل، مایندمپ و میکرودرسنامه وارد کن. هر بسته حداکثر ۲۰۰ سؤال دارد؛ برای دفترچه‌های بزرگ‌تر چند بخش بساز. محتوای منتشرشده ثابت می‌ماند؛ اصلاح را با کلید نسخۀ جدید وارد و نسخۀ قبلی را بایگانی کن.</p>
    <details className="rounded-2xl border border-border/60 p-4"><summary className="cursor-pointer font-bold">ورود و پیش‌نمایش بستۀ سؤال</summary><div className="mt-4 grid gap-3">
      <div className="flex flex-wrap items-center gap-3"><Button size="sm" variant="secondary" onClick={() => { void loadExample() }}>بارگذاری نمونۀ قالب</Button><a href="/examples/learning-pack.json" download className="text-xs font-bold text-primary underline">دریافت قالب JSON</a><label className="flex cursor-pointer items-center gap-2 text-sm font-bold"><Upload size={15} />انتخاب فایل<Input type="file" accept="application/json,.json" className="max-w-52" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 3_000_000) { setFileError('حداکثر اندازۀ فایل ۳ مگابایت است.'); return } try { setSource(await file.text()); setFileError(''); setSuccess('') } catch { setFileError('خواندن فایل انجام نشد.') } }} /></label></div>
      <label className="grid gap-2 text-sm font-bold">محتوای بسته<Textarea dir="ltr" rows={12} className="font-mono text-xs" value={source} onChange={(e) => { setSource(e.target.value); setSuccess('') }} placeholder="فایل JSON را انتخاب یا محتوای آن را اینجا وارد کن." /></label>
      {source && (!parsed?.success ? <p role="alert" className="text-sm text-destructive">{parsed && !parsed.success ? parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`).join(' · ') : 'ساختار JSON معتبر نیست.'}</p> : <div className="rounded-2xl bg-primary/5 p-4 text-sm leading-8"><p className="font-bold">{parsed.data.title}</p><p>{learningTracks.find((t) => t.id === parsed.data.track)?.name} · {providerNames[parsed.data.provider]} · {fa(parsed.data.questions.length)} سؤال · {parsed.data.isSample ? 'نمونۀ آموزشی' : 'محتوای واقعی'}</p><p>انتشار: {jalaliDay(tehranClock(Date.parse(parsed.data.availableAt)).date)}، ساعت {minuteLabel(tehranClock(Date.parse(parsed.data.availableAt)).minuteOfDay)} تهران</p><p>درس‌ها: {[...new Set(parsed.data.questions.map((q) => subjectName(q.subjectId)))].join('، ')}</p><p>انتساب: {parsed.data.attribution}</p>{invalidSubjects.length > 0 && <p className="text-destructive">شناسۀ درس نامعتبر: {[...new Set(invalidSubjects.map((q) => q.subjectId))].join('، ')}</p>}</div>)}
      <p className="text-xs leading-7 text-muted-foreground">برای انتشار هفتگی، bank را weekly و provider را maz، ghalamchi یا gaj قرار بده و availableAt را به زمان انتشار تنظیم کن. زمان‌های داخل JSON باید به‌صورت ISO و با منطقۀ زمانی UTC باشند. فقط محتوایی را وارد کن که مجوز استفاده از آن را داری.</p>
      <Button className="justify-self-start" disabled={!parsed?.success || invalidSubjects.length > 0 || save.isPending} onClick={() => save.mutate()}>ورود بسته</Button><QueryState error={save.error} />{fileError && <p role="alert" className="text-sm text-destructive">{fileError}</p>}
    </div></details>
    {success && <p role="status" className="text-sm text-primary">{success}</p>}
    <label className="grid gap-2 text-sm font-bold">بسته‌های مسیر<NativeSelect value={track} onChange={(e) => setTrack(e.target.value as Track)}>{learningTracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</NativeSelect></label>
    <QueryState pending={packs.isPending} error={packs.error} retry={packs.refetch} empty={packs.data?.packs.length === 0 && 'بسته‌ای در این مسیر وارد نشده است.'} />
    <ul className="grid max-h-[40rem] gap-3 overflow-y-auto">{packs.data?.packs.map((p) => <PackRow key={`${p.id}-${p.availableAt}-${p.isActive}`} pack={p} refresh={refresh} />)}</ul>
  </Panel>
}
