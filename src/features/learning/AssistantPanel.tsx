import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Send, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Textarea } from '../../components/ui/textarea'
import type { AssistantInput } from '../../shared/api/learning'
import { learningApi } from './api'
import { Panel, QueryState } from './components'

export type AssistantContext = Pick<AssistantInput, 'attemptId' | 'questionId' | 'scoreId'>
export default function AssistantPanel({ context, onClear }: { context: AssistantContext; onClear: () => void }) {
  const client = useQueryClient()
  const history = useQuery({ queryKey: ['learning', 'assistant'], queryFn: learningApi.messages })
  const [text, setText] = useState('')
  const [mode, setMode] = useState<AssistantInput['mode']>(context.attemptId || context.scoreId ? 'analysis' : 'ask')
  const endRef = useRef<HTMLDivElement>(null)
  const send = useMutation({ mutationFn: () => learningApi.ask({ ...context, mode, message: text.trim() || 'این آزمون را تحلیل کن و یک برنامهٔ مرور عملی پیشنهاد بده.' }), onSuccess: (data) => {
    client.setQueryData(['learning', 'assistant'], data)
    setText('')
  } })
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' }) }, [history.data?.messages.length])
  const hasContext = Boolean(context.attemptId || context.questionId || context.scoreId)
  return <Panel className="grid gap-5">
    <header><h2 className="flex items-center gap-2 text-xl font-bold"><Sparkles className="text-primary" />دستیار مطالعه</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">پرسش درسی و تحلیل نتیجهٔ آزمون، با توجه به پاسخ‌ها و اطلاعاتی که وارد کرده‌ای.</p></header>
    <QueryState pending={history.isPending} error={history.error} retry={history.refetch} />
    {history.data && !history.data.available && <p role="status" className="rounded-2xl border border-border bg-muted/40 p-4 text-sm leading-8">دستیار هنوز به سرویس هوش مصنوعی متصل نشده است. پس از فعال‌سازی سرویس توسط مدیر، پرسش و تحلیل در همین بخش در دسترس خواهد بود.</p>}
    {hasContext && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-primary/10 p-3 text-sm"><span>{context.attemptId ? 'نتیجه و پاسخ‌های آزمون پیوست است.' : context.questionId ? 'سؤال و توضیح آن پیوست است.' : 'تراز و یادداشت‌های آزمون پیوست است.'}</span><Button variant="ghost" size="sm" onClick={onClear}>حذف پیوست</Button></div>}
    <div className="flex gap-2"><Button size="sm" variant={mode === 'ask' ? 'default' : 'secondary'} onClick={() => setMode('ask')}>پرسش درسی</Button><Button size="sm" variant={mode === 'analysis' ? 'default' : 'secondary'} onClick={() => setMode('analysis')}>تحلیل آزمون</Button></div>
    <div className="grid max-h-[32rem] gap-3 overflow-y-auto rounded-2xl bg-muted/20 p-3" role="log" aria-label="گفت‌وگو با دستیار" aria-live="polite">{history.data?.messages.length === 0 && <p className="py-5 text-center text-sm text-muted-foreground">سؤالت را بنویس یا از صفحهٔ نتیجه، آزمونی را برای تحلیل بفرست.</p>}{history.data?.messages.map((m) => <article key={m.id} className={m.role === 'user' ? 'mr-auto w-[92%] rounded-2xl bg-primary/10 p-4' : 'ml-auto w-[96%] rounded-2xl border border-border/50 bg-card p-4'}><p className="mb-2 text-xs font-bold text-primary">{m.role === 'user' ? 'تو' : 'دستیار Sweet'}</p><p className="whitespace-pre-wrap break-words text-sm leading-8">{m.content}</p></article>)}{send.isPending && <p role="status" className="p-3 text-sm text-muted-foreground">در حال بررسی…</p>}<div ref={endRef} /></div>
    <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); send.mutate() }}><label className="grid gap-2 text-sm font-bold">{mode === 'analysis' ? 'چه چیزی را بررسی کنیم؟' : 'سؤالت چیست؟'}<Textarea maxLength={3000} rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={mode === 'analysis' ? 'مثلاً نقاط ضعف و برنامهٔ مرور سه‌روزه را پیشنهاد بده…' : 'مثلاً تفاوت این دو مفهوم را با مثال توضیح بده…'} /></label><Button className="justify-self-start rounded-xl" disabled={!history.data?.available || send.isPending || (!text.trim() && !(mode === 'analysis' && hasContext))} type="submit"><Send size={16} />{mode === 'analysis' ? 'تحلیل کن' : 'ارسال پرسش'}</Button></form>
    <QueryState error={send.error} />
    <p className="text-xs leading-6 text-muted-foreground">پاسخ‌های هوش مصنوعی ممکن است خطا داشته باشند؛ با منبع درسی بررسی کن. مطالب پزشکی برای یادگیری‌اند. ۵۰ پیام آخر نمایش داده می‌شود.</p>
  </Panel>
}
