import QueryError from '../../components/QueryError'
import { Maximize2, Pause, Play, Square } from 'lucide-react'
import { Link } from 'react-router-dom'
import { appRoutes } from '../../app/navigation/routes'
import TodayStudyRoom from '../focus/TodayStudyRoom'
import { usePrepareFocusRoom } from '../focus/usePrepareFocusRoom'
import { fa, formatClock } from '../../shared/lib/format'
import { Button } from '../../components/ui/button'
import ClockText from '../../components/ClockText'
import { elapsedSecondsOf, pomodoroRemaining, useNow, type useStudyTimer } from './useStudyTimer'

type ActiveTimerCardProps = { timer: ReturnType<typeof useStudyTimer>; onStop: () => void }
const modeLabels = { free: 'مطالعه‌ی آزاد', scheduled: 'پارت برنامه', pomodoro: 'پومودورو' } as const

export default function ActiveTimerCard({ timer, onStop }: ActiveTimerCardProps) {
  const state = timer.timer
  const prepareFocus = usePrepareFocusRoom()
  const now = useNow(state?.timerStatus === 'running' || state?.pomodoro ? 1000 : null)
  if (!state) return null
  const elapsed = elapsedSecondsOf(state, now)
  const pomodoro = pomodoroRemaining(state, now)
  const running = state.timerStatus === 'running'
  const sceneState = running ? 'studying' : pomodoro?.phase === 'break' ? 'break' : 'paused'
  const warmRoom = () => prepareFocus(sceneState)
  const warmPixelRoom = () => prepareFocus(sceneState, true)
  const clock = formatClock(pomodoro ? Math.max(0, pomodoro.remaining) : elapsed)
  return <section className="today-session surface">
    <div className="today-session-info">
      <div className="today-session-badges">
        <h2>{running ? 'در حال تمرکز' : sceneState === 'break' ? 'در حال استراحت' : 'متوقف شده'} · {state.subjectName}</h2>
        <span>{modeLabels[state.mode]}{pomodoro && ` · دور ${fa(pomodoro.round)} از ${fa(pomodoro.rounds)}`}</span>
      </div>
      <ClockText value={clock} ticking={running} />
      <p>زمان مطالعۀ این جلسه: <bdi>{formatClock(elapsed)}</bdi>{pomodoro && pomodoro.remaining <= 0 && (sceneState === 'break' ? ' · وقت برگشت به درس است' : ' · وقت استراحت است')}</p>
      <div className="today-session-actions">
        <Button variant="outline" disabled={timer.busy} onClick={onStop}><Square />پایان و ثبت</Button>
        {running ? <Button variant="secondary" disabled={timer.busy} onClick={() => timer.pause.mutate()}><Pause />{state.mode === 'pomodoro' ? 'شروع استراحت' : 'توقف'}</Button>
          : <Button variant="secondary" disabled={timer.busy} onClick={() => timer.resume.mutate()}><Play />{pomodoro?.resumesCurrentRound ? 'ادامۀ همین دور' : pomodoro ? 'دور بعدی' : 'ادامه'}</Button>}
        <Button asChild><Link to={appRoutes.focus} onPointerEnter={warmRoom} onFocus={warmRoom} onPointerDown={warmRoom}><Maximize2 />ورود به اتاق تمرکز</Link></Button>
      </div>
      {(timer.pause.isError || timer.resume.isError) && <QueryError error={timer.pause.error ?? timer.resume.error} />}
    </div>
    <Link to={`${appRoutes.focus}?room=pixel`} viewTransition aria-label="باز کردن اتاق پیکسلی" className="today-session-room" onPointerEnter={warmPixelRoom} onFocus={warmPixelRoom} onPointerDown={warmPixelRoom}>
      <TodayStudyRoom state={sceneState} className="today-session-art" />
    </Link>
  </section>
}
