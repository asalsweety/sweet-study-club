import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { appRoutes } from '../app/navigation/routes'
import { offlineAccountId, readOfflineStorage } from '../shared/api/offline-cache'
import { Button } from '../components/ui/button'
import { MindMap, Panel, QueryState } from '../features/learning/components'
import { getSavedPack, listSavedPacks, removeSavedPack, type SavedPack } from '../features/learning/offline-library'
import { fa } from '../shared/lib/format'
import { subjectName } from '../shared/lib/learning-catalog'
import { cn } from '../shared/lib/utils'

function SavedImage({ image, alt }: { image: Blob; alt: string }) {
  const [source, setSource] = useState('')
  useEffect(() => {
    const url = URL.createObjectURL(image)
    setSource(url)
    return () => URL.revokeObjectURL(url)
  }, [image])
  return source && <img src={source} alt={alt} className="mx-auto max-h-[36rem] max-w-full rounded-xl object-contain" />
}

const readingProgressSchema = z.object({ position: z.number().int().nonnegative(), responses: z.record(z.string(), z.number().int().nonnegative()) })

function PackReader({ pack, onBack }: { pack: SavedPack; onBack: () => void }) {
  const key = `sweet-study:offline-reading:${offlineAccountId() ?? 'guest'}:${pack.id}`
  const [progress, setProgress] = useState(() => {
    const saved = readingProgressSchema.safeParse(readOfflineStorage(key))
    return saved.success && saved.data.position < pack.questionCount ? saved.data : { position: 0, responses: {} }
  })
  const { position, responses } = progress
  function updateProgress(next: typeof progress) {
    setProgress(next)
    try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* The current reading session can still continue. */ }
  }
  function goToQuestion(index: number) {
    updateProgress({ position: index, responses })
    window.scrollTo(0, 0)
  }
  const question = pack.questions[position]
  return <Panel className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-lg font-bold">{pack.title}</h2>
      <Button size="sm" variant="outline" onClick={onBack}>همۀ بسته‌ها</Button>
    </div>
    {question && <div key={question.questionId} className="grid gap-4">
      <p className="text-xs text-muted-foreground">
        سؤال {fa(position + 1)} از {fa(pack.questionCount)} · {subjectName(question.subjectId)} · {question.chapter}
      </p>
      <fieldset dir={question.language === 'en' ? 'ltr' : 'rtl'} className="grid gap-3">
        <legend className="mb-3 whitespace-pre-wrap text-base font-bold leading-8">{question.prompt || 'سؤال تصویری'}</legend>
        {question.images.map((path, index) => pack.images[path] &&
          <SavedImage key={path} image={pack.images[path]} alt={`تصویر ${fa(index + 1)} سؤال`} />)}
        {question.options.map((option, index) => {
          const checked = responses[question.questionId] === index
          return <label key={index} className={cn('flex cursor-pointer items-start gap-3 rounded-xl border border-border px-3 py-2 text-sm leading-7', checked && 'border-primary bg-primary/10')}>
            <input type="radio" name="offline-answer" className="mt-2" checked={checked}
              onChange={() => updateProgress({ position, responses: { ...responses, [question.questionId]: index } })} />
            <span className="whitespace-pre-wrap">{option}</span>
          </label>
        })}
      </fieldset>
      {question.topic && <details className="rounded-xl border border-border p-3">
        <summary className="cursor-pointer text-sm font-bold">درسنامه و نقشۀ یادگیری</summary>
        <div className="mt-4 grid gap-4">
          {question.topic.microLesson && <p className="whitespace-pre-wrap text-sm leading-8">{question.topic.microLesson}</p>}
          <MindMap topic={question.topic} />
        </div>
      </details>}
      {question.source && <p className="text-xs text-muted-foreground">{question.source.name} · {question.source.license}</p>}
    </div>}
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" disabled={position === 0} onClick={() => goToQuestion(position - 1)}>سؤال قبلی</Button>
      <Button disabled={position + 1 >= pack.questionCount} onClick={() => goToQuestion(position + 1)}>سؤال بعدی</Button>
    </div>
    <p className="text-xs leading-6 text-muted-foreground">{pack.attribution}</p>
  </Panel>
}

