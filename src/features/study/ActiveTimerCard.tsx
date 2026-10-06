import { Maximize2, Pause, Play, Square } from 'lucide-react'
import { Link } from 'react-router-dom'
import { appRoutes } from '../../app/navigation/routes'
import { formatClock } from '../../shared/lib/format'
import { Button } from '../../components/ui/button'
import { elapsedSecondsOf, pomodoroRemaining, useNow, type useStudyTimer } from './useStudyTimer'

type ActiveTimerCardProps = {
  timer: ReturnType<typeof useStudyTimer>
  onStop: () => void
}

const modeLabels = { free: 'مطالعه‌ی آزاد', scheduled: 'پارت برنامه', pomodoro: 'پومودورو' } as const

export default function ActiveTimerCard({ timer, onStop }: ActiveTimerCardProps) {
  const now = useNow()
  const state = timer.timer
  if (!state) return null
  const elapsed = elapsedSecondsOf(state, now)
  const pomodoro = pomodoroRemaining(state, now)
  const running = state.timerStatus === 'running'

  return (
    <section className="rise relative overflow-hidden rounded-[2rem] bg-[image:var(--primary-gradient)] p-6 text-primary-foreground shadow-2xl shadow-primary/30 sm:p-8">
      <div aria-hidden className="absolute -top-16 -left-16 size-56 rounded-full bg-white/15 blur-2xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <span className="w-fit rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">
            {modeLabels[state.mode]}
            {pomodoro && ` · دور ${pomodoro.round} از ${pomodoro.rounds}`}
          </span>
          <h2 className="text-2xl font-black">{state.subjectName}</h2>
          <p className="text-sm text-white/80">
            {pomodoro
              ? pomodoro.phase === 'break'
                ? pomodoro.remaining > 0
                  ? `استراحت: ${formatClock(pomodoro.remaining)} مانده`
                  : 'استراحت تمام شد؛ آماده‌ی دور بعدی؟'
                : pomodoro.remaining > 0
                  ? `تا استراحت: ${formatClock(pomodoro.remaining)}`
                  : 'وقت استراحت است ☕'
              : running
                ? 'در حال تمرکز...'
                : 'متوقف شده'}
          </p>
        </div>

        <p className="font-mono text-5xl font-black tabular-nums tracking-tight sm:text-6xl" aria-live="off" dir="ltr">
          {formatClock(elapsed)}
        </p>
      </div>

      <div className="relative mt-6 flex flex-wrap gap-2">
        {running ? (
          <Button variant="secondary" disabled={timer.busy} onClick={() => timer.pause.mutate()} className="rounded-2xl bg-white/90 font-bold text-foreground hover:bg-white">
            <Pause /> {state.mode === 'pomodoro' ? 'شروع استراحت' : 'توقف'}
          </Button>
        ) : (
          <Button variant="secondary" disabled={timer.busy} onClick={() => timer.resume.mutate()} className="rounded-2xl bg-white/90 font-bold text-foreground hover:bg-white">
            <Play /> {state.mode === 'pomodoro' ? 'دور بعدی' : 'ادامه'}
          </Button>
        )}
        <Button variant="ghost" disabled={timer.busy} onClick={onStop} className="rounded-2xl bg-white/15 font-bold text-white hover:bg-white/25 hover:text-white">
          <Square /> پایان و ثبت
        </Button>
        <Button asChild variant="ghost" className="mr-auto rounded-2xl bg-white/15 font-bold text-white hover:bg-white/25 hover:text-white">
          <Link to={appRoutes.focus}>
            <Maximize2 /> اتاق تمرکز
          </Link>
        </Button>
      </div>
    </section>
  )
}
