import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, LoaderCircle, Send } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import PageHeading from '../components/PageHeading'
import { Button } from '../components/ui/button'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { submitFeedback } from '../features/feedback/api'
import { FEEDBACK_MAX_LENGTH, type CreateFeedbackInput } from '../shared/api/feedback'
import { errorMessage } from '../shared/api/http'
import { fa } from '../shared/lib/format'

export default function FeedbackPage() {
  const [message, setMessage] = useState('')
  const [emptyError, setEmptyError] = useState(false)
  const field = useRef<HTMLTextAreaElement>(null)
  const lastSubmission = useRef<CreateFeedbackInput | null>(null)
  const submission = useMutation({
    mutationFn: submitFeedback,
    onSuccess: () => {
      setMessage('')
      lastSubmission.current = null
    },
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submission.isPending) return
    const text = message.trim()
    if (!text) {
      submission.reset()
      setEmptyError(true)
      field.current?.focus()
      return
    }
    // A lost response may already have been saved. Retry the same message with its original ID.
    if (lastSubmission.current?.message !== text) {
      lastSubmission.current = { requestId: crypto.randomUUID(), message: text }
    }
    submission.mutate(lastSubmission.current)
  }

  return (
    <div className="grid w-full max-w-2xl gap-5">
      <PageHeading title="ارسال بازخورد" description="پیشنهاد یا مشکلت را بنویس. فقط تیم مدیریت باشگاه پیام و نام نمایشی‌ات را می‌بیند." />
      <form noValidate onSubmit={submit} aria-label="فرم ارسال بازخورد" className="surface grid min-w-0 gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="feedback-message">متن بازخورد</Label>
          <span id="feedback-count" className="text-xs tabular-nums text-muted-foreground">
            {fa(message.length)} از {fa(FEEDBACK_MAX_LENGTH)} نویسه
          </span>
        </div>
        <Textarea
          id="feedback-message"
          ref={field}
          value={message}
          rows={6}
          dir={message ? 'auto' : 'rtl'}
          required
          maxLength={FEEDBACK_MAX_LENGTH}
          readOnly={submission.isPending}
          aria-invalid={emptyError || undefined}
          aria-describedby={emptyError ? 'feedback-count feedback-empty' : 'feedback-count'}
          placeholder="چه چیزی در باشگاه می‌تواند بهتر شود؟"
          className="resize-y rounded-xl bg-background px-4 py-3 text-start leading-7"
          onChange={event => {
            setMessage(event.target.value)
            setEmptyError(false)
            if (submission.isError || submission.isSuccess) submission.reset()
          }}
        />
        {emptyError && <p id="feedback-empty" role="alert" className="text-sm text-[var(--destructive-text)]">اول پیامت را بنویس.</p>}
        {submission.isError && <p role="alert" className="text-sm text-[var(--destructive-text)]">{errorMessage(submission.error)}</p>}
        <Button type="submit" disabled={submission.isPending} className="w-full sm:w-auto sm:justify-self-start">
          {submission.isPending ? <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" /> : <Send aria-hidden="true" />}
          {submission.isPending ? 'در حال ارسال…' : submission.isError ? 'تلاش دوباره' : 'ارسال بازخورد'}
        </Button>
        <div role="status" className={submission.isSuccess ? undefined : 'sr-only'}>
          {submission.isSuccess && (
            <p className="flex items-start gap-2 rounded-xl bg-[var(--success-soft)] p-3 text-sm text-[var(--success-text)]">
              <CheckCircle2 aria-hidden="true" size={18} className="shrink-0" />
              بازخوردت به دست تیم باشگاه رسید. ممنون که برایمان نوشتی!
            </p>
          )}
        </div>
      </form>
    </div>
  )
}
