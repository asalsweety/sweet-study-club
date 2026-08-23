import ProfileAndPresence from './components/ProfileAndPresence'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  Clock3,
  Focus,
  LogOut,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Square,
  Sun,
} from 'lucide-react'
import { supabase } from './lib/supabase'
import BottomNavigation, {
  type AppTab,
} from './components/BottomNavigation'
import LiveStudy from './components/LiveStudy'
import MePage from './components/MePage'
import ProgressPage from './components/ProgressPage'
import RankingPage from './components/RankingPage'
import GamificationCelebration from './components/GamificationCelebration'
import './App.css'

type Profile = {
  id: string
  email: string
  display_name: string
  avatar_url: string | null
  role: 'member' | 'admin'
  theme: 'light' | 'dark' | 'system'
}

type StudySession = {
  id: string
  title: string
  session_date: string
  starts_at: string
  ends_at: string
  is_cancelled: boolean
}

type ActiveStudyState = {
  user_id: string
  log_id: string
  mode: 'free' | 'scheduled' | 'pomodoro'
  subject_name: string
  session_id: string | null
  timer_status: 'running' | 'paused'
  started_at: string
  current_segment_started_at: string | null
  paused_at: string | null
  accumulated_seconds: number
  focus_lock_enabled: boolean
}

const subjects = [
  'زیست',
  'شیمی',
  'فیزیک',
  'ریاضی',
  'ادبیات',
  'دینی',
  'زبان',
  'تست جامع',
  'مرور',
]

function formatTimer(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const hours = String(Math.floor(safeSeconds / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((safeSeconds % 3600) / 60)).padStart(2, '0')
  const seconds = String(safeSeconds % 60).padStart(2, '0')

  return `${hours}:${minutes}:${seconds}`
}

function calculateElapsed(state: ActiveStudyState | null) {
  if (!state) return 0

  if (
    state.timer_status === 'running' &&
    state.current_segment_started_at
  ) {
    const currentSegment = Math.max(
      0,
      Math.floor(
        (Date.now() -
          new Date(state.current_segment_started_at).getTime()) /
          1000,
      ),
    )

    return state.accumulated_seconds + currentSegment
  }

  return state.accumulated_seconds
}

function formatClock(value: string) {
  return new Intl.DateTimeFormat('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tehran',
  }).format(new Date(value))
}

