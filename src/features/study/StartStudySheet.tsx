import { CalendarClock, Coffee, LoaderCircle, Lock, Maximize2, Play, Timer } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { appRoutes } from '../../app/navigation/routes'
import { useSettings, useSubjects } from '../../app/session'
import { errorMessage } from '../../shared/api/http'
import { subjectsForProfile } from '../../shared/lib/education'
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
  intent?: 'pomodoro' | 'pixel' | 'scheduled' | null
  onStarted: () => void
}

const presets: (PomodoroPlan & { label: string })[] = [
  { label: '۲۵ / ۵', focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 15, rounds: 4 },
  { label: '۵۰ / ۱۰', focusMinutes: 50, breakMinutes: 10, longBreakMinutes: 20, rounds: 3 },
  { label: '۹۰ / ۱۵', focusMinutes: 90, breakMinutes: 15, longBreakMinutes: 30, rounds: 2 },
]

const modes: { id: TimerMode; title: string; hint: string; icon: typeof Timer }[] = [
  { id: 'free', title: 'مطالعه‌ی آزاد', hint: 'هر وقت دلت خواست', icon: Timer },
  { id: 'pomodoro', title: 'پومودورو', hint: 'تمرکز و استراحت', icon: Coffee },
  { id: 'scheduled', title: 'پارت امروز', hint: 'طبق برنامه‌ی روزانه', icon: CalendarClock },
]

