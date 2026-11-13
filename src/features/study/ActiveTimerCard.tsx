import QueryError from '../../components/QueryError'
import { Maximize2, Pause, Play, Square } from 'lucide-react'
import { Link } from 'react-router-dom'
import { appRoutes } from '../../app/navigation/routes'
import { useSettings } from '../../app/session'
import PixelStudyScene from '../focus/PixelStudyScene'
import { tehranClock } from '../../shared/lib/tehran'
import { fa, formatClock } from '../../shared/lib/format'
import { Button } from '../../components/ui/button'
import ClockText from '../../components/ClockText'
import { elapsedSecondsOf, pomodoroRemaining, useNow, type useStudyTimer } from './useStudyTimer'

type ActiveTimerCardProps = {
  timer: ReturnType<typeof useStudyTimer>
  onStop: () => void
}

const modeLabels = { free: 'مطالعه‌ی آزاد', scheduled: 'پارت برنامه', pomodoro: 'پومودورو' } as const

export default function ActiveTimerCard({ timer, onStop }: ActiveTimerCardProps) {
  const state = timer.timer
  const now = useNow(state?.timerStatus === 'running' || state?.pomodoro ? 1000 : null)
  const settings = useSettings()
  if (!state) return null
  const hour = Math.floor(tehranClock(now).minuteOfDay / 60)
  const elapsed = elapsedSecondsOf(state, now)
  const pomodoro = pomodoroRemaining(state, now)
  const running = state.timerStatus === 'running'
  const sceneState = running ? 'studying' : pomodoro?.phase === 'break' ? 'break' : 'paused'

  return (
    <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_88%,white),var(--primary)_45%,color-mix(in_oklab,var(--primary)_70%,var(--chart-4)))] p-6 text-primary-foreground shadow-[var(--glow-primary)] [animation:rise-in_600ms_var(--ease-spring)_backwards] sm:p-8">
      <div aria-hidden className="orb -left-16 -top-16 size-56 bg-white/20" />
      <div aria-hidden className="orb -bottom-24 right-1/4 size-48 bg-white/10 [animation-delay:-3s]" />
      {running && <div aria-hidden className="absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-primary-foreground/10"><div className="h-full w-1/3 rounded-full bg-primary-foreground/50 [animation:timer-sweep_2.6s_var(--ease-in-out)_infinite]" /></div>}
      <div className="relative grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,17rem)]">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="flex w-fit items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-bold backdrop-blur">{running && <span className="live-dot" />}
            {modeLabels[state.mode]}
            {pomodoro && ` · دور ${fa(pomodoro.round)} از ${fa(pomodoro.rounds)}`}
          </span>
          <h2 className="text-2xl font-bold">{state.subjectName}</h2>
          <p className="text-sm opacity-85">
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
          <ClockText value={formatClock(elapsed)} ticking={running} className={`mt-2 w-fit text-6xl sm:text-7xl ${running ? '' : 'opacity-70'}`} />
        </div>

        {/* Asal's pixel room starts the moment a session does. */}
        <Link to={appRoutes.focus} viewTransition aria-label="باز کردن اتاق تمرکز" className="block transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]">
          <PixelStudyScene scene={settings.data?.chibiScene ?? 'night-desk'} isNight={hour >= 19 || hour < 6} state={sceneState} className="pixel-card w-full" />
        </Link>
      </div>

      {(timer.pause.isError || timer.resume.isError) && <div className="mt-4"><QueryError error={timer.pause.error ?? timer.resume.error} /></div>}
      <div className="relative mt-6 flex flex-wrap gap-2">
        {running ? (
          <Button variant="secondary" disabled={timer.busy} onClick={() => timer.pause.mutate()} className="rounded-2xl bg-card font-bold text-card-foreground hover:bg-card/90">
            <Pause /> {state.mode === 'pomodoro' ? 'شروع استراحت' : 'توقف'}
          </Button>
        ) : (
          <Button variant="secondary" disabled={timer.busy} onClick={() => timer.resume.mutate()} className="rounded-2xl bg-card font-bold text-card-foreground hover:bg-card/90">
            <Play /> {state.mode === 'pomodoro' ? 'دور بعدی' : 'ادامه'}
          </Button>
        )}
        <Button variant="ghost" disabled={timer.busy} onClick={onStop} className="rounded-2xl bg-primary-foreground/10 font-bold text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground">
          <Square /> پایان و ثبت
        </Button>
        <Button asChild variant="ghost" className="mr-auto rounded-2xl bg-primary-foreground/10 font-bold text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground">
          <Link to={appRoutes.focus}>
            <Maximize2 /> اتاق تمرکز
          </Link>
        </Button>
      </div>
    </section>
  )
}
