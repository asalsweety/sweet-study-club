import { CheckCircle2, LoaderCircle, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { errorMessage } from '../../shared/api/http'
import { konkurPercent } from '../../shared/lib/analytics'
import { fa, formatDuration } from '../../shared/lib/format'
import { cn } from '../../shared/lib/utils'
import AsalMood from '../../components/AsalMood'
import { moodLabels } from '../../shared/lib/moods'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { showSessionCelebration } from './sessionCelebrationStore'
import './session-panels.css'
import { elapsedSecondsOf, type useStudyTimer } from './useStudyTimer'

type FinishSessionSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  timer: ReturnType<typeof useStudyTimer>
  onFinished: (summary: string) => void
}

function Counter({ label, value, onChange, tone }: { label: string; value: number; onChange: (next: number) => void; tone: string }) {
  return (
    <div className="session-counter">
      <span className={cn('text-xs font-bold', tone)}>{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`کم کردن ${label}`} onClick={() => onChange(Math.max(0, value - 1))} className="grid size-9 place-items-center rounded-xl bg-card shadow-sm transition-transform hover:bg-secondary active:scale-90">
          <Minus size={14} />
        </button>
        <input
          inputMode="numeric"
          aria-label={label}
          value={fa(value)}
          onChange={(event) => {
            const digits = event.target.value.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/\D/g, '')
            onChange(Math.min(10000, Number(digits || 0)))
          }}
          className="w-10 rounded-lg bg-transparent text-center text-lg font-bold tabular-nums outline-none focus:ring-2 focus:ring-ring"
        />
        <button type="button" aria-label={`زیاد کردن ${label}`} onClick={() => onChange(Math.min(10000, value + 1))} className="grid size-9 place-items-center rounded-xl bg-card shadow-sm transition-transform hover:bg-secondary active:scale-90">
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}

const ratings = [1, 2, 3, 4, 5]

export default function FinishSessionSheet({ open, onOpenChange, timer, onFinished }: FinishSessionSheetProps) {
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [blank, setBlank] = useState(0)
  const [rating, setRating] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [title, setTitle] = useState<string | null>(null)
  const total = correct + wrong + blank
  const percent = konkurPercent(correct, wrong, total)
  const elapsed = elapsedSecondsOf(timer.timer)

  const finish = () => {
    timer.stop.mutate(
      {
        testCount: total, testsCorrect: correct, testsWrong: wrong,
        focusRating: rating, note: note.trim() || null,
        ...(title !== null && { title: title.trim() || null }),
      },
      {
        onSuccess: (log) => {
          showSessionCelebration({ subjectName: log.subjectName, durationSeconds: log.durationSeconds, percent, tests: total, rating })
          onFinished(
            `آفرین! ${formatDuration(log.durationSeconds)} ${log.subjectName} ثبت شد${percent === null ? '' : ` · درصد ${fa(percent)}`} 🎀`,
          )
          setCorrect(0)
          setWrong(0)
          setBlank(0)
          setRating(null)
          setNote('')
          setTitle(null)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="session-panel finish-panel">
        <DialogHeader className="finish-heading">
          <DialogTitle>پایان جلسه و ثبت گزارش</DialogTitle>
          <DialogDescription>{timer.timer?.subjectName} · {formatDuration(elapsed)} مطالعه{timer.timer?.mode === 'pomodoro' && ' · پومودورو'}</DialogDescription>
        </DialogHeader>
        <img className="finish-bee" src="/images/figma/modal-tea-bee.webp" width="54" height="54" alt="" />

        <section className="finish-tests" aria-labelledby="session-tests-heading">
          <h3 id="session-tests-heading">تست‌های این جلسه (اختیاری)</h3>
          <div className="finish-counters">
            <Counter label="درست" value={correct} onChange={setCorrect} tone="text-[var(--success-text)]" />
            <Counter label="غلط" value={wrong} onChange={setWrong} tone="text-[var(--destructive-text)]" />
            <Counter label="نزده" value={blank} onChange={setBlank} tone="text-muted-foreground" />
          </div>
          <p className="finish-score">جمع: {fa(total)} تست · درصد خالص: {percent === null ? '—' : `${fa(percent)}٪`}</p>
        </section>

        <section className="finish-feelings" aria-labelledby="session-mood-heading">
          <h3 id="session-mood-heading">حس‌وحال الانت چطور بود؟</h3>
          <div className="finish-moods">
            {ratings.map(value => (
              <button key={value} type="button" aria-label={`امتیاز ${fa(value)} از ۵: ${moodLabels[value - 1]}`}
                aria-pressed={rating === value} onClick={() => setRating(value)}>
                <span className="finish-mood-frame"><AsalMood rating={value} label={false} /></span>
                <span>{moodLabels[value - 1]}</span>
              </button>
            ))}
          </div>
        </section>

        <label className="finish-note">
          عنوان جلسه (اختیاری)
          <Input value={title ?? timer.timer?.title ?? ''} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="مثلاً مرور فصل اول" />
        </label>
        <label className="finish-note">
          یادداشت کوتاه جلسه (اختیاری)
          <Textarea aria-label="یادداشت جلسه" value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder="مثلاً مرور ژنتیک جمعیت کامل شد…" rows={1} />
        </label>
        {timer.stop.isError && (
          <p role="alert" className="rounded-2xl bg-[var(--destructive-soft)] px-4 py-3 text-sm text-[var(--destructive-text)]">
            {errorMessage(timer.stop.error)}
          </p>
        )}

        <div className="finish-actions">
        <Button onClick={finish} disabled={timer.stop.isPending}>
          {timer.stop.isPending ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />}
          ثبت و پایان جلسه
        </Button>
        <Button variant="outline" onClick={() => onOpenChange(false)}>ادامه بدون ثبت</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
