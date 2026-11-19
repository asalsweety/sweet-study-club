import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, BookOpen, Check, CheckCheck, ClipboardList, ExternalLink, GraduationCap, Search, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { NativeSelect } from '../../components/ui/native-select'
import type { Attempt, PracticeFilter, StartAttempt, Track } from '../../shared/api/learning'
import { learningGradeSchema, practiceFilterSchema } from '../../shared/api/learning'
import { bankNames, difficultyNames, learningGradeNames, learningTracks, providerNames } from '../../shared/lib/learning-catalog'
import { fa } from '../../shared/lib/format'
import { cn } from '../../shared/lib/utils'
import { learningApi } from './api'
import { Panel, QueryState } from './components'
import SubjectIcon from './SubjectIcon'

export type PracticePreset = Partial<PracticeFilter> & { mode?: StartAttempt['mode'] }
const searchText = (text: string) => text.trim().replaceAll('‌', ' ').replaceAll('ي', 'ی').replaceAll('ك', 'ک').replace(/\s+/g, '')

export default function PracticeBuilder({ track, preset, onStart }: { track: Track; preset: PracticePreset; onStart: (a: Attempt) => void }) {
  const [filter, setFilter] = useState<PracticeFilter>(() => practiceFilterSchema.parse({ track, ...preset }))
  const [mode, setMode] = useState<'practice' | 'exam'>(preset.mode ?? 'practice')
  const [count, setCount] = useState(20)
  const [search, setSearch] = useState('')
  const [showEmpty, setShowEmpty] = useState(false)
  const [startId] = useState(() => crypto.randomUUID())
  const catalog = useQuery({ queryKey: ['learning', 'catalog', track], queryFn: () => learningApi.catalog(track) })
  const countQuery = useQuery({ queryKey: ['learning', 'count', filter], queryFn: () => learningApi.count(filter) })
  const start = useMutation({ mutationFn: () => learningApi.start({ ...filter, id: startId, mode, count }), onSuccess: onStart })
  const update = (changes: Partial<PracticeFilter>) => setFilter((f) => ({ ...f, ...changes }))
  const allSubjects = learningTracks.find((t) => t.id === track)!.subjects
  const eligiblePacks = (catalog.data?.packs ?? []).filter((p) => (filter.includeSamples || !p.isSample) && (!filter.bank || p.bank === filter.bank) && (!filter.provider || p.provider === filter.provider) && (!filter.grade || p.grade === filter.grade))
  const matchingChapters = (catalog.data?.chapters ?? []).filter((c) => !filter.difficulty || c.difficulty === undefined || c.difficulty === filter.difficulty)
  const countsByPack = new Map<string, number>()
  for (const chapter of matchingChapters) countsByPack.set(chapter.packId, (countsByPack.get(chapter.packId) ?? 0) + chapter.count)
  const packs = eligiblePacks.filter((p) => (!filter.year || p.year === filter.year) && (!filter.period || p.period === filter.period) && countsByPack.has(p.id))
  const visibleIds = new Set(packs.filter((p) => !filter.packIds.length || filter.packIds.includes(p.id)).map((p) => p.id))
  const catalogChapters = matchingChapters.filter((c) => visibleIds.has(c.packId))
  const subjectCount = (id: string) => catalogChapters.filter((c) => c.subjectId === id).reduce((sum, c) => sum + c.count, 0)
  const subjectChapters = (id: string) => new Set(catalogChapters.filter((c) => c.subjectId === id).map((c) => c.chapter)).size
  const availableSubjects = allSubjects.filter((s) => subjectCount(s.id) > 0)
  const term = searchText(search)
  const subjects = (showEmpty ? allSubjects : availableSubjects).filter((s) => searchText(s.name).includes(term) || catalogChapters.some((c) => c.subjectId === s.id && searchText(c.chapter).includes(term)))
  const chapters = [...new Set(catalogChapters.filter((c) => filter.subjectIds.includes(c.subjectId)).map((c) => c.chapter))]
  const years = [...new Set(eligiblePacks.flatMap((p) => p.year === null ? [] : [p.year]))].sort((a, b) => b - a)
  const periods = [...new Set(eligiblePacks.map((p) => p.period).filter(Boolean))]
  const matches = countQuery.data?.count ?? 0
  const countDisplay = countQuery.isPending ? '…' : countQuery.isError ? '—' : fa(matches)
  const clearFilters = () => {
    setSearch('')
    setFilter(practiceFilterSchema.parse({ track }))
  }

  return <div className="practice-layout grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,35.07%)]">
        <div className="practice-bank-types flex flex-wrap gap-2" aria-label="نوع بانک سؤال">{([['', 'همۀ سؤال‌ها'], ['reference', 'منابع باز'], ['national', 'کشوری'], ['authored', 'تألیفی'], ['weekly', 'هفتگی']] as const).map(([id, name]) => <button key={id} type="button" aria-pressed={(filter.bank ?? '') === id} onClick={() => update({ bank: (id || undefined) as PracticeFilter['bank'], packIds: [], subjectIds: [], chapters: [], year: undefined, period: undefined, provider: undefined, questionIds: [] })} className={cn('min-h-9 rounded-lg px-3 text-xs font-bold transition-colors', (filter.bank ?? '') === id ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground hover:bg-muted')}>{name}</button>)}</div>
    <div className="contents">
      <Panel className="practice-subjects">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">چه چیزی را تمرین می‌کنی؟</h2><p className="mt-1 text-xs leading-6 text-muted-foreground">درس‌ها و فصل‌ها را انتخاب کن؛ جلسه را به اندازۀ خودت بساز.</p></div></div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <label className="grid min-w-0 gap-2 text-xs font-bold">جست‌وجوی درس یا فصل
            <span className="relative"><Search size={17} className="pointer-events-none absolute top-3 right-3 text-muted-foreground" /><Input className="h-11 rounded-xl bg-background/60 pr-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="مثلاً آمار و احتمال" /></span>
          </label>
          {track.startsWith('konkur') && <label className="grid min-w-0 gap-2 text-xs font-bold">پایه یا کنکور
            <NativeSelect className="h-11" value={filter.grade ?? ''} onChange={(e) => {
              const grade = learningGradeSchema.safeParse(e.target.value)
              update({ grade: grade.success ? grade.data : undefined, packIds: [], questionIds: [], subjectIds: [], chapters: [], year: undefined, period: undefined })
            }}>
              <option value="">همۀ پایه‌ها و کنکور</option>
              {learningGradeSchema.options.map((id) => <option key={id} value={id}>{learningGradeNames[id]}</option>)}
            </NativeSelect>
          </label>}
        </div>
        <QueryState pending={catalog.isPending} error={catalog.error} retry={catalog.refetch} />
        <div className="practice-subject-list grid grid-cols-2 gap-3 sm:grid-cols-3">{subjects.map((s, index) => { const selected = filter.subjectIds.includes(s.id); return <button key={s.id} type="button" aria-pressed={selected} onClick={() => update({ subjectIds: selected ? filter.subjectIds.filter((id) => id !== s.id) : [...filter.subjectIds, s.id], chapters: [] })} className={cn('relative flex min-h-36 flex-col items-start rounded-xl border p-4 text-right transition-colors', selected ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border bg-card hover:border-primary/50 hover:bg-muted/30')}><SubjectIcon id={s.id} index={index} />{selected && <Check size={16} className="absolute top-4 left-4 text-primary" />}<span className="mt-3 text-sm font-bold">{s.name}</span><span className="mt-1 text-[11px] leading-6 text-muted-foreground">{catalog.isPending ? <span className="skeleton inline-block h-3 w-20 rounded-full align-middle" aria-label="در حال بارگذاری" /> : subjectCount(s.id) ? `${fa(subjectCount(s.id))} سؤال · ${fa(subjectChapters(s.id))} فصل` : 'هنوز محتوایی وارد نشده'}</span></button> })}</div>
        {catalog.isSuccess && subjects.length === 0 && <QueryState empty={term ? 'درس یا فصلی با این نام در انتخاب فعلی پیدا نشد.' : 'برای این پایه یا منبع هنوز سؤالی در دسترس نیست.'} />}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground"><span>{filter.subjectIds.length ? `${fa(filter.subjectIds.length)} درس انتخاب شده` : 'انتخاب فعلی: جامع همۀ درس‌ها'}</span><Button variant="ghost" size="sm" onClick={() => update({ subjectIds: [], chapters: [], packIds: [], questionIds: [] })}><CheckCheck size={15} />همۀ درس‌ها</Button><label className="flex items-center gap-2"><input type="checkbox" checked={showEmpty} onChange={(e) => setShowEmpty(e.target.checked)} />نمایش درس‌های بدون محتوا</label></div>
        {filter.subjectIds.length > 0 && chapters.length > 0 && <fieldset className="mt-5 border-t border-border pt-4"><legend className="px-2 text-xs font-bold">فصل‌های انتخابی · انتخاب خالی یعنی همۀ فصل‌ها</legend><div className="mt-2 flex max-h-52 flex-wrap gap-2 overflow-y-auto">{chapters.map((chapter) => <label key={chapter} className="flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-xs leading-6"><input type="checkbox" checked={filter.chapters.includes(chapter)} onChange={(e) => update({ chapters: e.target.checked ? [...filter.chapters, chapter] : filter.chapters.filter((c) => c !== chapter) })} />{chapter}</label>)}</div></fieldset>}
      </Panel>
      {packs.length > 0 && <Panel className="order-3 xl:col-start-1 xl:row-start-3"><div className="mb-4 flex items-center justify-between"><h2 className="text-base font-bold">مجموعه‌های کتابخانه</h2><span className="text-xs text-muted-foreground">{fa(packs.length)} مجموعه</span></div><div className="grid gap-3 sm:grid-cols-2">{packs.map((p) => <article key={p.id} className={cn('flex flex-col rounded-xl border p-4', filter.packIds.includes(p.id) ? 'border-primary bg-primary/5' : 'border-border')}><div className="flex items-center justify-between gap-2 text-[10px] font-bold"><span className="rounded-md bg-muted px-2 py-1 text-muted-foreground">{providerNames[p.provider]}</span><span className="text-muted-foreground">{p.language === 'en' ? 'متن اصلی انگلیسی' : 'فارسی'}{p.isSample ? ' · نمونه' : ''}</span></div><h3 className="mt-3 text-sm font-bold leading-7">{p.title}</h3><p className="mb-4 mt-1 text-xs text-muted-foreground">{fa(countsByPack.get(p.id) ?? 0)} سؤال با پاسخ{p.grade ? ` · ${learningGradeNames[p.grade]}` : ''}{p.year ? ` · ${fa(p.year)}` : ''}</p><div className="mt-auto flex flex-wrap items-center justify-between gap-2">{p.sourceUrl ? <a href={p.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary"><ExternalLink size={12} />منبع</a> : <span className="text-[11px] text-muted-foreground">{bankNames[p.bank]}</span>}<Button variant={filter.packIds.includes(p.id) ? 'secondary' : 'ghost'} size="sm" onClick={() => update({ packIds: filter.packIds.includes(p.id) ? [] : [p.id], subjectIds: [], chapters: [], questionIds: [] })}>{filter.packIds.includes(p.id) ? 'انتخاب شده' : 'انتخاب مجموعه'}<ArrowLeft size={14} /></Button></div></article>)}</div></Panel>}
    </div>
    <aside className="order-2 grid gap-4 xl:sticky xl:top-20 xl:col-start-2 xl:row-span-2 xl:row-start-2" aria-label="تنظیم جلسۀ تمرین">
      <Panel className="practice-setup grid gap-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground"><BookOpen size={19} /></span>
          <div className="min-w-0"><h2 className="font-bold">تنظیم جلسۀ تمرین</h2><p className="mt-1 text-[11px] text-muted-foreground">یک قدم کوچک، یادگیری عمیق‌تر</p></div>
          <img src="/images/figma/learning-honey-trail.webp" width={134} height={134} alt="" className="practice-honey-art pointer-events-none absolute dark:hidden" />
        </div>
        <div className="rounded-xl bg-background p-4"><p className="text-xs text-muted-foreground">سؤال‌های مطابق انتخاب</p><p className="mt-2 text-3xl font-bold tracking-tight">{countDisplay}<span className="mr-2 text-xs font-normal text-muted-foreground">سؤال</span></p></div>
        {filter.questionIds.length > 0 && <div className="text-xs leading-7 text-muted-foreground">{fa(filter.questionIds.length)} سؤال مشخص از محتوای انتخابی<Button variant="link" size="sm" onClick={() => update({ questionIds: [] })}>انتخاب از کل بانک</Button></div>}
        <fieldset><legend className="mb-3 text-xs font-bold">شیوۀ حل</legend><div className="grid grid-cols-2 gap-2">{([['practice', 'آموزشی', GraduationCap], ['exam', 'آزمونی', ClipboardList]] as const).map(([id, name, Icon]) => <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)} className={cn('flex flex-col items-center gap-2 rounded-xl border py-3 text-xs font-bold', mode === id ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground')}><Icon size={19} />{name}</button>)}</div><p className="mt-2 text-[11px] leading-6 text-muted-foreground">{mode === 'practice' ? 'پاسخ و توضیح، پس از هر سؤال' : 'پاسخ‌ها، پس از پایان آزمون'}</p></fieldset>
        <label className="grid gap-2 text-xs font-bold">تعداد سؤال<Input className="rounded-lg" type="number" min={1} max={100} value={count} onChange={(e) => setCount(Number(e.target.value))} /></label><Button className="h-12 w-full rounded-xl font-bold" disabled={start.isPending || !countQuery.isSuccess || !matches || count < 1 || count > 100 || !Number.isInteger(count)} onClick={() => start.mutate()}>{start.isPending ? 'در حال آماده‌سازی…' : `شروع ${mode === 'exam' ? 'آزمون' : 'تمرین'}`}<ArrowLeft size={16} /></Button><p className="-mt-2 text-center text-[11px] leading-6 text-muted-foreground">{countQuery.isSuccess && matches > 0 ? `${fa(Math.min(count, matches))} سؤال در این جلسه · با نمرۀ منفی` : ''}</p><QueryState error={start.error} /><QueryState error={countQuery.error} retry={countQuery.refetch} />{countQuery.isSuccess && matches === 0 && <div className="text-center text-xs text-muted-foreground"><p>سؤالی مطابق فیلترهای فعلی پیدا نشد.</p><Button variant="link" size="sm" onClick={clearFilters}>پاک کردن فیلترها</Button></div>}
      </Panel>
      <Panel><details><summary className="flex cursor-pointer items-center gap-2 text-sm font-bold"><Settings2 size={16} className="text-muted-foreground" />فیلترهای بیشتر</summary><div className="mt-5 grid gap-4">
        <label className="grid gap-2 text-xs font-bold">منبع<NativeSelect value={filter.provider ?? ''} onChange={(e) => update({ provider: (e.target.value || undefined) as PracticeFilter['provider'], packIds: [], subjectIds: [], chapters: [], year: undefined, period: undefined })}><option value="">همۀ منابع</option>{Object.entries(providerNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</NativeSelect></label>
        <label className="grid gap-2 text-xs font-bold">سال<NativeSelect value={filter.year ?? ''} onChange={(e) => update({ year: e.target.value ? Number(e.target.value) : undefined, packIds: [], subjectIds: [], chapters: [] })}><option value="">همۀ سال‌ها</option>{years.map((year) => <option key={year} value={year}>{fa(year)}</option>)}</NativeSelect></label>
        <label className="grid gap-2 text-xs font-bold">دوره<NativeSelect value={filter.period ?? ''} onChange={(e) => update({ period: e.target.value || undefined, packIds: [], subjectIds: [], chapters: [] })}><option value="">همۀ دوره‌ها</option>{periods.map((period) => <option key={period}>{period}</option>)}</NativeSelect></label>
        <label className="grid gap-2 text-xs font-bold">سطح سؤال<NativeSelect value={filter.difficulty ?? ''} onChange={(e) => update({ difficulty: (e.target.value || undefined) as PracticeFilter['difficulty'], chapters: [] })}><option value="">همۀ سطح‌ها</option>{Object.entries(difficultyNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</NativeSelect></label>
        <label className="grid gap-2 text-xs font-bold">مجموعۀ شخصی<NativeSelect value={filter.pool} onChange={(e) => update({ pool: e.target.value as PracticeFilter['pool'] })}><option value="all">همۀ سؤال‌ها</option><option value="saved">نشان‌شده‌ها</option><option value="wrong">آخرین پاسخ‌های غلط</option><option value="due">مرورهای امروز</option></NativeSelect></label>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={filter.includeSamples} onChange={(e) => update({ includeSamples: e.target.checked, packIds: [] })} />نمایش نمونه‌های آزمایشی</label>
      </div></details></Panel>
    </aside>
  </div>
}
