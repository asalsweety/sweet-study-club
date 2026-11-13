import { useQuery } from '@tanstack/react-query'
import { Bookmark, CalendarDays, RotateCcw, Target } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { NativeSelect } from '../../components/ui/native-select'
import type { Track } from '../../shared/api/learning'
import { learningTracks, providerNames, subjectName } from '../../shared/lib/learning-catalog'
import { fa, jalaliDay } from '../../shared/lib/format'
import { learningApi } from './api'
import { CountBadge, MindMap, Panel, QueryState } from './components'
import type { PracticePreset } from './PracticeBuilder'

export function TopicsPanel({ track, micro, onPractice, subjectId = '' }: { track: Track; micro: boolean; onPractice: (p: PracticePreset) => void; subjectId?: string }) {
  const [samples, setSamples] = useState(false)
  const [subject, setSubject] = useState(subjectId)
  const [page, setPage] = useState(0)
  const topics = useQuery({ queryKey: ['learning', 'topics', track, samples, subject, page], queryFn: () => learningApi.topics(track, samples, page, subject) })
  return <div className="grid gap-5">
    <Panel><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-bold">{micro ? 'میکرودرسنامه' : 'مایندمپ‌ها'}</h2><p className="mt-2 text-sm text-muted-foreground">{micro ? 'یک مرور کوتاه از نکته‌های اصلی، کنار تمرین مرتبط.' : 'تصویر کلی مبحث، نکته‌های مهم و تا پنج سؤال مرتبط.'}</p></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={samples} onChange={(e) => { setSamples(e.target.checked); setPage(0) }} />نمایش نمونه‌ها</label></div><label className="mt-4 grid max-w-sm gap-2 text-sm font-bold">درس<NativeSelect value={subject} onChange={(e) => { setSubject(e.target.value); setPage(0) }}><option value="">همهٔ درس‌ها</option>{learningTracks.find((t) => t.id === track)!.subjects.map((s) => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}</NativeSelect></label></Panel>
    <QueryState pending={topics.isPending} error={topics.error} retry={topics.refetch} empty={topics.data?.topics.length === 0 && 'هنوز محتوایی برای این انتخاب منتشر نشده است. مایندمپ و میکرودرسنامه از استودیو، همراه سؤال‌های مرتبط وارد می‌شوند.'} />
    {topics.data?.topics.map((topic) => <Panel key={topic.id}><p className="mb-4 text-xs text-muted-foreground">{subjectName(topic.subjectId)} · {topic.chapter}{topic.isSample && ' · نمونهٔ آموزشی'}</p><MindMap topic={topic} micro={micro} /><Button className="mt-5 rounded-xl" onClick={() => onPractice({ questionIds: topic.questionIds, includeSamples: topic.isSample })}>{fa(topic.questionIds.length)} سؤال مرتبط</Button></Panel>)}
    {(page > 0 || topics.data?.hasMore) && <div className="flex items-center justify-center gap-3"><Button variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>قبلی</Button><span className="text-sm">صفحهٔ {fa(page + 1)}</span><Button variant="outline" disabled={!topics.data?.hasMore} onClick={() => setPage((p) => p + 1)}>بعدی</Button></div>}
  </div>
}

export function NotebookPanel({ track, onPractice }: { track: Track; onPractice: (p: PracticePreset) => void }) {
  const notes = useQuery({ queryKey: ['learning', 'notebook', track], queryFn: () => learningApi.notebook(track) })
  const [kind, setKind] = useState('saved')
  const entries = notes.data?.filter((n) => kind === 'saved' ? n.saved : kind === 'highlight' ? Boolean(n.highlight) : Boolean(n.note)) ?? []
  return <div className="grid gap-5"><Panel><h2 className="mb-4 flex items-center gap-2 text-xl font-bold"><Bookmark className="text-primary" />دفترچهٔ من</h2><div className="flex flex-wrap gap-2">{[['saved', 'نشان‌شده‌ها'], ['highlight', 'هایلایت‌ها'], ['note', 'یادداشت‌ها']].map(([id, label]) => <Button key={id} variant={kind === id ? 'default' : 'secondary'} size="sm" onClick={() => setKind(id!)}>{label}</Button>)}</div></Panel>
    <QueryState pending={notes.isPending} error={notes.error} retry={notes.refetch} empty={!notes.isPending && !notes.error && entries.length === 0 && 'هنگام حل سؤال، نکته‌ها را در دفترچه ذخیره کن تا اینجا مرورشان کنی.'} />
    {entries.map((n) => <Panel key={n.questionId}><p className="mb-2 text-xs text-muted-foreground">{subjectName(n.subjectId)} · {n.chapter}</p><h3 className="text-sm font-bold leading-8">{n.prompt}</h3>{n.highlight && <blockquote className="mt-3 rounded-xl border-r-2 border-primary bg-primary/10 p-3 text-sm leading-8">{n.highlight}</blockquote>}{n.note && <p className="mt-3 whitespace-pre-wrap text-sm leading-8">{n.note}</p>}<Button size="sm" variant="outline" className="mt-4" onClick={() => onPractice({ questionIds: [n.questionId], includeSamples: true })}>حل و ویرایش یادداشت</Button></Panel>)}
  </div>
}

