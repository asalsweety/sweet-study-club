import { lazy } from 'react'
import { Clock3, Pause, Play, Square } from 'lucide-react'
import type { Profile } from '../../../entities/profile/model'
import type {
  ActiveStudyState,
  StudySession,
} from '../../../entities/study/model'
import { formatTimer } from '../../../shared/lib/time'

const LiveStudy = lazy(() => import('../../../components/LiveStudy'))

type StudyHomePageProps = {
  profile: Profile
  sessions: readonly StudySession[]
  activeState: ActiveStudyState | null
  activeScheduledSession: StudySession | undefined
  elapsedSeconds: number
  working: boolean
  onOpenStartDialog: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
}

function formatClock(value: string) {
  return new Intl.DateTimeFormat('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tehran',
  }).format(new Date(value))
}

export default function StudyHomePage({
  profile,
  sessions,
  activeState,
  activeScheduledSession,
  elapsedSeconds,
  working,
  onOpenStartDialog,
  onPause,
  onResume,
  onStop,
}: StudyHomePageProps) {
  return (
    <div className="tab-page home-tab-page">
      <section className="hero-grid">
        <article className="timer-card">
          <div className="timer-heading">
            <div>
              <span>تایمر مطالعه من</span>
              <h2>
                {activeState
                  ? activeState.subjectName
                  : 'هنوز مطالعه‌ای شروع نشده'}
              </h2>
            </div>

            <Clock3 size={30} />
          </div>

          <strong className="main-timer">
            {formatTimer(elapsedSeconds)}
          </strong>

          {activeState ? (
            <div className="timer-buttons">
              {activeState.timerStatus === 'running' ? (
                <button onClick={onPause} disabled={working}>
                  <Pause size={18} />
                  Pause
                </button>
              ) : (
                <button onClick={onResume} disabled={working}>
                  <Play size={18} />
                  Resume
                </button>
              )}

              <button
                className="danger-button"
                onClick={onStop}
                disabled={working}
              >
                <Square size={18} />
                Stop
              </button>
            </div>
          ) : (
            <button
              className="primary-button"
              onClick={onOpenStartDialog}
            >
              <Play size={18} />
              شروع مطالعه
            </button>
          )}
        </article>

        <article className="profile-card">
          <div className="avatar-circle">
            {profile.displayName.slice(0, 1).toUpperCase()}
          </div>

          <div>
            <span>
              {profile.role === 'admin' ? 'مدیر اصلی' : 'عضو'}
            </span>
            <h2>{profile.displayName}</h2>
            <p>
              {profile.role === 'admin'
                ? 'مدیر Sweet Study Club'
                : 'عضو Sweet Study Club'}
            </p>
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-title">
            <div>
              <p>برنامه امروز</p>
              <h2>پارت‌های درسی</h2>
            </div>

            <span>{sessions.length.toLocaleString('fa-IR')} پارت</span>
          </div>

          <div className="session-list">
            {sessions.map((session) => {
              const isActive =
                session.id === activeScheduledSession?.id

              return (
                <div
                  className={`session-row ${
                    isActive ? 'active-session' : ''
                  }`}
                  key={session.id}
                >
                  <div>
                    <strong>{session.title}</strong>
                    <span>
                      {formatClock(session.startsAt)} تا{' '}
                      {formatClock(session.endsAt)}
                    </span>
                  </div>

                  {isActive && <b>در حال برگزاری</b>}
                </div>
              )
            })}
          </div>
        </article>

        <article className="panel free-study-panel">
          <p>🌸 Sweet Free Study</p>
          <h2>هر وقت خواستی شروع کن</h2>
          <span>
            بدون محدودیت زمانی، درس را انتخاب کن و تایمرت را روشن
            کن.
          </span>

          <button
            className="primary-button"
            onClick={onOpenStartDialog}
            disabled={Boolean(activeState)}
          >
            <Play size={18} />
            شروع مطالعه آزاد
          </button>
        </article>
      </section>

      <LiveStudy currentUserId={profile.id} />
    </div>
  )
}
