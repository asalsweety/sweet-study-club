import { CalendarClock, Coffee, LoaderCircle, Lock, Play, Timer } from 'lucide-react'
import { useState } from 'react'
import { useSettings, useSubjects } from '../../app/session'
import { errorMessage } from '../../shared/api/http'
import { fa } from '../../shared/lib/format'
import type { ScheduledSession } from '../../shared/api/schedule'
import type { PomodoroPlan, TimerMode } from '../../shared/api/study-timer'
import { cn } from '../../shared/lib/utils'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Switch } from '../../components/ui/switch'
import type { useStudyTimer } from './useStudyTimer'

type StartStudySheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  openPart: ScheduledSession | null
  timer: ReturnType<typeof useStudyTimer>
  onStarted: () => void
}

const presets: (PomodoroPlan & { label: string })[] = [
  { label: '۲۵ / ۵', focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 15, rounds: 4 },
  { label: '۵۰ / ۱۰', focusMinutes: 50, breakMinutes: 10, longBreakMinutes: 20, rounds: 3 },
  { label: '۹۰ / ۱۵', focusMinutes: 90, breakMinutes: 15, longBreakMinutes: 30, rounds: 2 },
]

// Offered until the person saves their own subjects in settings.
const starterSubjects = [['زیست‌شناسی', '🧬'], ['شیمی', '⚗️'], ['فیزیک', '⚡'], ['ریاضی', '📐'], ['ادبیات فارسی', '📚'], ['زبان انگلیسی', '🌍']] as const

const modes: { id: TimerMode; title: string; hint: string; icon: typeof Timer }[] = [
  { id: 'scheduled', title: 'پارت امروز', hint: 'طبق برنامه‌ی روزانه', icon: CalendarClock },
  { id: 'free', title: 'مطالعه‌ی آزاد', hint: 'هر وقت دلت خواست', icon: Timer },
  { id: 'pomodoro', title: 'پومودورو', hint: 'تمرکز و استراحت', icon: Coffee },
]

export default function StartStudySheet({ open, onOpenChange, openPart, timer, onStarted }: StartStudySheetProps) {
  const subjects = useSubjects(open)
  const settings = useSettings(open)
  const [mode, setMode] = useState<TimerMode>(openPart ? 'scheduled' : 'free')
  const [subject, setSubject] = useState('')
  const [custom, setCustom] = useState('')
  const [plan, setPlan] = useState<PomodoroPlan | null>(null)
  const [focusLock, setFocusLock] = useState(false)

  const chosenPlan = plan ?? settings.data?.pomodoro ?? presets[0]!
  const subjectName = (custom.trim() || subject || subjects.data?.[0]?.name || '').slice(0, 80)

  const begin = () => {
    timer.start.mutate(
      {
        mode,
        subjectName,
        sessionId: mode === 'scheduled' ? (openPart?.id ?? null) : null,
        focusLockEnabled: focusLock,
        pomodoro: mode === 'pomodoro' ? { focusMinutes: chosenPlan.focusMinutes, breakMinutes: chosenPlan.breakMinutes, longBreakMinutes: chosenPlan.longBreakMinutes, rounds: chosenPlan.rounds } : null,
      },
      { onSuccess: onStarted },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[92dvh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader className="text-right">
          <DialogTitle className="text-xl font-bold">شروع مطالعه</DialogTitle>
          <DialogDescription>حالت، درس و سبک تمرکزت را انتخاب کن.</DialogDescription>
        </DialogHeader>

        <fieldset disabled={timer.start.isPending} className="grid min-w-0 gap-4">
        <legend className="sr-only">تنظیمات جلسه</legend>
        <div className="grid grid-cols-3 gap-2">
          {modes.map(({ id, title, hint, icon: Icon }) => {
            const disabled = id === 'scheduled' && !openPart
            return (
              <button
                key={id}
                type="button"
                disabled={disabled || timer.start.isPending}
                aria-pressed={mode === id}
                onClick={() => setMode(id)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-all disabled:cursor-not-allowed disabled:opacity-40',
                  mode === id ? 'border-primary bg-primary/10 shadow-md shadow-primary/15' : 'border-border hover:border-primary/40',
                )}
              >
                <Icon size={20} className={mode === id ? 'text-primary' : 'text-muted-foreground'} />
                <span className="text-sm font-bold">{title}</span>
                <span className="text-[11px] text-muted-foreground">{disabled ? 'پارتی باز نیست' : id === 'scheduled' && openPart ? openPart.title : hint}</span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="study-subject" className="text-sm font-bold">چه درسی؟</label>
          <div className="flex flex-wrap gap-2">
            {(subjects.data ?? []).map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={subjectName === item.name && !custom}
                onClick={() => {
                  setSubject(item.name)
                  setCustom('')
                }}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold transition-all',
                  subjectName === item.name && !custom ? 'border-primary bg-secondary text-primary' : 'border-border hover:border-primary/40',
                )}
              >
                <span aria-hidden>{item.emoji}</span>
                {item.name}
              </button>
            ))}
            {subjects.data && subjects.data.length === 0 && starterSubjects.map(([name, emoji]) => (
              <button
                key={name}
                type="button"
                aria-pressed={custom === name}
                onClick={() => setCustom(name)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold transition-all',
                  custom === name ? 'border-primary bg-secondary text-primary' : 'border-border hover:border-primary/40',
                )}
              >
                <span aria-hidden>{emoji}</span>
                {name}
              </button>
            ))}
          </div>
          <Input id="study-subject" value={custom} maxLength={80} onChange={(event) => setCustom(event.target.value)} placeholder="یا اسم درس/مبحث دیگری بنویس" />
        </div>

        {mode === 'pomodoro' && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold">ریتم پومودورو</p>
            <div className="grid grid-cols-3 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  aria-pressed={chosenPlan.focusMinutes === preset.focusMinutes && chosenPlan.breakMinutes === preset.breakMinutes}
                  onClick={() => setPlan(preset)}
                  className={cn(
                    'rounded-2xl border py-2.5 text-sm font-bold transition-all',
                    chosenPlan.focusMinutes === preset.focusMinutes && chosenPlan.breakMinutes === preset.breakMinutes
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/40',
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {fa(chosenPlan.rounds)} دور {fa(chosenPlan.focusMinutes)} دقیقه‌ای، استراحت بلند {fa(chosenPlan.longBreakMinutes)} دقیقه.
            </p>
          </div>
        )}

        <label className="flex items-center justify-between gap-3 rounded-2xl bg-muted/60 p-3.5">
          <span className="flex items-center gap-2 text-sm font-bold">
            <Lock size={16} className="text-primary" /> حالت تمرکز کامل
          </span>
          <Switch checked={focusLock} onCheckedChange={setFocusLock} aria-label="حالت تمرکز کامل" />
        </label>

        </fieldset>
        {timer.start.isError && (
          <p role="alert" className="rounded-2xl bg-[var(--destructive-soft)] px-4 py-3 text-sm text-[var(--destructive-text)]">
            {errorMessage(timer.start.error)}
          </p>
        )}

        <Button size="lg" disabled={!subjectName || timer.start.isPending} onClick={begin} className="h-12 rounded-2xl bg-primary text-base font-bold ">
          {timer.start.isPending ? <LoaderCircle className="animate-spin" /> : <Play />}
          شروع {subjectName ? `«${subjectName}»` : ''}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