function todayInTehran() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [activeState, setActiveState] =
    useState<ActiveStudyState | null>(null)

  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [selectedSubject, setSelectedSubject] = useState('زیست')
  const [customSubject, setCustomSubject] = useState('')
  const [focusLock, setFocusLock] = useState(false)
  const [showStartPanel, setShowStartPanel] = useState(false)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState<AppTab>('home')

  const currentSubject =
    customSubject.trim() || selectedSubject.trim()

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, display_name, avatar_url, role, theme')
      .eq('id', userId)
      .single()

    if (error) throw error
    setProfile(data as Profile)
  }, [])

  const loadTodaySessions = useCallback(async () => {
    const { data, error } = await supabase
      .from('study_sessions')
      .select(
        'id, title, session_date, starts_at, ends_at, is_cancelled',
      )
      .eq('session_date', todayInTehran())
      .eq('is_cancelled', false)
      .order('starts_at', { ascending: true })

    if (error) throw error
    setSessions((data ?? []) as StudySession[])
  }, [])

  const loadActiveState = useCallback(async () => {
    const { data, error } = await supabase
      .from('active_study_states')
      .select(
        'user_id, log_id, mode, subject_name, session_id, timer_status, started_at, current_segment_started_at, paused_at, accumulated_seconds, focus_lock_enabled',
      )
      .maybeSingle()

    if (error) throw error

    const nextState = (data ?? null) as ActiveStudyState | null
    setActiveState(nextState)
    setElapsedSeconds(calculateElapsed(nextState))
    setFocusLock(nextState?.focus_lock_enabled ?? false)
  }, [])

  useEffect(() => {
    let mounted = true

    const initialize = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (!mounted) return

      if (error) {
        setMessage(error.message)
        setLoading(false)
        return
      }

      setSession(data.session)
console.log("AUTH SESSION:", data.session)

      if (data.session?.user?.id) {
        try {
          await Promise.all([
            loadProfile(data.session?.user?.id),
            loadTodaySessions(),
            loadActiveState(),
          ])
          await supabase.rpc('touch_presence')
        } catch (requestError) {
          setMessage(
            requestError instanceof Error
              ? requestError.message
              : 'اطلاعات برنامه بارگذاری نشد.',
          )
        }
      }

      setLoading(false)
    }

    initialize()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadActiveState, loadProfile, loadTodaySessions])

  useEffect(() => {
    if (!activeState) {
      setElapsedSeconds(0)
      return
    }

    setElapsedSeconds(calculateElapsed(activeState))

    const interval = window.setInterval(() => {
      setElapsedSeconds(calculateElapsed(activeState))
    }, 1000)

    return () => window.clearInterval(interval)
  }, [activeState])

  useEffect(() => {
    if (!session) return

    const interval = window.setInterval(() => {
      void supabase.rpc('touch_presence')
    }, 30_000)

    return () => window.clearInterval(interval)
  }, [session])

  useEffect(() => {
    if (!activeState?.focus_lock_enabled) return

    document.body.classList.add('focus-active')

    return () => {
      document.body.classList.remove('focus-active')
    }
  }, [activeState?.focus_lock_enabled])

  const activeScheduledSession = useMemo(() => {
    const now = Date.now()

    return sessions.find((item) => {
      return (
        new Date(item.starts_at).getTime() <= now &&
        new Date(item.ends_at).getTime() > now
      )
    })
  }, [sessions])

  const startFreeStudy = async (event: FormEvent) => {
    event.preventDefault()

    if (!currentSubject) {
      setMessage('اول اسم درس را انتخاب یا وارد کن.')
      return
    }

    setWorking(true)
    setMessage('')

    const { error } = await supabase.rpc('start_study_timer', {
      requested_mode: 'free',
      requested_subject: currentSubject,
      requested_session_id: null,
      requested_focus_lock: focusLock,
    })

    if (error) {
      setMessage(error.message)
    } else {
      setShowStartPanel(false)
      setCustomSubject('')
      await loadActiveState()
    }

    setWorking(false)
  }

  const startScheduledStudy = async () => {
    if (!activeScheduledSession) {
      setMessage('در حال حاضر پارت فعالی وجود ندارد.')
      return
    }

    if (!currentSubject) {
      setMessage('اول اسم درس را انتخاب یا وارد کن.')
      return
    }

    setWorking(true)
    setMessage('')

    const { error } = await supabase.rpc('start_study_timer', {
      requested_mode: 'scheduled',
      requested_subject: currentSubject,
      requested_session_id: activeScheduledSession.id,
      requested_focus_lock: focusLock,
    })

    if (error) {
      setMessage(error.message)
    } else {
      setShowStartPanel(false)
      setCustomSubject('')
      await loadActiveState()
    }

    setWorking(false)
  }

  const pauseTimer = async () => {
    setWorking(true)
    setMessage('')

    const { error } = await supabase.rpc('pause_study_timer')

    if (error) setMessage(error.message)
    else await loadActiveState()

    setWorking(false)
  }

  const resumeTimer = async () => {
    setWorking(true)
    setMessage('')

    const { error } = await supabase.rpc('resume_study_timer')

    if (error) setMessage(error.message)
    else await loadActiveState()

    setWorking(false)
  }

  const stopTimer = async () => {
    setWorking(true)
    setMessage('')

    const { data, error } = await supabase.rpc('stop_study_timer')

    if (error) {
      setMessage(error.message)
    } else {
      const result = Array.isArray(data) ? data[0] : null
      const savedSeconds =
        result?.final_duration_seconds ?? elapsedSeconds

      setMessage(
        `آفرین! ${formatTimer(savedSeconds)} مطالعه ثبت شد 🎀`,
      )
      await loadActiveState()
    }

    setWorking(false)
  }

  const toggleTheme = async () => {
    if (!profile) return

    const nextTheme = profile.theme === 'dark' ? 'light' : 'dark'

    const { error } = await supabase
      .from('profiles')
      .update({ theme: nextTheme })
      .eq('id', profile.id)

    if (!error) {
      setProfile({ ...profile, theme: nextTheme })
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const themeClass =
    profile?.theme === 'dark' ? 'theme-dark' : 'theme-light'

  if (loading) {
    return <main className="loading-screen">در حال بارگذاری برنامه...</main>
  }

  if (!session) {
    return (
      <ProfileAndPresence
        userId={session!.user.id}
        displayName={profile?.display_name ?? ''}
        avatarUrl={profile?.avatar_url ?? ''}
        activeStatus="online"
        activeSubject=""
        activeMode="free"
        onProfileUpdated={() => {
          loadProfile(session!.user.id)
        }}
      />
    )
  }

  if (!profile) {
    return (
      <main className="loading-screen">
        در حال ساخت پروفایل...
      </main>
    )
  }


  if (activeState?.focus_lock_enabled) {
    return (
      <main className={`focus-screen ${themeClass}`}>
        <button
          className="focus-exit"
          onClick={() =>
            setActiveState({
              ...activeState,
              focus_lock_enabled: false,
            })
          }
        >
          خروج از نمای فوکوس
        </button>

        <div className="focus-content">
          <span>🌸 Sweet Focus</span>
          <h1>{activeState.subject_name}</h1>
          <strong>{formatTimer(elapsedSeconds)}</strong>

          <p>
            {activeState.timer_status === 'paused'
              ? 'تایمر متوقف شده'
              : 'در حال مطالعه'}
          </p>

          <div className="timer-buttons">
            {activeState.timer_status === 'running' ? (
              <button onClick={pauseTimer} disabled={working}>
                <Pause size={18} />
                توقف موقت
              </button>
            ) : (
              <button onClick={resumeTimer} disabled={working}>
                <Play size={18} />
                ادامه
              </button>
            )}

            <button
              className="danger-button"
              onClick={stopTimer}
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

  return (
    <main className={`app-shell ${themeClass}`}>
      <header className="topbar">
        <div>
          <p>🎀 اتاق مطالعه گروهی</p>
          <h1>Sweet Study Club</h1>
        </div>

        <div className="header-actions">
          <button onClick={toggleTheme} aria-label="تغییر تم">
            {profile.theme === 'dark' ? (
              <Sun size={19} />
            ) : (
              <Moon size={19} />
            )}
          </button>

          <button onClick={logout}>
            <LogOut size={19} />
            خروج
          </button>
        </div>
      </header>

      {message && <div className="notice">{message}</div>}

      {activeTab === 'home' && (
        <div className="tab-page home-tab-page">
          <section className="hero-grid">
        <article className="timer-card">
          <div className="timer-heading">
            <div>
              <span>تایمر مطالعه من</span>
              <h2>
                {activeState
                  ? activeState.subject_name
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
              {activeState.timer_status === 'running' ? (
                <button onClick={pauseTimer} disabled={working}>
                  <Pause size={18} />
                  Pause
                </button>
              ) : (
                <button onClick={resumeTimer} disabled={working}>
                  <Play size={18} />
                  Resume
                </button>
              )}

              <button
                className="danger-button"
                onClick={stopTimer}
                disabled={working}
              >
                <Square size={18} />
                Stop
              </button>
            </div>
          ) : (
            <button
              className="primary-button"
              onClick={() => setShowStartPanel(true)}
            >
              <Play size={18} />
              شروع مطالعه
            </button>
          )}
        </article>

        <article className="profile-card">
          <div className="avatar-circle">
            {profile.display_name.slice(0, 1).toUpperCase()}
          </div>

          <div>
            <span>
              {profile.role === 'admin' ? 'مدیر اصلی' : 'عضو'}
            </span>
            <h2>{profile.display_name}</h2>
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
            {sessions.map((item) => {
              const isActive = item.id === activeScheduledSession?.id

              return (
                <div
                  className={`session-row ${
                    isActive ? 'active-session' : ''
                  }`}
                  key={item.id}
                >
                  <div>
                    <strong>{item.title}</strong>
                    <span>
                      {formatClock(item.starts_at)} تا{' '}
                      {formatClock(item.ends_at)}
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
            onClick={() => setShowStartPanel(true)}
            disabled={Boolean(activeState)}
          >
            <Play size={18} />
            شروع مطالعه آزاد
          </button>
        </article>
      </section>

          <LiveStudy currentUserId={profile.id} />
        </div>
      )}

      {activeTab === 'me' && (
        <div className="tab-page me-tab-page">
          <MePage
            profile={profile}
            onProfileUpdated={(updatedProfile) =>
              setProfile(updatedProfile)
            }
          />
        </div>
      )}

      {activeTab === 'progress' && (
        <div className="tab-page progress-tab-page">
          <ProgressPage
            userId={profile.id}
            displayName={profile.display_name}
          />
        </div>
      )}

      {activeTab === 'ranking' && (
        <div className="tab-page ranking-tab-page">
          <RankingPage currentUserId={profile.id} />
        </div>
      )}

      <GamificationCelebration
        userId={profile.id}
        refreshKey={activeState ? 1 : 0}
      />

      <BottomNavigation
        activeTab={activeTab}
        onChange={(nextTab) => {
          setActiveTab(nextTab)
          window.scrollTo({
            top: 0,
            behavior: 'smooth',
          })
        }}
      />

      {showStartPanel && !activeState && (
        <div className="modal">
          <button
            className="modal-backdrop"
            aria-label="بستن"
            onClick={() => setShowStartPanel(false)}
          />

          <form className="start-card" onSubmit={startFreeStudy}>
            <button
              type="button"
              className="close-button"
              onClick={() => setShowStartPanel(false)}
            >
              ×
            </button>

            <p>📚 امروز چی می‌خونی؟</p>
            <h2>شروع یک مطالعه جدید</h2>

            <div className="subject-grid">
              {subjects.map((subject) => (
                <button
                  type="button"
                  key={subject}
                  className={
                    selectedSubject === subject &&
                    !customSubject.trim()
                      ? 'selected'
                      : ''
                  }
                  onClick={() => {
                    setSelectedSubject(subject)
                    setCustomSubject('')
                  }}
                >
                  {subject}
                </button>
              ))}
            </div>

            <label>
              یا اسم درس را بنویس
              <input
                value={customSubject}
                onChange={(event) =>
                  setCustomSubject(event.target.value)
                }
                placeholder="مثلاً آناتومی"
              />
            </label>

            <label className="focus-option">
              <input
                type="checkbox"
                checked={focusLock}
                onChange={(event) =>
                  setFocusLock(event.target.checked)
                }
              />

              <span>
                <Focus size={20} />
                فعال‌کردن Focus Lock
              </span>
            </label>

            <div className="start-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={working}
              >
                <Play size={18} />
                شروع مطالعه آزاد
              </button>

              <button
                type="button"
                className="secondary-button"
                disabled={!activeScheduledSession || working}
                onClick={startScheduledStudy}
              >
                <RotateCcw size={18} />
                ورود به پارت فعال
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}

export default App