export default function StartStudySheet({ open, onOpenChange, openPart, timer, intent, onStarted }: StartStudySheetProps) {
  const subjects = useSubjects()
  const settings = useSettings()
  const [pickedMode, setMode] = useState<TimerMode | null>(null)
  const mode = pickedMode === 'scheduled' && !openPart ? 'free' : pickedMode ?? (intent === 'pomodoro' ? 'pomodoro' : openPart ? 'scheduled' : 'free')
  const [subject, setSubject] = useState('')
  const [custom, setCustom] = useState('')
  const [plan, setPlan] = useState<PomodoroPlan | null>(intent === 'pomodoro' ? presets[0]! : null)
  const [focusLock, setFocusLock] = useState(false)
  const navigate = useNavigate()

  const chosenPlan = plan ?? settings.data?.pomodoro ?? presets[0]!
  // Offered until the person has their own subjects: the defaults for their field.
  const starterSubjects = subjectsForProfile(settings.data?.educationGroup, settings.data?.educationStage).map((item) => [item.name, item.emoji] as const)
  const names = subjects.data?.length ? subjects.data.map((item) => item.name) : starterSubjects.map(([name]) => name)
  const subjectName = (custom.trim() || subject || names[0] || '').slice(0, 80)
  const badge = mode === 'pomodoro' ? `پومودورو · ${fa(chosenPlan.focusMinutes)} / ${fa(chosenPlan.breakMinutes)}`
    : mode === 'scheduled' ? 'پارت امروز · ' + openPart?.title : 'مطالعه‌ی آزاد'

  const begin = (enterRoom = false) => {
    // Full focus: go fullscreen inside the tap (browsers require a gesture),
    // then open the focus room once the session exists.
    if (focusLock && !document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => undefined)
    timer.start.mutate(
      {
        mode,
        subjectName,
        sessionId: mode === 'scheduled' ? (openPart?.id ?? null) : null,
        focusLockEnabled: focusLock,
        pomodoro: mode === 'pomodoro' ? { focusMinutes: chosenPlan.focusMinutes, breakMinutes: chosenPlan.breakMinutes, longBreakMinutes: chosenPlan.longBreakMinutes, rounds: chosenPlan.rounds } : null,
      },
      { onSuccess: () => {
        onStarted()
        if (intent === 'pixel' || focusLock || enterRoom) navigate(intent === 'pixel' ? `${appRoutes.focus}?room=pixel` : appRoutes.focus, { viewTransition: true })
      } },
    )
  }

  return (
    <>
    <section className="today-setup surface">
      <img alt="" className="today-books" src="/images/figma/today-books.webp" width={42} height={42} />
      <div className="today-setup-head">
        <div className="today-setup-heading"><h2>شروع مطالعه</h2><p>حالت، درس و سبک تمرکزت را انتخاب کن.</p></div>
        <span className="today-plan-badge">{badge}</span>
      </div>
      <h2 className="today-mobile-subject">شروع مطالعه{subjectName && `‌ی ${subjectName}`}</h2>
      <fieldset disabled={timer.busy || !!timer.error} className="today-setup-form">
        <legend className="sr-only">تنظیمات جلسه</legend>
        <div className="today-modes" role="group" aria-label="حالت مطالعه">{modes.map(({ id, title }) =>
          <button type="button" key={id} aria-pressed={id === mode} disabled={id === 'scheduled' && !openPart} onClick={() => setMode(id)}>
            {title}{id === 'scheduled' && !openPart && <span className="block text-[10px]">اکنون بسته است</span>}
          </button>
        )}</div>
        <div className="today-subjects">
          {names.slice(0, 5).map(name => <button type="button" key={name} aria-pressed={name === subjectName} onClick={() => { setSubject(name); setCustom('') }}>{name}</button>)}
          <button type="button" onClick={() => onOpenChange(true)} aria-label="همه‌ی درس‌ها و تنظیمات جلسه">…</button>
        </div>
        <div className="today-plan-options">
          {mode === 'pomodoro' && presets.map(preset => <button type="button" key={preset.label} aria-pressed={preset.focusMinutes === chosenPlan.focusMinutes && preset.breakMinutes === chosenPlan.breakMinutes} onClick={() => setPlan(preset)}>{preset.label}</button>)}
          <button type="button" className="today-focus-toggle" aria-pressed={focusLock} onClick={() => setFocusLock(!focusLock)}>حالت تمرکز کامل {focusLock ? '✓' : ''}</button>
        </div>
        <div className="today-start-actions">
          <Button disabled={!subjectName} onClick={() => begin()}><Play />شروع مطالعه{subjectName && `‌ی ${subjectName}`}</Button>
          <Button disabled={!subjectName} variant="secondary" onClick={() => begin(true)}><Maximize2 />اتاق تمرکز</Button>
        </div>
      </fieldset>
      <Button className="today-mobile-start" disabled={timer.busy || !!timer.error} onClick={() => onOpenChange(true)}><Play />شروع مطالعه</Button>
      {timer.start.isError && !open && <p role="alert" className="text-sm text-destructive">{errorMessage(timer.start.error)}</p>}
    </section>
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
          <span className="grid gap-0.5">
            <span className="flex items-center gap-2 text-sm font-bold"><Lock size={16} className="text-primary" /> حالت تمرکز کامل</span>
            <span className="text-xs font-normal text-muted-foreground">قبل از خروج از اتاق تمرکز تأیید می‌خواهد. با خاموش شدن صفحه، تایمر ادامه دارد.</span>
          </span>
          <Switch checked={focusLock} onCheckedChange={setFocusLock} aria-label="حالت تمرکز کامل" />
        </label>

        </fieldset>
        {timer.start.isError && (
          <p role="alert" className="rounded-2xl bg-[var(--destructive-soft)] px-4 py-3 text-sm text-[var(--destructive-text)]">
            {errorMessage(timer.start.error)}
          </p>
        )}

        <Button size="lg" disabled={!subjectName || timer.start.isPending} onClick={() => begin()} className="h-12 rounded-2xl bg-primary text-base font-bold ">
          {timer.start.isPending ? <LoaderCircle className="animate-spin" /> : <Play />}
          شروع {subjectName ? `«${subjectName}»` : ''}
        </Button>
      </DialogContent>
    </Dialog>
    </>
  )
}
