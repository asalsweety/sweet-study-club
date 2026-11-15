import PageHeading from '../components/PageHeading'
import QueryError from '../components/QueryError'
import { lazy, Suspense, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Bookmark, FolderOpen, GitBranch, RotateCcw } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useSettings } from '../app/session'
import { tracksForProfile } from '../shared/lib/education'
import { NativeSelect } from '../components/ui/native-select'
import { learningTracks } from '../shared/lib/learning-catalog'
import { trackSchema, type Attempt } from '../shared/api/learning'
import { fa } from '../shared/lib/format'
import { cn } from '../shared/lib/utils'
import PracticeBuilder, { type PracticePreset } from '../features/learning/PracticeBuilder'
import { NotebookPanel, ReviewPanel, TopicsPanel, WeeklyPanel } from '../features/learning/LibraryPanels'
import AttemptRunner from '../features/learning/AttemptRunner'
import ScoresPanel from '../features/learning/ScoresPanel'
import { learningApi } from '../features/learning/api'

const PrepPanel = lazy(() => import('../features/learning/PrepPanel'))
const AssistantPanel = lazy(() => import('../features/learning/AssistantPanel'))
const tabs = [
  { id: 'bank', name: 'بانک سؤال', icon: BookOpen }, { id: 'maps', name: 'نقشۀ یادگیری', icon: GitBranch },
  { id: 'review', name: 'مرور و عملکرد', icon: RotateCcw }, { id: 'notebook', name: 'دفترچۀ من', icon: Bookmark },
] as const
const tools = [['weekly', 'آزمون‌های هفتگی'], ['micro', 'میکرودرسنامه'], ['prep', 'پک آمادگی'], ['scores', 'روند تراز'], ['assistant', 'دستیار مطالعه']] as const

