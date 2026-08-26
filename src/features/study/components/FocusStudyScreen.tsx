import { Pause, Play, Square } from 'lucide-react'
import type { ActiveStudyState } from '../../../entities/study/model'
import { formatTimer } from '../../../shared/lib/time'

type FocusStudyScreenProps = {
  activeState: ActiveStudyState
  elapsedSeconds: number
  themeClass: string
  working: boolean
  onExit: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
}

export default function FocusStudyScreen({
  activeState,
  elapsedSeconds,
  themeClass,
  working,
  onExit,
  onPause,
  onResume,
  onStop,
}: FocusStudyScreenProps) {
  return (
    <main className={`focus-screen ${themeClass}`}>
      <button className="focus-exit" onClick={onExit}>
        خروج از نمای فوکوس
      </button>

      <div className="focus-content">
        <span>🌸 Sweet Focus</span>
        <h1>{activeState.subjectName}</h1>
        <strong>{formatTimer(elapsedSeconds)}</strong>

        <p>
          {activeState.timerStatus === 'paused'
            ? 'تایمر متوقف شده'
            : 'در حال مطالعه'}
        </p>

        <div className="timer-buttons">
          {activeState.timerStatus === 'running' ? (
            <button onClick={onPause} disabled={working}>
              <Pause size={18} />
              توقف موقت
            </button>
          ) : (
            <button onClick={onResume} disabled={working}>
              <Play size={18} />
              ادامه
            </button>
          )}

          <button
            className="danger-button"
            onClick={onStop}
            disabled={working}
          >
            <Square size={18} />
            پایان مطالعه
          </button>
        </div>
      </div>
    </main>
  )
}
