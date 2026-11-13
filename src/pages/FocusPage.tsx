import QueryError from '../components/QueryError'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Image, Maximize, Minimize, Pause, Play, Square, Timer as TimerIcon, Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api } from '../app/api'
import { appRoutes } from '../app/navigation/routes'
import { queryKeys, useSettings } from '../app/session'
import type { StudyTimerState } from '../shared/api/study-timer'
import { fa, formatClock } from '../shared/lib/format'
import { tehranClock } from '../shared/lib/tehran'
import { haptic } from '../shared/lib/confetti'
import { cn } from '../shared/lib/utils'
import ClockText from '../components/ClockText'
import GoalRing from '../components/GoalRing'
import { ambientLabels, useAmbientSound, type AmbientSound } from '../features/focus/ambient'
import PixelStudyScene from '../features/focus/PixelStudyScene'
import { sceneThemes, type ChibiScene as SceneId } from '../features/focus/scenes'
import FinishSessionSheet from '../features/study/FinishSessionSheet'
import { elapsedSecondsOf, pomodoroRemaining, useNow, useStudyTimer } from '../features/study/useStudyTimer'

const pill = 'min-h-11 flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95 sm:px-4 sm:text-sm'

// The clock owns its one-second updates; the scene, controls and audio stay still.
function FocusClock({ state, display }: { state: StudyTimerState; display: 'digital' | 'chibi' }) {
  const now = useNow(state.timerStatus === 'running' || state.pomodoro ? 1000 : null)
  const pomodoro = pomodoroRemaining(state, now)
  const seconds = pomodoro ? Math.max(0, pomodoro.remaining) : elapsedSecondsOf(state, now)

  return (
    <>
      {pomodoro && display === 'digital' ? (
        <GoalRing value={1 - Math.max(0, pomodoro.remaining) / pomodoro.length} size={280} stroke={14} label="زمان باقی‌مانده‌ی این مرحله">
          <ClockText value={formatClock(seconds)} ticking={state.timerStatus === 'running'} className="text-7xl" />
        </GoalRing>
      ) : (
        <div className="relative grid place-items-center">
          {display === 'digital' && <span aria-hidden className={cn('focus-halo', state.timerStatus !== 'running' && 'is-paused')} />}
          <ClockText value={formatClock(seconds)} ticking={state.timerStatus === 'running'} className={cn('relative drop-shadow-[0_6px_24px_rgba(0,0,0,0.45)]', display === 'chibi' ? 'text-5xl' : 'text-7xl sm:text-8xl lg:text-9xl', state.timerStatus !== 'running' && 'opacity-70')} />
        </div>
      )}
      {pomodoro && pomodoro.remaining <= 0 && (
        <p className="rise rounded-2xl bg-white/15 px-4 py-2 text-sm font-bold backdrop-blur-md">
          {pomodoro.phase === 'focus' ? 'وقت استراحت است ☕ — دکمه‌ی استراحت را بزن.' : 'استراحت تمام شد؛ برگردیم سراغ درس 🌱'}
        </p>
      )}
    </>
  )
}

function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
  else void document.documentElement.requestFullscreen?.().catch(() => undefined)
}