export default function LearningPage() {
  const [params, setParams] = useSearchParams()
  const settings = useSettings()
  // Only the tracks that fit the learner's education profile.
  const allowed = tracksForProfile(settings.data?.educationGroup, settings.data?.educationStage)
  const requested = trackSchema.safeParse(params.get('track'))
  const track = requested.success && allowed.includes(requested.data) ? requested.data : allowed[0] ?? 'konkur'
  const trackOptions = learningTracks.filter((t) => allowed.includes(t.id))
  const isKonkur = track.startsWith('konkur')
  const visibleTools = tools.filter(([id]) => id !== 'weekly' || isKonkur)
  const tab = [...tabs, ...visibleTools.map(([id]) => ({ id }))].some((t) => t.id === params.get('tab')) ? params.get('tab')! : 'bank'
  const attemptId = params.get('attempt')
  const catalog = useQuery({ queryKey: ['learning', 'catalog', track], queryFn: () => learningApi.catalog(track) })
  const realPacks = catalog.data?.packs.filter((p) => !p.isSample) ?? []
  const realIds = new Set(realPacks.map((p) => p.id))
  const questionCount = realPacks.reduce((sum, p) => sum + p.questionCount, 0)
  const chapterCount = new Set(catalog.data?.chapters.filter((c) => realIds.has(c.packId)).map((c) => `${c.subjectId}:${c.chapter}`)).size
  const [initial, setInitial] = useState<Attempt | undefined>()
  const [preset, setPreset] = useState<PracticePreset>({})
  const [builderKey, setBuilderKey] = useState(0)
  const selectTab = (id: string) => setParams({ track, tab: id })
  const practice = (p: PracticePreset) => { setPreset(p); setBuilderKey((k) => k + 1); selectTab('bank'); window.scrollTo({ top: 0, behavior: 'instant' }) }
  const ask = (id: string, questionId?: string) => setParams({ track, tab: 'assistant', ...(questionId ? { question: questionId } : { analysisAttempt: id }) })
  const onStart = (a: Attempt) => { setInitial(a); setParams({ track: a.track, tab, attempt: a.id }); window.scrollTo({ top: 0, behavior: 'instant' }) }
  const context = { ...(params.get('analysisAttempt') ? { attemptId: params.get('analysisAttempt')! } : {}), ...(params.get('question') ? { questionId: params.get('question')! } : {}), ...(params.get('score') ? { scoreId: params.get('score')! } : {}) }
  const stats = [{ value: questionCount, name: 'سؤال در دسترس', icon: BookOpen }, { value: chapterCount, name: 'فصل برای یادگیری', icon: GitBranch }, { value: realPacks.length, name: 'مجموعۀ منبع‌دار', icon: FolderOpen }]
  return <div className="grid gap-6">
    <PageHeading eyebrow="فهمیدن، تمرین‌کردن، به‌خاطر سپردن" title="فضای یادگیری" description="یک درس انتخاب کن و قدم بعدی یادگیری‌ات را بساز." action={trackOptions.length > 1 ? <label className="grid w-full gap-2 text-xs text-muted-foreground sm:w-56">مسیر تحصیلی<NativeSelect className="h-11 bg-card" value={track} onChange={(e) => { setPreset({}); setParams({ track: e.target.value, tab }); setInitial(undefined) }}>{trackOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</NativeSelect></label> : <Link to="/welcome" className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm transition-colors hover:border-primary/40" title="تغییر مسیر تحصیلی"><span className="text-xl" aria-hidden>{trackOptions[0]?.emoji}</span><span><span className="block text-[11px] text-muted-foreground">مسیر تحصیلی</span><span className="font-bold">{trackOptions[0]?.name}</span></span></Link>} />
    {catalog.isError && <QueryError error={catalog.error} retry={() => void catalog.refetch()} />}
    {attemptId ? <AttemptRunner key={attemptId} id={attemptId} initial={initial?.id === attemptId ? initial : undefined} onBack={() => selectTab('review')} onAsk={ask} /> : <>
      <div className="grid grid-cols-3 divide-x divide-x-reverse divide-border rounded-2xl border border-border bg-card py-4">{stats.map(({ value, name, icon: Icon }) => <div key={name} className="flex items-center justify-center gap-3 px-2 sm:px-5"><Icon size={21} strokeWidth={1.5} className="hidden text-muted-foreground/70 sm:block" /><div><p className="text-xl font-bold tabular-nums">{catalog.isPending || catalog.isError ? '—' : fa(value)}</p><p className="mt-1 text-[10px] leading-5 text-muted-foreground sm:text-xs">{name}</p></div></div>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border"><nav aria-label="بخش‌های یادگیری" className="grid w-full grid-cols-4 sm:w-auto sm:flex">{tabs.map(({ id, name, icon: Icon }) => <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => selectTab(id)} className={cn('-mb-px flex min-h-12 items-center justify-center gap-2 border-b-2 px-2 text-[11px] font-bold transition-colors sm:px-4 sm:text-sm', tab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}><Icon size={16} className="hidden sm:block" />{name}</button>)}</nav><label className="mb-3 w-full sm:mb-2 sm:w-44"><span className="mb-1 block text-[10px] text-muted-foreground">ابزار مطالعه</span><NativeSelect className="h-9 rounded-lg border-border bg-card text-xs" value={visibleTools.some(([id]) => id === tab) ? tab : ''} onChange={(e) => { if (e.target.value) selectTab(e.target.value) }}><option value="">ابزارهای بیشتر</option>{visibleTools.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</NativeSelect></label></div>
      <Suspense fallback={<p role="status" className="py-8 text-center text-sm">در حال بارگذاری…</p>}>
        {tab === 'bank' && <PracticeBuilder key={`${track}-${builderKey}`} track={track} preset={preset} onStart={onStart} />}
        {tab === 'weekly' && <WeeklyPanel key={track} track={track} onPractice={practice} onPrep={() => selectTab('prep')} />}
        {(tab === 'maps' || tab === 'micro') && <TopicsPanel key={`${track}-${tab}-${params.get('subject') ?? ''}`} track={track} micro={tab === 'micro'} onPractice={practice} subjectId={params.get('subject') ?? ''} />}
        {tab === 'review' && <ReviewPanel key={track} track={track} onPractice={practice} onAttempt={(id) => setParams({ track, tab, attempt: id })} />}
        {tab === 'notebook' && <NotebookPanel key={track} track={track} onPractice={practice} />}
        {tab === 'prep' && <PrepPanel key={track} track={track} onPractice={practice} onLearn={(subject) => setParams({ track, tab: 'micro', subject })} />}
        {tab === 'scores' && <ScoresPanel onAnalyze={(id) => setParams({ track, tab: 'assistant', score: id })} />}
        {tab === 'assistant' && <AssistantPanel key={JSON.stringify(context)} context={context} onClear={() => selectTab('assistant')} />}
      </Suspense>
    </>}
  </div>
}