export function ReviewPanel({ track, onPractice, onAttempt }: { track: Track; onPractice: (p: PracticePreset) => void; onAttempt: (id: string) => void }) {
  const summary = useQuery({ queryKey: ['learning', 'summary', track], queryFn: () => learningApi.summary(track) })
  const history = useQuery({ queryKey: ['learning', 'history', track], queryFn: () => learningApi.history(track) })
  const data = summary.data
  return <div className="grid gap-5">
    <Panel><h2 className="flex items-center gap-2 text-xl font-bold"><RotateCcw className="text-primary" />مرور هوشمند</h2><p className="mt-3 text-sm leading-8 text-muted-foreground">پس از پایان آزمون، سؤال‌ها برای فردا زمان‌بندی می‌شوند. با هر پاسخ درست در مرور بعدی، فاصله دو برابر می‌شود و تا ۶۰ روز می‌رسد؛ پاسخ غلط یا سفید، فاصله را به یک روز برمی‌گرداند.</p><div className="mt-4 flex flex-wrap gap-3"><Button disabled={!data?.due} onClick={() => onPractice({ pool: 'due', includeSamples: true })}>{fa(data?.due ?? 0)} سؤال برای مرور امروز</Button><Button variant="secondary" onClick={() => onPractice({ pool: 'wrong', includeSamples: true })}>تمرین غلط‌های اخیر</Button><Button variant="outline" onClick={() => onPractice({ pool: 'saved', includeSamples: true })}>تمرین نشان‌شده‌ها</Button></div></Panel>
    <QueryState pending={summary.isPending} error={summary.error} retry={summary.refetch} />
    {data && <><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[[data.completed, 'آزمون کامل'], [data.correct, 'پاسخ درست'], [data.wrong, 'پاسخ غلط'], [data.skipped, 'پاسخ سفید']].map(([value, label]) => <Panel key={String(label)}><p className="text-2xl font-bold text-primary">{fa(Number(value))}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></Panel>)}</div><Panel><h3 className="mb-4 flex items-center gap-2 font-bold"><Target size={18} />عملکرد به تفکیک درس</h3>{data.subjects.length ? <div className="grid gap-4">{data.subjects.map((s) => { const total = s.correct + s.wrong + s.skipped; return <div key={s.subjectId}><div className="mb-2 flex justify-between text-sm"><span>{subjectName(s.subjectId)}</span><span>{fa(Math.round(s.correct / total * 100))}٪ درست · {fa(total)} پاسخ</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${s.correct / total * 100}%` }} /></div></div> })}</div> : <p className="text-sm text-muted-foreground">پس از پایان اولین آزمون، عملکردت اینجا دیده می‌شود.</p>}</Panel></>}
    <Panel><h3 className="mb-4 font-bold">آزمون‌های اخیر و آزمون‌های ناتمام</h3><QueryState pending={history.isPending} error={history.error} retry={history.refetch} empty={history.data?.length === 0 && 'هنوز آزمونی شروع نکرده‌ای.'} /><ul className="grid gap-2">{history.data?.map((a) => <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-muted/40 p-3"><span className="flex-1 text-sm">{jalaliDay(new Date(a.startedAt).toISOString().slice(0, 10))} · {a.mode === 'practice' ? 'آموزشی' : 'آزمونی'} · {fa(a.count)} سؤال</span><span className="text-sm font-bold text-primary">{a.result ? `${fa(a.result.percent)}٪` : 'ناتمام'}</span><Button size="sm" variant="outline" onClick={() => onAttempt(a.id)}>{a.finishedAt ? 'پاسخ‌ها و تحلیل' : 'ادامهٔ آزمون'}</Button></li>)}</ul><p className="mt-3 text-xs text-muted-foreground">۵۰ آزمون اخیر نمایش داده می‌شوند.</p></Panel>
  </div>
}

export function WeeklyPanel({ track, onPractice, onPrep }: { track: Track; onPractice: (p: PracticePreset) => void; onPrep: () => void }) {
  const catalog = useQuery({ queryKey: ['learning', 'catalog', track], queryFn: () => learningApi.catalog(track) })
  const [provider, setProvider] = useState('')
  const packs = catalog.data?.packs.filter((p) => !p.isSample && (p.bank === 'weekly' || p.provider === 'konkur') && (!provider || p.provider === provider)) ?? []
  return <div className="grid gap-5"><Panel><h2 className="flex items-center gap-2 text-xl font-bold"><CalendarDays className="text-primary" />آزمون‌های هفتگی و کنکور</h2><p className="mt-3 text-sm leading-8 text-muted-foreground">دفترچه‌های ماز، قلم‌چی، گاج و کنکور، پس از ورود و در زمان انتشار تعیین‌شده، اینجا قرار می‌گیرند.</p><div className="mt-4 flex flex-wrap gap-2">{[['', 'همه'], ['maz', 'ماز'], ['ghalamchi', 'قلم‌چی'], ['gaj', 'گاج'], ['konkur', 'کنکور']].map(([id, label]) => <Button key={id} variant={provider === id ? 'default' : 'secondary'} size="sm" onClick={() => setProvider(id!)}>{label}</Button>)}</div><Button variant="outline" className="mt-4" onClick={onPrep}>ساخت پک آمادگی آزمون</Button></Panel>
    <QueryState pending={catalog.isPending} error={catalog.error} retry={catalog.refetch} empty={!catalog.isPending && !catalog.error && packs.length === 0 && 'هنوز دفترچه‌ای برای این منبع منتشر نشده است.'} />
    <div className="grid gap-4 sm:grid-cols-2">{packs.map((p) => <Panel key={p.id}><p className="text-xs font-bold text-primary">{providerNames[p.provider]} {p.year ? `· ${fa(p.year)}` : ''} {p.period}</p><h3 className="my-3 text-lg font-bold">{p.title}</h3><CountBadge value={p.questionCount} label="سؤال" /><p className="mt-3 text-xs leading-6 text-muted-foreground">{p.attribution}</p><Button className="mt-4 rounded-xl" onClick={() => onPractice({ packIds: [p.id], mode: 'exam' })}>حل دفترچه</Button></Panel>)}</div>
  </div>
}
