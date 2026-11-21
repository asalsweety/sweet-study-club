import { useMutation, useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { NativeSelect } from '../../components/ui/native-select'
import { Textarea } from '../../components/ui/textarea'
import {
  packMetadataInputSchema, questionInputSchema,
  type AdminPack, type AdminQuestion, type PackMetadataInput, type QuestionInput, type Track,
} from '../../shared/api/learning'
import { fa } from '../../shared/lib/format'
import { bankNames, difficultyNames, learningGradeNames, learningTracks, providerNames, subjectName } from '../../shared/lib/learning-catalog'
import { learningApi } from '../learning/api'
import { QueryState } from '../learning/components'
import { Field } from './Field'
import { formText, fromTehranInput, tehranInput } from './form-values'

function SelectOptions({ options }: { options: Record<string, string> }) {
  return <>{Object.entries(options).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</>
}

export function PackForm({ pack, track, close, saved }: {
  pack: AdminPack | null
  track: Track
  close: () => void
  saved: (track: Track, id: string) => void
}) {
  const [problem, setProblem] = useState('')
  const [selectedTrack, setSelectedTrack] = useState(pack?.track ?? track)
  const [availableAt] = useState(() => pack?.availableAt ?? new Date().toISOString())
  const localTime = tehranInput(availableAt)
  const save = useMutation({
    mutationFn: (input: PackMetadataInput) => learningApi.admin.savePack(pack?.id ?? null, input),
    onSuccess: ({ id }, input) => saved(input.track, id),
  })
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const rawTime = formText(form, 'availableAt')
    const year = formText(form, 'year')
    const parsed = packMetadataInputSchema.safeParse({
      key: pack?.key ?? formText(form, 'key'), title: formText(form, 'title'), track: selectedTrack,
      bank: formText(form, 'bank'), provider: formText(form, 'provider'),
      grade: selectedTrack.startsWith('konkur') ? formText(form, 'grade') || null : null,
      year: year ? Number(year) : null, period: formText(form, 'period'), attribution: formText(form, 'attribution'),
      availableAt: rawTime === localTime ? availableAt : fromTehranInput(rawTime),
      isSample: form.has('sample'), isActive: form.has('active'),
    })
    setProblem(parsed.success ? '' : parsed.error.issues[0]?.message ?? 'اطلاعات بسته معتبر نیست.')
    if (parsed.success) save.mutate(parsed.data)
  }
  return <form className="rounded-xl border border-border bg-card p-4" onSubmit={submit}>
    <h3 className="mb-3 font-bold">{pack ? 'ویرایش مشخصات بسته' : 'بستۀ آزمون جدید'}</h3>
    <fieldset disabled={save.isPending} className="grid gap-3 sm:grid-cols-2">
      <Field label="عنوان"><Input name="title" required maxLength={200} defaultValue={pack?.title} /></Field>
      <Field label="کلید انگلیسی بسته"><Input name="key" dir="ltr" required readOnly={Boolean(pack)} maxLength={100} defaultValue={pack?.key} /></Field>
      <Field label="مسیر"><NativeSelect value={selectedTrack} disabled={Boolean(pack?.questionCount)} onChange={(event) => setSelectedTrack(event.target.value as Track)}>
        {learningTracks.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </NativeSelect></Field>
      <Field label="بانک سؤال"><NativeSelect name="bank" defaultValue={pack?.bank ?? 'authored'}><SelectOptions options={bankNames} /></NativeSelect></Field>
      <Field label="منبع"><NativeSelect name="provider" defaultValue={pack?.provider ?? 'authored'}><SelectOptions options={providerNames} /></NativeSelect></Field>
      {selectedTrack.startsWith('konkur') && <Field label="پایۀ تحصیلی"><NativeSelect name="grade" defaultValue={pack?.grade ?? ''}><option value="">بدون پایه</option><SelectOptions options={learningGradeNames} /></NativeSelect></Field>}
      <Field label="سال شمسی"><Input name="year" type="number" min={1300} max={1600} defaultValue={pack?.year ?? ''} /></Field>
      <Field label="نوبت یا دوره"><Input name="period" maxLength={100} defaultValue={pack?.period} /></Field>
      <Field label="زمان انتشار (تهران)"><Input name="availableAt" type="datetime-local" dir="ltr" required defaultValue={localTime} /></Field>
      <div className="sm:col-span-2"><Field label="انتساب و مجوز محتوا"><Textarea name="attribution" rows={2} maxLength={500} required defaultValue={pack?.attribution} /></Field></div>
      <label className="flex items-center gap-2 text-sm"><input name="sample" type="checkbox" defaultChecked={pack?.isSample} /> بستهٔ نمونه</label>
      <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={pack?.isActive} /> منتشر شود</label>
      <div className="flex gap-2 sm:col-span-2"><Button type="submit">ذخیره بسته</Button><Button type="button" variant="ghost" onClick={close}>انصراف</Button></div>
    </fieldset>
    {problem && <p role="alert" className="mt-2 text-sm text-destructive">{problem}</p>}
    <QueryState error={save.error} />
  </form>
}

const options = [0, 1, 2, 3]

function QuestionForm({ pack, question, close, refresh }: { pack: AdminPack; question: AdminQuestion | null; close: () => void; refresh: () => void }) {
  const [problem, setProblem] = useState('')
  const q = question?.content
  const subjects = learningTracks.find((track) => track.id === pack.track)?.subjects ?? []
  const save = useMutation({
    mutationFn: (input: QuestionInput) => learningApi.admin.saveQuestion(pack.id, question?.id ?? null, input),
    onSuccess: () => { refresh(); close() },
  })
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const topicTitle = formText(form, 'topicTitle')
    const important = formText(form, 'important').split(/\r?\n/).filter(Boolean)
    const microLesson = formText(form, 'microLesson')
    const branchText = formText(form, 'branches')
    let branches: unknown = []
    let source: unknown = null
    try {
      branches = JSON.parse(branchText || '[]')
      source = JSON.parse(formText(form, 'source') || 'null')
    } catch {
      setProblem('ساختار JSON مایندمپ یا منبع درست نیست.')
      return
    }
    const parsed = questionInputSchema.safeParse({
      key: formText(form, 'key'), subjectId: formText(form, 'subject'), chapter: formText(form, 'chapter'),
      prompt: formText(form, 'prompt'), options: options.map((index) => formText(form, `option-${index}`)),
      correctIndex: Number(formText(form, 'correctIndex')), explanation: formText(form, 'explanation'),
      difficulty: formText(form, 'difficulty'), language: formText(form, 'language'), source,
      images: formText(form, 'images').split(/\s+/).filter(Boolean),
      topic: topicTitle || important.length || microLesson || branchText ? { title: topicTitle, important, microLesson, branches } : null,
    })
    setProblem(parsed.success ? '' : parsed.error.issues[0]?.message ?? 'اطلاعات سؤال معتبر نیست.')
    if (parsed.success) save.mutate(parsed.data)
  }
  return <form className="rounded-xl border border-border bg-card p-4" onSubmit={submit}>
    <h4 className="mb-3 font-bold">{question ? 'ویرایش سؤال' : 'سؤال جدید'}</h4>
    <fieldset disabled={save.isPending} className="grid gap-3 sm:grid-cols-2">
      <Field label="کلید انگلیسی سؤال"><Input name="key" dir="ltr" maxLength={100} required defaultValue={q?.key} /></Field>
      <Field label="درس"><NativeSelect name="subject" defaultValue={q?.subjectId}>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</NativeSelect></Field>
      <Field label="فصل"><Input name="chapter" maxLength={160} required defaultValue={q?.chapter} /></Field>
      <Field label="سطح"><NativeSelect name="difficulty" defaultValue={q?.difficulty ?? 'medium'}><SelectOptions options={difficultyNames} /></NativeSelect></Field>
      <div className="sm:col-span-2"><Field label="متن سؤال"><Textarea name="prompt" rows={3} maxLength={6000} defaultValue={q?.prompt} /></Field></div>
      {options.map((index) => <Field key={index} label={`گزینۀ ${fa(index + 1)}`}><Input name={`option-${index}`} maxLength={2000} required defaultValue={q?.options[index]} /></Field>)}
      <Field label="پاسخ صحیح"><NativeSelect name="correctIndex" defaultValue={q?.correctIndex ?? 0}>{options.map((index) => <option key={index} value={index}>{fa(index + 1)}</option>)}</NativeSelect></Field>
      <Field label="زبان"><NativeSelect name="language" defaultValue={q?.language ?? 'fa'}><option value="fa">فارسی</option><option value="en">انگلیسی</option></NativeSelect></Field>
      <div className="sm:col-span-2"><Field label="پاسخ تشریحی"><Textarea name="explanation" rows={3} maxLength={12000} required defaultValue={q?.explanation} /></Field></div>
      <details className="grid gap-3 rounded-xl border border-border p-3 sm:col-span-2">
        <summary className="cursor-pointer text-sm font-bold">تصویر، منبع و درسنامه</summary>
        <div className="mt-3 grid gap-3">
          <Field label="مسیر تصاویر (هر تصویر در یک خط)"><Textarea name="images" dir="ltr" rows={2} placeholder="/question-media/example.webp" defaultValue={q?.images.join('\n')} /></Field>
          <Field label="منبع سؤال (JSON)"><Textarea name="source" dir="ltr" rows={3} className="font-mono text-xs" defaultValue={q?.source ? JSON.stringify(q.source, null, 2) : ''} /></Field>
          <Field label="عنوان درسنامه"><Input name="topicTitle" maxLength={200} defaultValue={q?.topic?.title} /></Field>
          <Field label="متن درسنامه"><Textarea name="microLesson" rows={4} maxLength={12000} defaultValue={q?.topic?.microLesson} /></Field>
          <Field label="نکات مهم (هر نکته در یک خط)"><Textarea name="important" rows={3} defaultValue={q?.topic?.important.join('\n')} /></Field>
          <Field label="شاخه‌های مایندمپ (JSON)"><Textarea name="branches" dir="ltr" rows={3} className="font-mono text-xs" placeholder={'[{"title":"…","points":["…"]}]'} defaultValue={q?.topic ? JSON.stringify(q.topic.branches, null, 2) : ''} /></Field>
        </div>
      </details>
      <div className="flex gap-2 sm:col-span-2"><Button type="submit">ذخیره سؤال</Button><Button type="button" variant="ghost" onClick={close}>انصراف</Button></div>
    </fieldset>
    {problem && <p role="alert" className="mt-2 text-sm text-destructive">{problem}</p>}
    <QueryState error={save.error} />
  </form>
}

export function PackQuestions({ pack, refresh }: { pack: AdminPack; refresh: () => void }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState<AdminQuestion | 'new' | null>(null)
  const questions = useQuery({
    queryKey: ['admin', 'learning', 'questions', pack.id, search, page],
    queryFn: () => learningApi.admin.questions(pack.id, search, page),
  })
  const remove = useMutation({ mutationFn: (id: string) => learningApi.admin.removeQuestion(pack.id, id), onSuccess: refresh })
  return <section className="grid gap-3 border-t border-border pt-4" aria-label="سؤال‌های بسته">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <Field label="جستجوی متن، فصل یا کلید سؤال"><Input value={search} maxLength={160} onChange={(event) => { setSearch(event.target.value); setPage(0) }} /></Field>
      <Button size="sm" onClick={() => setEditing('new')}>افزودن سؤال</Button>
    </div>
    {editing !== null && <QuestionForm key={editing === 'new' ? 'new' : editing.id} pack={pack} question={editing === 'new' ? null : editing} close={() => setEditing(null)} refresh={refresh} />}
    <QueryState pending={questions.isPending} error={questions.error} retry={questions.refetch} empty={questions.data?.questions.length === 0 && 'سؤالی پیدا نشد.'} />
    <QueryState error={remove.error} />
    <ul className="grid gap-2">{questions.data?.questions.map((question) => <li key={question.id} className="flex flex-wrap justify-between gap-2 rounded-xl border border-border bg-card p-3">
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-semibold">{question.content.prompt || 'سؤال تصویری'}</p>
        <p className="mt-1 text-xs text-muted-foreground">{subjectName(question.content.subjectId)} · {question.content.chapter}</p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => setEditing(question)}>ویرایش</Button>
        <Button size="sm" variant="outline" disabled={remove.isPending || editing !== null} onClick={() => {
          if (window.confirm('این سؤال از آزمون‌های جدید برداشته شود؟ پاسخ‌های قبلی حفظ می‌شوند.')) remove.mutate(question.id)
        }}>حذف سؤال</Button>
      </div>
    </li>)}</ul>
    {(page > 0 || questions.data?.hasMore) && <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" disabled={!page || questions.isPending} onClick={() => setPage(page - 1)}>قبلی</Button>
      <span className="text-sm">{fa(page + 1)}</span>
      <Button size="sm" variant="outline" disabled={!questions.data?.hasMore} onClick={() => setPage(page + 1)}>بعدی</Button>
    </div>}
  </section>
}
