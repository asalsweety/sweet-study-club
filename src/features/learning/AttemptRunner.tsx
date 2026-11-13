import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Bookmark, Check, ExternalLink, Highlighter, MessageCircle } from 'lucide-react'
import { useRef, useState } from 'react'
import type { z } from 'zod'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../components/ui/dialog'
import { Textarea } from '../../components/ui/textarea'
import type { Attempt, AttemptItem, notebookSchema } from '../../shared/api/learning'
import { difficultyNames, subjectName } from '../../shared/lib/learning-catalog'
import { fa, formatClock } from '../../shared/lib/format'
import { cn } from '../../shared/lib/utils'
import { useNow } from '../study/useStudyTimer'
import { learningApi } from './api'
import { MindMap, Panel, QueryState } from './components'

type Entry = z.infer<typeof notebookSchema>['entries'][number]
function AnnotationEditor({ question, entry, explanationRef }: { question: AttemptItem; entry: Entry | undefined; explanationRef: React.RefObject<HTMLDivElement | null> }) {
  const client = useQueryClient()
  const [saved, setSaved] = useState(entry?.saved ?? false)
  const [note, setNote] = useState(entry?.note ?? '')
  const [highlight, setHighlight] = useState(entry?.highlight ?? '')
  const [selectionError, setSelectionError] = useState('')
  const save = useMutation({ mutationFn: () => learningApi.annotate(question.questionId, { saved, note, highlight }), onSuccess: () => {
    void client.invalidateQueries({ queryKey: ['learning', 'notebook'] })
    void client.invalidateQueries({ queryKey: ['learning', 'summary'] })
  } })
  const capture = () => {
    const selection = window.getSelection()
    const text = selection?.toString().trim() ?? ''
    if (!text || !selection?.anchorNode || !explanationRef.current?.contains(selection.anchorNode) || !explanationRef.current.contains(selection.focusNode) || text.length > 2000) {
      setSelectionError('بخشی از توضیح سؤال را انتخاب کن؛ حداکثر ۲۰۰۰ کاراکتر.')
      return
    }
    setHighlight(text)
    setSelectionError('')
  }
  return <details className="rounded-2xl border border-border/60 p-4" open={saved || undefined}>
    <summary className="cursor-pointer text-sm font-bold"><Bookmark className="ml-2 inline size-4 text-primary" />دفترچهٔ من</summary>
    <div className="mt-4 grid gap-3">
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} /> نشان‌کردن سؤال برای بعد</label>
      <label className="grid gap-2 text-sm font-bold">یادداشت من<Textarea value={note} maxLength={5000} rows={3} onChange={(e) => setNote(e.target.value)} placeholder="نکته یا دلیل اشتباهم…" /></label>
      {question.feedback && <><Button size="sm" variant="secondary" className="justify-self-start" onClick={capture}><Highlighter size={15} />هایلایت متن انتخاب‌شده</Button>{selectionError && <p role="status" className="text-xs text-destructive">{selectionError}</p>}{highlight && <div className="flex items-start gap-2"><mark className="flex-1 rounded-xl bg-primary/15 p-3 text-sm leading-7 text-foreground">{highlight}</mark><Button variant="ghost" size="sm" onClick={() => setHighlight('')}>حذف</Button></div>}</>}
      <Button size="sm" className="justify-self-start" onClick={() => save.mutate()} disabled={save.isPending}>ذخیره در دفترچه</Button>
      {save.isSuccess && <p role="status" className="text-xs text-primary">ذخیره شد.</p>}<QueryState error={save.error} />
    </div>
  </details>
}

