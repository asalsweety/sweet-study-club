import { CheckCircle2, LoaderCircle, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { errorMessage } from '../../shared/api/http'
import { konkurPercent } from '../../shared/lib/analytics'
import { fa, formatDuration } from '../../shared/lib/format'
import { cn } from '../../shared/lib/utils'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Textarea } from '../../components/ui/textarea'
import { elapsedSecondsOf, type useStudyTimer } from './useStudyTimer'

type FinishSessionSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  timer: ReturnType<typeof useStudyTimer>
  onFinished: (summary: string) => void
}

function Counter({ label, value, onChange, tone }: { label: string; value: number; onChange: (next: number) => void; tone: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-muted/60 p-3">
      <span className={cn('text-xs font-bold', tone)}>{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`کم کردن ${label}`} onClick={() => onChange(Math.max(0, value - 1))} className="grid size-8 place-items-center rounded-xl bg-card shadow-sm hover:bg-secondary">
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
          className="w-14 rounded-lg bg-transparent text-center text-lg font-black tabular-nums outline-none focus:ring-2 focus:ring-ring"
        />
        <button type="button" aria-label={`زیاد کردن ${label}`} onClick={() => onChange(Math.min(10000, value + 1))} className="grid size-8 place-items-center rounded-xl bg-card shadow-sm hover:bg-secondary">
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}

const ratings = ['😵', '😕', '🙂', '😊', '🤩']

export default function FinishSessionSheet({ open, onOpenChange, timer, onFinished }: FinishSessionSheetProps) {
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [blank, setBlank] = useState(0)
  const [rating, setRating] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const total = correct + wrong + blank
  const percent = konkurPercent(correct, wrong, total)
  const elapsed = elapsedSecondsOf(timer.timer)

  const finish = () => {
    timer.stop.mutate(
      { testCount: total, testsCorrect: correct, testsWrong: wrong, focusRating: rating, note: note.trim() || null },
      {
        onSuccess: (log) => {
          onFinished(
            `آفرین! ${formatDuration(log.durationSeconds)} ${log.subjectName} ثبت شد${percent === null ? '' : ` · درصد ${fa(percent)}`} 🎀`,
          )
          setCorrect(0)
          setWrong(0)
          setBlank(0)
          setRating(null)
          setNote('')
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[92dvh] overflow-y-auto rounded-[2rem] sm:max-w-lg">
        <DialogHeader className="text-right">
          <DialogTitle className="text-xl font-black">پایان جلسه</DialogTitle>
          <DialogDescription>
            {formatDuration(elapsed)} {timer.timer?.subjectName ?? ''} — اگر تست زدی، نتیجه‌اش را بنویس.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          <Counter label="درست" value={correct} onChange={setCorrect} tone="text-[var(--success-text)]" />
          <Counter label="غلط" value={wrong} onChange={setWrong} tone="text-[var(--destructive-text)]" />
          <Counter label="نزده" value={blank} onChange={setBlank} tone="text-muted-foreground" />
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3">
          <span className="text-sm font-bold">درصد (با نمره‌ی منفی)</span>
          <span className="text-2xl font-black text-primary tabular-nums">{percent === null ? '—' : `${fa(percent)}٪`}</span>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold">تمرکزت چطور بود؟</p>
          <div className="flex justify-between gap-2">
            {ratings.map((emoji, index) => (
              <button
                key={emoji}
                type="button"
                aria-label={`امتیاز ${index + 1} از ۵`}
                aria-pressed={rating === index + 1}
                onClick={() => setRating(index + 1)}
                className={cn(
                  'grid size-12 flex-1 place-items-center rounded-2xl text-2xl transition-all',
                  rating === index + 1 ? 'scale-110 bg-primary/15 shadow-md ring-2 ring-primary' : 'bg-muted/60 grayscale-[40%] hover:grayscale-0',
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <Textarea value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder="یادداشت کوتاه: چه خواندی؟ کجا گیر کردی؟ (اختیاری)" rows={3} />

        {timer.stop.isError && (
          <p role="alert" className="rounded-2xl bg-[var(--destructive-soft)] px-4 py-3 text-sm text-[var(--destructive-text)]">
            {errorMessage(timer.stop.error)}
          </p>
        )}

        <Button size="lg" onClick={finish} disabled={timer.stop.isPending} className="h-12 rounded-2xl bg-[image:var(--primary-gradient)] text-base font-black shadow-lg shadow-primary/30">
          {timer.stop.isPending ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />}
          ثبت جلسه
        </Button>
      </DialogContent>
    </Dialog>
  )
}