export default function FocusPage() {
  const now = useNow(60_000)
  const timer = useStudyTimer()
  const settings = useSettings()
  const client = useQueryClient()
  const ambient = useAmbientSound()
  const [finishing, setFinishing] = useState(false)
  const saveDisplay = useMutation({
    mutationFn: (input: { timerDisplay?: 'digital' | 'chibi'; chibiScene?: SceneId }) => api.settings.update(input),
    onSuccess: (next) => client.setQueryData(queryKeys.settings, next),
  })

  const [fullscreen, setFullscreen] = useState(() => Boolean(document.fullscreenElement))
  const running = timer.timer?.timerStatus === 'running'

  // Keep the screen awake while a session runs; the browser drops the lock
  // when the tab is hidden, so take it again on return.
  useEffect(() => {
    if (!running || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const acquire = () => {
      if (document.visibilityState !== 'visible') return
      navigator.wakeLock.request('screen').then((sentinel) => { if (cancelled) void sentinel.release(); else lock = sentinel }).catch(() => undefined)
    }
    acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => { cancelled = true; document.removeEventListener('visibilitychange', acquire); void lock?.release().catch(() => undefined) }
  }, [running])

  useEffect(() => {
    const sync = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  // Space pauses or resumes; F toggles fullscreen.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement | null)?.closest('input, select, textarea, button, [role="dialog"]') || finishing) return
      if (event.code === 'Space' && timer.timer && !timer.busy) {
        event.preventDefault()
        haptic(10)
        if (timer.timer.timerStatus === 'running') timer.pause.mutate()
        else timer.resume.mutate()
      } else if (event.key === 'f' || event.key === 'F') {
        toggleFullscreen()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!timer.isLoading && !timer.error && !timer.timer && !finishing) return <Navigate to={appRoutes.home} replace />
  const state = timer.timer
  const display = settings.data?.timerDisplay ?? 'digital'
  const scene = settings.data?.chibiScene ?? 'night-desk'
  const hour = Math.floor(tehranClock(now).minuteOfDay / 60)
  const isNight = hour >= 19 || hour < 6
  const pomodoro = pomodoroRemaining(state, now)

  return (
    <main dir="rtl" className={cn('relative flex min-h-dvh flex-col overflow-hidden text-white [animation:fade-in_700ms_ease-out_backwards]', display === 'digital' ? 'focus-aurora' : 'bg-[#141228]')}>
      {display === 'digital' && <div aria-hidden className="focus-particles" />}
      {display === 'chibi' && (
        <PixelStudyScene scene={scene} isNight={isNight} state={running ? 'studying' : pomodoro?.phase === 'break' ? 'break' : 'paused'} className="pixel-backdrop" />
      )}
      {display === 'chibi' && <div aria-hidden className="pixel-backdrop-shade absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-black/45" />}

      <header className="relative z-10 flex flex-wrap items-center justify-between gap-2 p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:p-6">
        <div className="flex gap-2">
          <Link to={appRoutes.home} viewTransition className={pill}>
            <ArrowRight size={16} /> خانه
          </Link>
          {document.fullscreenEnabled && <button type="button" className={pill} onClick={toggleFullscreen} aria-label={fullscreen ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'} aria-keyshortcuts="F">{fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}</button>}
        </div>
        <div className="flex max-w-full gap-2 overflow-x-auto [scrollbar-width:none] max-sm:snap-x">
          <button type="button" className={pill} onClick={() => saveDisplay.mutate({ timerDisplay: display === 'chibi' ? 'digital' : 'chibi' })}>
            {display === 'chibi' ? <TimerIcon size={16} /> : <Image size={16} />}
            {display === 'chibi' ? 'تایمر ساده' : 'اتاق پیکسلی'}
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

      <section className={cn('focus-stage relative z-10 flex flex-1 flex-col items-center gap-6 px-4 pb-[max(2.5rem,calc(env(safe-area-inset-bottom)+1.5rem))]', display === 'chibi' ? 'justify-end' : 'justify-center')}>
        {timer.isLoading && <p role="status" className="text-sm">در حال آماده‌سازی جلسه…</p>}
        {timer.error && <QueryError error={timer.error} retry={() => void timer.refetch()} />}
        {(timer.pause.isError || timer.resume.isError || saveDisplay.isError) && <QueryError error={timer.pause.error ?? timer.resume.error ?? saveDisplay.error} />}
        {state && (
          <div className={cn('flex flex-col items-center gap-5', display === 'chibi' && 'pixel-dock')}>
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="rounded-full bg-white/15 px-4 py-1 text-sm font-bold backdrop-blur-md">
                {state.subjectName}
                {pomodoro && ` · ${pomodoro.phase === 'focus' ? 'تمرکز' : pomodoro.isLongBreak ? 'استراحت بلند' : 'استراحت'} · دور ${fa(pomodoro.round)}/${fa(pomodoro.rounds)}`}
              </p>
            </div>
            <FocusClock state={state} display={display} />
            <div className="flex flex-wrap justify-center gap-3">
              <button type="button" disabled={timer.busy} onClick={() => (running ? timer.pause.mutate() : timer.resume.mutate())} aria-keyshortcuts="Space" className="flex h-14 items-center gap-2 rounded-2xl bg-white px-7 text-base font-bold text-[#17392f] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.5)] transition hover:scale-[1.03] active:scale-95 disabled:opacity-60">
                {running ? <Pause /> : <Play />}
                {running ? (state.mode === 'pomodoro' ? 'استراحت' : 'توقف') : state.mode === 'pomodoro' ? 'دور بعدی' : 'ادامه'}
              </button>
              <button type="button" disabled={timer.busy} onClick={() => setFinishing(true)} className="flex h-14 items-center gap-2 rounded-2xl border border-white/15 bg-white/15 px-6 text-base font-bold backdrop-blur-md transition hover:bg-white/25 active:scale-95">
                <Square /> پایان
              </button>
            </div>
            <p className="focus-keys hidden text-xs text-white/55 sm:flex"><span dir="ltr">Space</span> توقف و ادامه · <span dir="ltr">F</span> تمام‌صفحه</p>
          </div>
        )}
      </section>

      <FinishSessionSheet open={finishing} onOpenChange={setFinishing} timer={timer} onFinished={() => setFinishing(false)} />
    </main>
  )
}
