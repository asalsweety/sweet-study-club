import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Plus, Upload } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { NativeSelect } from '../../components/ui/native-select'
import { Textarea } from '../../components/ui/textarea'
import { importPackSchema, type AdminPack, type Track } from '../../shared/api/learning'
import { fa, jalaliDay } from '../../shared/lib/format'
import { learningTracks, providerNames, subjectName } from '../../shared/lib/learning-catalog'
import { minuteLabel, tehranClock } from '../../shared/lib/tehran'
import { learningApi } from '../learning/api'
import { Panel, QueryState } from '../learning/components'
import { PackForm, PackQuestions } from './AdminLearningForms'

export default function AdminLearning() {
  const client = useQueryClient()
  const [track, setTrack] = useState<Track>('konkur')
  const [editing, setEditing] = useState<AdminPack | 'new' | null>(null)
  const [openPack, setOpenPack] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [search, setSearch] = useState('')
  const packs = useQuery({ queryKey: ['admin', 'learning', track], queryFn: () => learningApi.admin.packs(track) })
  const [source, setSource] = useState('')
  const [fileError, setFileError] = useState('')
  const [success, setSuccess] = useState('')
  const parse = () => {
    try { return importPackSchema.safeParse(JSON.parse(source)) } catch { return null }
  }
  const parsed = source.trim() ? parse() : null
  const refresh = () => { void client.invalidateQueries({ queryKey: ['admin', 'learning'] }); void client.invalidateQueries({ queryKey: ['learning'] }) }
  const archive = useMutation({
    mutationFn: (pack: AdminPack) => pack.archivedAt ? learningApi.admin.restorePack(pack.id) : learningApi.admin.archivePack(pack.id),
    onSuccess: (_, pack) => { if (openPack === pack.id) setOpenPack(null); refresh() },
  })
  const save = useMutation({ mutationFn: () => {
    if (!parsed?.success) throw new Error('Invalid pack')
    return learningApi.admin.import(parsed.data)
  }, onSuccess: () => {
    setSuccess(`بستۀ «${parsed?.success ? parsed.data.title : ''}» وارد شد.`)
    if (parsed?.success) setTrack(parsed.data.track)
    setSearch('')
    setShowArchived(false)
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
  const visible = packs.data?.packs.filter((pack) => Boolean(pack.archivedAt) === showArchived
    && `${pack.title} ${pack.key}`.toLowerCase().includes(search.trim().toLowerCase()))
  return <Panel className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-xl font-bold"><BookOpen className="text-primary" /> آزمون‌ها و بانک سؤال</h2>
      <Button size="sm" onClick={() => setEditing('new')}><Plus /> بستهٔ جدید</Button>
    </div>
    {editing !== null && <PackForm key={editing === 'new' ? 'new' : editing.id} pack={editing === 'new' ? null : editing} track={track} close={() => setEditing(null)}
      saved={(nextTrack, id) => { setTrack(nextTrack); setSearch(''); setShowArchived(false); setOpenPack(id); setEditing(null); refresh() }} />}
    <details className="rounded-2xl border border-border/60 p-4"><summary className="cursor-pointer font-bold">ورود و پیش‌نمایش بستۀ سؤال</summary><div className="mt-4 grid gap-3">
      <div className="flex flex-wrap items-center gap-3"><Button size="sm" variant="secondary" onClick={() => { void loadExample() }}>بارگذاری نمونۀ قالب</Button><a href="/examples/learning-pack.json" download className="text-xs font-bold text-primary underline">دریافت قالب JSON</a><label className="flex cursor-pointer items-center gap-2 text-sm font-bold"><Upload size={15} />انتخاب فایل<Input type="file" accept="application/json,.json" className="max-w-52" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 3_000_000) { setFileError('حداکثر اندازۀ فایل ۳ مگابایت است.'); return } try { setSource(await file.text()); setFileError(''); setSuccess('') } catch { setFileError('خواندن فایل انجام نشد.') } }} /></label></div>
      <label className="grid gap-2 text-sm font-bold">محتوای بسته<Textarea dir="ltr" rows={12} className="font-mono text-xs" value={source} onChange={(e) => { setSource(e.target.value); setSuccess('') }} placeholder="فایل JSON را انتخاب یا محتوای آن را اینجا وارد کن." /></label>
      {source && (!parsed?.success ? <p role="alert" className="text-sm text-destructive">{parsed && !parsed.success ? parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`).join(' · ') : 'ساختار JSON معتبر نیست.'}</p> : <div className="rounded-2xl bg-primary/5 p-4 text-sm leading-8"><p className="font-bold">{parsed.data.title}</p><p>{learningTracks.find((t) => t.id === parsed.data.track)?.name} · {providerNames[parsed.data.provider]} · {fa(parsed.data.questions.length)} سؤال · {parsed.data.isSample ? 'نمونۀ آموزشی' : 'محتوای واقعی'}</p><p>انتشار: {jalaliDay(tehranClock(Date.parse(parsed.data.availableAt)).date)}، ساعت {minuteLabel(tehranClock(Date.parse(parsed.data.availableAt)).minuteOfDay)} تهران</p><p>درس‌ها: {[...new Set(parsed.data.questions.map((q) => subjectName(q.subjectId)))].join('، ')}</p><p>انتساب: {parsed.data.attribution}</p>{invalidSubjects.length > 0 && <p className="text-destructive">شناسۀ درس نامعتبر: {[...new Set(invalidSubjects.map((q) => q.subjectId))].join('، ')}</p>}</div>)}
      <p className="text-xs leading-7 text-muted-foreground">برای انتشار هفتگی، bank را weekly و provider را maz، ghalamchi یا gaj قرار بده و availableAt را به زمان انتشار تنظیم کن. زمان‌های داخل JSON باید به‌صورت ISO و با منطقۀ زمانی UTC باشند. فقط محتوایی را وارد کن که مجوز استفاده از آن را داری.</p>
      <Button className="justify-self-start" disabled={!parsed?.success || invalidSubjects.length > 0 || save.isPending} onClick={() => save.mutate()}>ورود بسته</Button><QueryState error={save.error} />{fileError && <p role="alert" className="text-sm text-destructive">{fileError}</p>}
    </div></details>
    {success && <p role="status" className="text-sm text-primary">{success}</p>}
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-bold">مسیر<NativeSelect value={track} onChange={(e) => { setTrack(e.target.value as Track); setOpenPack(null); setEditing(null) }}>{learningTracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</NativeSelect></label>
      <label className="grid gap-2 text-sm font-bold">جستجوی بسته<Input value={search} maxLength={160} onChange={(e) => setSearch(e.target.value)} /></label>
    </div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showArchived} onChange={(e) => { setShowArchived(e.target.checked); setOpenPack(null) }} /> نمایش بسته‌های بایگانی‌شده</label>
    <QueryState pending={packs.isPending} error={packs.error} retry={packs.refetch} empty={visible?.length === 0 && 'بسته‌ای پیدا نشد.'} />
    <QueryState error={archive.error} />
    <ul className="grid gap-3">{visible?.map((pack) => <li key={pack.id} className="grid gap-3 rounded-2xl bg-muted/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-sm font-bold">{pack.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {providerNames[pack.provider]} · {fa(pack.questionCount)} سؤال{pack.isSample && ' · نمونه'} · {pack.archivedAt ? 'بایگانی‌شده' : !pack.isActive ? 'پیش‌نویس' : Date.parse(pack.availableAt) > Date.now() ? 'زمان‌بندی‌شده' : 'منتشرشده'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!pack.archivedAt && <>
            <Button size="sm" variant="secondary" onClick={() => setOpenPack(openPack === pack.id ? null : pack.id)} aria-expanded={openPack === pack.id}>{openPack === pack.id ? 'بستن سؤال‌ها' : 'مدیریت سؤال‌ها'}</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(pack)}>ویرایش بسته</Button>
          </>}
          <Button size="sm" variant="outline" disabled={archive.isPending || editing !== null} onClick={() => {
            if (pack.archivedAt || window.confirm('بسته از بانک سؤال برداشته شود؟ آزمون‌های قبلی حفظ می‌شوند.')) archive.mutate(pack)
          }}>{pack.archivedAt ? 'بازگردانی' : 'حذف از بانک'}</Button>
        </div>
      </div>
      {openPack === pack.id && !pack.archivedAt && <PackQuestions pack={pack} refresh={refresh} />}
    </li>)}</ul>
  </Panel>
}