export default function OfflineLearningPage({ online }: { online: boolean }) {
  const client = useQueryClient()
  const [active, setActive] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const library = useQuery({ queryKey: ['offline-library'], queryFn: listSavedPacks, networkMode: 'always' })
  const selected = useQuery({
    queryKey: ['offline-pack', active],
    queryFn: () => getSavedPack(active!).then((pack) => pack ?? null),
    enabled: active !== null,
    networkMode: 'always',
  })
  const remove = useMutation({
    mutationFn: async (id: string) => {
      await removeSavedPack(id)
      try { localStorage.removeItem(`sweet-study:offline-reading:${offlineAccountId() ?? 'guest'}:${id}`) } catch { /* Optional reading progress. */ }
    },
    networkMode: 'always',
    onSuccess: (_value, id) => {
      setRemoving(null)
      client.removeQueries({ queryKey: ['offline-pack', id] })
      return client.invalidateQueries({ queryKey: ['offline-library'] })
    },
  })
  const packs = [...(library.data ?? [])].sort((first, second) => second.savedAt - first.savedAt)
  return <main dir="rtl" className="mx-auto grid max-w-3xl gap-4 px-4 py-8 sm:px-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="flex items-center gap-2 text-2xl font-bold"><BookOpen size={23} className="text-primary" />کتابخانۀ آفلاین</h1>
      {online
        ? <Button asChild variant="outline"><Link to={appRoutes.learning}>بانک سؤال آنلاین</Link></Button>
        : offlineAccountId() ? <Button asChild variant="outline"><Link to={appRoutes.home}>اتاق مطالعه</Link></Button>
          : <span role="status" className="text-xs font-bold text-muted-foreground">بدون اینترنت</span>}
    </header>
    <p className="text-sm leading-7 text-muted-foreground">
      بسته‌های دانلودشده بدون اینترنت باز می‌شوند. پاسخ‌ها و جای مطالعه روی همین دستگاه ذخیره می‌شوند.
    </p>
    {active && selected.data
      ? <PackReader key={active} pack={selected.data} onBack={() => setActive(null)} />
      : active
        ? <Panel className="grid gap-3">
          <QueryState pending={selected.isPending} error={selected.error} retry={selected.refetch} empty={selected.data === null && 'این بسته روی دستگاه پیدا نشد.'} />
          <Button variant="outline" className="justify-self-start" onClick={() => setActive(null)}>همۀ بسته‌ها</Button>
        </Panel>
        : <Panel className="grid gap-4">
          <QueryState pending={library.isPending} error={library.error} retry={library.refetch}
            empty={library.data?.length === 0 && 'هنوز بسته‌ای ذخیره نشده است. با اتصال اینترنت، یک بسته را از بانک سؤال دانلود کن.'} />
          <QueryState error={remove.error} />
          {packs.map((pack) => <article key={pack.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
            <div className="grid gap-1">
              <h2 className="font-bold">{pack.title}</h2>
              <p className="text-xs text-muted-foreground">{fa(pack.questionCount)} سؤال{pack.isSample ? ' · نمونه' : ''}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {removing === pack.id ? <>
                <Button size="sm" variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate(pack.id)}>حذف از دستگاه</Button>
                <Button size="sm" variant="ghost" disabled={remove.isPending} onClick={() => setRemoving(null)}>انصراف</Button>
              </> : <>
                <Button size="sm" onClick={() => setActive(pack.id)}>مطالعه</Button>
                <Button size="sm" variant="ghost" disabled={remove.isPending} onClick={() => { remove.reset(); setRemoving(pack.id) }}>حذف</Button>
              </>}
            </div>
          </article>)}
        </Panel>}
  </main>
}
