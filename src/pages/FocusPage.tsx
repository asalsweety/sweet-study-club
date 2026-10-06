import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Image, Pause, Play, Square, Timer as TimerIcon, Volume2 } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api } from '../app/api'
import { appRoutes } from '../app/navigation/routes'
import { queryKeys, useSettings } from '../app/session'
import { formatClock } from '../shared/lib/format'
import { tehranClock } from '../shared/lib/tehran'
import { cn } from '../shared/lib/utils'
import GoalRing from '../components/GoalRing'
import { ambientLabels, useAmbientSound, type AmbientSound } from '../features/focus/ambient'
import ChibiScene from '../features/focus/ChibiScene'
import { sceneThemes, type ChibiScene as SceneId } from '../features/focus/scenes'
import FinishSessionSheet from '../features/study/FinishSessionSheet'
import { elapsedSecondsOf, pomodoroRemaining, useNow, useStudyTimer } from '../features/study/useStudyTimer'

const pill = 'flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20'

export default function FocusPage() {
  const now = useNow()
  const timer = useStudyTimer()
  const settings = useSettings()
  const client = useQueryClient()
  const ambient = useAmbientSound()
  const [finishing, setFinishing] = useState(false)
  const saveDisplay = useMutation({
    mutationFn: (input: { timerDisplay?: 'digital' | 'chibi'; chibiScene?: SceneId }) => api.settings.update(input),
    onSuccess: (next) => client.setQueryData(queryKeys.settings, next),
  })

  if (!timer.isLoading && !timer.timer && !finishing) return <Navigate to={appRoutes.home} replace />
  const state = timer.timer
  const display = settings.data?.timerDisplay ?? 'digital'
  const scene = settings.data?.chibiScene ?? 'night-desk'
  const hour = Math.floor(tehranClock(now).minuteOfDay / 60)
  const isNight = hour >= 19 || hour < 6
  const elapsed = elapsedSecondsOf(state, now)
  const pomodoro = pomodoroRemaining(state, now)
  const running = state?.timerStatus === 'running'
  const big = pomodoro ? Math.max(0, pomodoro.remaining) : elapsed

  return (
    <main dir="rtl" className={cn('relative flex min-h-dvh flex-col overflow-hidden text-white', display === 'digital' && 'bg-[radial-gradient(ellipse_at_top,var(--primary),#120f1f_70%)]')}>
      {display === 'chibi' && (
        <ChibiScene scene={scene} isNight={isNight} state={running ? 'studying' : pomodoro?.phase === 'break' ? 'break' : 'paused'} className="absolute inset-0 size-full object-cover" />
      )}
      {display === 'chibi' && <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/40" />}

      <header className="relative z-10 flex flex-wrap items-center justify-between gap-2 p-4 sm:p-6">
        <Link to={appRoutes.home} className={pill}>
          <ArrowRight size={16} /> خانه
        </Link>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={pill} onClick={() => saveDisplay.mutate({ timerDisplay: display === 'chibi' ? 'digital' : 'chibi' })}>
            {display === 'chibi' ? <TimerIcon size={16} /> : <Image size={16} />}
            {display === 'chibi' ? 'تایمر ساده' : 'اتاق چیبی'}
          </button>
          {display === 'chibi' && (
            <select
              aria-label="انتخاب اتاق"
              value={scene}
              onChange={(event) => saveDisplay.mutate({ chibiScene: event.target.value as SceneId })}
              className={cn(pill, 'appearance-none')}
            >
              {Object.entries(sceneThemes).map(([id, theme]) => (
                <option key={id} value={id} className="text-foreground">{theme.label}</option>
              ))}
            </select>
          )}
          <label className={pill}>
            <Volume2 size={16} />
            <select aria-label="صدای محیط" value={ambient.sound} onChange={(event) => ambient.setSound(event.target.value as AmbientSound)} className="appearance-none bg-transparent outline-none">
              {Object.entries(ambientLabels).map(([id, label]) => (
                <option key={id} value={id} className="text-foreground">{label}</option>
              ))}
            </select>
          </label>
          {ambient.sound !== 'off' && (
            <input aria-label="بلندی صدا" type="range" min={0} max={1} step={0.05} value={ambient.volume} onChange={(event) => ambient.setVolume(Number(event.target.value))} className="w-24 accent-white" />
          )}
        </div>
      </header>

      <section className={cn('relative z-10 flex flex-1 flex-col items-center gap-6 px-4 pb-10', display === 'chibi' ? 'justify-end' : 'justify-center')}>
        {state && (
          <>
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="rounded-full bg-white/15 px-4 py-1 text-sm font-bold backdrop-blur-md">
                {state.subjectName}
                {pomodoro && ` · ${pomodoro.phase === 'focus' ? 'تمرکز' : pomodoro.isLongBreak ? 'استراحت بلند' : 'استراحت'} · دور ${pomodoro.round}/${pomodoro.rounds}`}
              </p>
            </div>
            {pomodoro && display === 'digital' ? (
              <GoalRing value={1 - Math.max(0, pomodoro.remaining) / pomodoro.length} size={280} stroke={14} label="زمان باقی‌مانده‌ی این مرحله">
                <p dir="ltr" className="font-mono text-6xl font-black tabular-nums">{formatClock(big)}</p>
              </GoalRing>
            ) : (
              <p dir="ltr" className={cn('font-mono font-black tabular-nums drop-shadow-2xl', display === 'chibi' ? 'text-6xl' : 'text-8xl sm:text-9xl')}>
                {formatClock(big)}
              </p>
            )}
            {pomodoro && pomodoro.remaining <= 0 && (
              <p className="rise rounded-2xl bg-white/15 px-4 py-2 text-sm font-bold backdrop-blur-md">
                {pomodoro.phase === 'focus' ? 'وقت استراحت است ☕ — دکمه‌ی استراحت را بزن.' : 'استراحت تمام شد؛ برگردیم سراغ درس 🌱'}
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-3">
              <button type="button" disabled={timer.busy} onClick={() => (running ? timer.pause.mutate() : timer.resume.mutate())} className="flex h-14 items-center gap-2 rounded-2xl bg-white px-7 text-base font-black text-foreground shadow-xl transition hover:scale-[1.03] disabled:opacity-60">
                {running ? <Pause /> : <Play />}
                {running ? (state.mode === 'pomodoro' ? 'استراحت' : 'توقف') : state.mode === 'pomodoro' ? 'دور بعدی' : 'ادامه'}
              </button>
              <button type="button" disabled={timer.busy} onClick={() => setFinishing(true)} className="flex h-14 items-center gap-2 rounded-2xl bg-white/15 px-6 text-base font-bold backdrop-blur-md transition hover:bg-white/25">
                <Square /> پایان
              </button>
            </div>
          </>
        )}
      </section>

      <FinishSessionSheet open={finishing} onOpenChange={setFinishing} timer={timer} onFinished={() => setFinishing(false)} />
    </main>
  )
}