function QuestionCard({ attempt, item, index, total, onUpdate, onGo, onFinish, entry, onAsk, notesReady }: {
  attempt: Attempt; item: AttemptItem; index: number; total: number; onUpdate: (a: Attempt) => void;
  onGo: (i: number) => void; onFinish: () => void; entry: Entry | undefined; onAsk: (questionId: string) => void; notesReady: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(item.selectedIndex)
  const [feedbackTab, setFeedbackTab] = useState<'explanation' | 'map' | 'micro'>('explanation')
  const explanationRef = useRef<HTMLDivElement>(null)
  const locked = attempt.finishedAt !== null || (attempt.mode === 'practice' && item.answered)
  const save = useMutation({ mutationFn: () => learningApi.answer(attempt.id, item.questionId, selected), onSuccess: onUpdate })
  const next = async () => {
    if (!locked && (!item.answered || selected !== item.selectedIndex)) {
      try { onUpdate(await save.mutateAsync()) } catch { return }
    }
    if (index + 1 < total) onGo(index + 1)
    else onFinish()
  }
  const submit = () => save.mutate()
  return <Panel className="grid gap-5">
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span className="rounded-full bg-primary/10 px-3 py-1 font-bold text-primary">سؤال {fa(index + 1)} از {fa(total)}</span><span>{subjectName(item.subjectId)} · {item.chapter}</span><span className="mr-auto">{difficultyNames[item.difficulty]}</span></div>
    <p dir={item.language === 'en' ? 'ltr' : 'rtl'} lang={item.language} className="text-base font-bold leading-9 sm:text-lg">{item.prompt}</p>
    {item.images.length > 0 && <div className="grid gap-3">{item.images.map((src, imageIndex) => <figure key={src} className="overflow-hidden rounded-xl border border-border bg-white p-2 sm:p-4"><a href={src} target="_blank" rel="noreferrer" aria-label={`بزرگ‌نمایی تصویر ${fa(imageIndex + 1)} سؤال`}><img src={src} alt={`متن یا شکل اصلی سؤال، تصویر ${fa(imageIndex + 1)}؛ برای بزرگ‌نمایی باز کن`} className="mx-auto h-auto max-w-full" /></a><figcaption className="mt-2 text-center text-xs text-neutral-600">تصویر اصلی دفترچه · برای بزرگ‌نمایی لمس کن</figcaption></figure>)}</div>}
    <div dir={item.language === 'en' ? 'ltr' : 'rtl'} lang={item.language} role="radiogroup" aria-label="گزینه‌های سؤال" className="grid gap-3">{item.options.map((option, i) => {
      const correct = item.feedback?.correctIndex === i
      const wrong = item.feedback && selected === i && !correct
      return <button type="button" role="radio" aria-checked={selected === i} disabled={locked || save.isPending} key={i} onClick={() => setSelected(i)} className={cn('flex min-h-14 items-center gap-3 rounded-xl border p-4 text-start text-sm leading-7 transition focus-visible:ring-2 focus-visible:ring-ring', correct ? 'border-[var(--success)] bg-[var(--success-soft)] text-[var(--success-text)]' : wrong ? 'border-destructive bg-destructive/10 text-destructive' : selected === i ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50')}><span className="grid size-8 shrink-0 place-items-center rounded-lg border border-current/20 font-bold">{correct ? <Check size={16} /> : item.language === 'en' ? String.fromCharCode(65 + i) : fa(i + 1)}</span><span>{option}</span></button>
    })}</div>
    {!locked && <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => setSelected(null)}>پاک‌کردن انتخاب / سفید</Button>}
    <div className="flex flex-wrap gap-2">
      {index > 0 && <Button variant="outline" disabled={save.isPending} onClick={async () => { if (!locked && selected !== item.selectedIndex) { try { await save.mutateAsync() } catch { return } } onGo(index - 1) }}><ArrowRight size={15} />قبلی</Button>}
      {attempt.mode === 'practice' && !locked ? <Button onClick={submit} disabled={save.isPending}>{selected === null ? 'سفید و مشاهدهٔ پاسخ' : 'ثبت و مشاهدهٔ پاسخ'}</Button> : <Button onClick={() => { void next() }} disabled={save.isPending}>{index + 1 < total ? 'ذخیره و سؤال بعد' : attempt.finishedAt ? 'نتیجهٔ آزمون' : 'ذخیره و پایان آزمون'}</Button>}
    </div>
    <QueryState error={save.error} />
    <p className="text-xs text-muted-foreground">منبع: {item.packTitle}{item.isSample && ' · نمونهٔ آموزشی؛ سؤال رسمی نیست'}</p>
    {item.source && <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/40 p-3 text-[11px] leading-6 text-muted-foreground"><span dir="auto">{item.source.name}</span><a href={item.source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-primary"><ExternalLink size={12} />مشاهدهٔ منبع</a><a href="/licenses/learning-content-NOTICE.txt" target="_blank" rel="noreferrer" className="underline">{item.source.license} · انتساب</a><span>{item.language === 'en' ? 'متن اصلی انگلیسی' : 'فارسی'}</span></div>}
    {item.feedback && <div className="grid gap-4 border-t border-border/60 pt-5">
      <p className="text-sm font-bold text-[var(--success-text)]">پاسخ صحیح: گزینهٔ {item.language === 'en' ? String.fromCharCode(65 + item.feedback.correctIndex) : fa(item.feedback.correctIndex + 1)}</p>
      <div className="flex flex-wrap gap-2">{([['explanation', 'توضیح پاسخ'], ['map', 'مایندمپ'], ['micro', 'میکرودرسنامه']] as const).map(([id, label]) => <Button key={id} variant={feedbackTab === id ? 'default' : 'secondary'} size="sm" onClick={() => setFeedbackTab(id)}>{label}</Button>)}</div>
      <div ref={explanationRef}>{feedbackTab === 'explanation' ? <p dir={item.language === 'en' ? 'ltr' : 'rtl'} lang={item.language} className="whitespace-pre-wrap text-sm leading-8">{item.feedback.explanation}</p> : item.feedback.topic ? <MindMap topic={item.feedback.topic} micro={feedbackTab === 'micro'} /> : <p className="text-sm text-muted-foreground">برای این سؤال هنوز محتوای مرتبط ثبت نشده است.</p>}</div>
      <p className="text-xs leading-6 text-muted-foreground">پاسخ‌های ثبت‌شدهٔ شرکت‌کنندگان: {fa(item.feedback.stats.correct)} درست · {fa(item.feedback.stats.wrong)} غلط · {fa(item.feedback.stats.skipped)} سفید. هر نفر با آخرین آزمون پایان‌یافته‌اش شمرده می‌شود.</p>
      <Button variant="outline" className="justify-self-start" size="sm" onClick={() => onAsk(item.questionId)}><MessageCircle size={16} />پرسش از دستیار دربارهٔ سؤال</Button>
    </div>}
    {notesReady && <AnnotationEditor question={item} entry={entry} explanationRef={explanationRef} />}
  </Panel>
}

export default function AttemptRunner({ id, initial, onBack, onAsk }: { id: string; initial?: Attempt | undefined; onBack: () => void; onAsk: (attemptId: string, questionId?: string) => void }) {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['learning', 'attempt', id], queryFn: () => learningApi.attempt(id), ...(initial ? { initialData: initial } : {}) })
  const attempt = query.data
  const [index, setIndex] = useState(0)
  const [confirm, setConfirm] = useState(false)
  const [showResult, setShowResult] = useState(Boolean(initial?.finishedAt))
  const now = useNow(1000)
  const notes = useQuery({ queryKey: ['learning', 'notebook', attempt?.track], queryFn: () => learningApi.notebook(attempt!.track), enabled: Boolean(attempt) })
  const update = (a: Attempt) => client.setQueryData(['learning', 'attempt', id], a)
  const finish = useMutation({ mutationFn: () => learningApi.finish(id), onSuccess: (a) => {
    update(a); setConfirm(false); setShowResult(true)
    void client.invalidateQueries({ queryKey: ['learning', 'summary'] })
    void client.invalidateQueries({ queryKey: ['learning', 'history'] })
    void client.invalidateQueries({ queryKey: ['learning', 'count'] })
  } })
  const finishOrResult = () => attempt?.finishedAt ? setShowResult(true) : setConfirm(true)
  const item = attempt?.items[index]
  return <div className="grid gap-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><Button variant="ghost" onClick={onBack}><ArrowRight />بازگشت به یادگیری</Button>{attempt && <span className="text-sm font-bold text-muted-foreground">{attempt.mode === 'exam' ? 'آزمونی' : 'آموزشی'} · {formatClock(((attempt.finishedAt ?? now) - attempt.startedAt) / 1000)}</span>}</header>
    <QueryState pending={query.isPending} error={query.error} retry={query.refetch} />
    {attempt && <>
      {showResult && attempt.result ? <Panel className="grid gap-5"><h2 className="text-2xl font-bold">نتیجهٔ آزمون</h2><p className="text-4xl font-bold text-primary">{fa(attempt.result.percent)}٪</p><p className="text-sm">{fa(attempt.result.correct)} درست · {fa(attempt.result.wrong)} غلط · {fa(attempt.result.skipped)} سفید</p><p className="text-xs text-muted-foreground">درصد با نمرهٔ منفی محاسبه شده است.</p><div className="flex flex-wrap gap-2"><Button onClick={() => { setIndex(0); setShowResult(false) }}>مرور پاسخ‌ها</Button><Button variant="secondary" onClick={() => onAsk(id)}>تحلیل با هوش مصنوعی</Button></div></Panel> : <>
        <div className="flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${attempt.items.filter((q) => q.answered).length / attempt.items.length * 100}%` }} /></div><span className="text-xs text-muted-foreground">{fa(attempt.items.filter((q) => q.answered).length)} / {fa(attempt.items.length)} ثبت‌شده</span><Button size="sm" variant="outline" onClick={finishOrResult}>{attempt.finishedAt ? 'نتیجه' : 'پایان آزمون'}</Button></div>
        <QueryState error={notes.error} retry={notes.refetch} />
        {item && <QuestionCard key={`${item.questionId}-${item.answered}-${attempt.finishedAt}`} attempt={attempt} item={item} index={index} total={attempt.items.length} onUpdate={update} onGo={setIndex} onFinish={finishOrResult} entry={notes.data?.find((e) => e.questionId === item.questionId)} onAsk={(q) => onAsk(id, q)} notesReady={notes.isSuccess} />}
      </>}
    </>}
    <Dialog open={confirm} onOpenChange={setConfirm}><DialogContent dir="rtl"><DialogTitle>پایان آزمون</DialogTitle><DialogDescription>پاسخ‌های ذخیره‌شده نهایی می‌شوند. سؤال‌های بدون پاسخ، سفید حساب می‌شوند و گزینه‌های تغییرکرده‌ای که ذخیره نکرده‌ای ثبت نمی‌شوند.</DialogDescription><div className="flex gap-2"><Button onClick={() => finish.mutate()} disabled={finish.isPending}>پایان و نمایش نتیجه</Button><Button variant="secondary" onClick={() => setConfirm(false)}>ادامهٔ حل</Button></div><QueryState error={finish.error} /></DialogContent></Dialog>
  </div>
}
