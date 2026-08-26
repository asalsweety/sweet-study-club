import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Navigate, Route, Routes } from 'react-router-dom'
import { LogOut, Moon, Sun } from 'lucide-react'
import { supabase } from './lib/supabase'
import BottomNavigation from './components/BottomNavigation'
import './App.css'
import Auth from './components/Auth'
import Welcome from './components/onboarding/Welcome'
import IntroSlider from './components/onboarding/IntroSlider'
import type { Profile } from './entities/profile/model'
import type {
  ActiveStudyState,
  StudySession,
} from './entities/study/model'
import { legacySupabaseProfileApi } from './features/profile/api/legacySupabaseProfileApi'
import { legacySupabaseStudyApi } from './features/study/api/legacySupabaseStudyApi'
import FocusStudyScreen from './features/study/components/FocusStudyScreen'
import StartStudyDialog from './features/study/components/StartStudyDialog'
import StudyHomePage from './features/study/components/StudyHomePage'
import {
  calculateElapsed,
  dateInTehran,
  findActiveScheduledSession,
  formatTimer,
} from './shared/lib/time'
import { appRoutes } from './app/navigation/routes'

const GamificationCelebration = lazy(
  () => import('./components/GamificationCelebration'),
)
const MePage = lazy(() => import('./components/MePage'))
const ProgressPage = lazy(() => import('./components/ProgressPage'))
const RankingPage = lazy(() => import('./components/RankingPage'))

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [activeState, setActiveState] =
    useState<ActiveStudyState | null>(null)

  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [scheduleClock, setScheduleClock] = useState(() => Date.now())
  const [selectedSubject, setSelectedSubject] = useState('زیست')
  const [customSubject, setCustomSubject] = useState('')
  const [focusLock, setFocusLock] = useState(false)
  const [showStartPanel, setShowStartPanel] = useState(false)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const seen = localStorage.getItem(
      'sweet-study-onboarding'
    )

    return !seen
  })
  const [onboardingStep, setOnboardingStep] =
    useState<'welcome' | 'intro'>('welcome')

  const currentSubject =
    customSubject.trim() || selectedSubject.trim()

  const loadProfile = useCallback(async (userId: string) => {
    setProfile(await legacySupabaseProfileApi.getProfile(userId))
  }, [])

  const loadTodaySessions = useCallback(async () => {
    setSessions(
      await legacySupabaseStudyApi.listSessionsForDate(
        dateInTehran(),
      ),
    )
  }, [])

  const loadActiveState = useCallback(async () => {
    const nextState = await legacySupabaseStudyApi.getActiveState()
    setActiveState(nextState)
    setElapsedSeconds(calculateElapsed(nextState))
    setFocusLock(nextState?.focusLockEnabled ?? false)
  }, [])

  const loadAccountData = useCallback(
    async (userId: string) => {
      await Promise.all([
        loadProfile(userId),
        loadTodaySessions(),
        loadActiveState(),
      ])
      await supabase.rpc('touch_presence')
    },
    [loadActiveState, loadProfile, loadTodaySessions],
  )

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

      if (data.session?.user?.id) {
        try {
          await loadAccountData(data.session.user.id)
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
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)

      if (event === 'INITIAL_SESSION') return

      if (!nextSession?.user?.id) {
        setProfile(null)
        setSessions([])
        setActiveState(null)
        setLoading(false)
        return
      }

      if (event !== 'SIGNED_IN') return

      setLoading(true)

      void (async () => {
        try {
          await loadAccountData(nextSession.user.id)
        } catch (requestError) {
          setMessage(
            requestError instanceof Error
              ? requestError.message
              : 'اطلاعات برنامه بارگذاری نشد.',
          )
        } finally {
          if (mounted) setLoading(false)
        }
      })()
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadAccountData])

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

  const currentScheduleDate = useMemo(
    () => dateInTehran(scheduleClock),
    [scheduleClock],
  )

  useEffect(() => {
    if (!session) return

    const interval = window.setInterval(() => {
      setScheduleClock(Date.now())
    }, 30_000)

    return () => window.clearInterval(interval)
  }, [session])

  useEffect(() => {
    if (!session) return

    void loadTodaySessions().catch((requestError) => {
      setMessage(
        requestError instanceof Error
          ? requestError.message
          : 'برنامه امروز بارگذاری نشد.',
      )
    })
  }, [currentScheduleDate, loadTodaySessions, session])

  useEffect(() => {
    if (!session) return

    const interval = window.setInterval(() => {
      void supabase.rpc('touch_presence')
    }, 30_000)

    return () => window.clearInterval(interval)
  }, [session])

  useEffect(() => {
    if (!activeState?.focusLockEnabled) return

    document.body.classList.add('focus-active')

    return () => {
      document.body.classList.remove('focus-active')
    }
  }, [activeState?.focusLockEnabled])

  const activeScheduledSession = useMemo(() => {
    return findActiveScheduledSession(sessions, scheduleClock)
  }, [scheduleClock, sessions])

  const startFreeStudy = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!currentSubject) {
      setMessage('اول اسم درس را انتخاب یا وارد کن.')
      return
    }

    setWorking(true)
    setMessage('')

    try {
      await legacySupabaseStudyApi.startTimer({
        mode: 'free',
        subject: currentSubject,
        sessionId: null,
        focusLockEnabled: focusLock,
      })
      setShowStartPanel(false)
      setCustomSubject('')
      await loadActiveState()
    } catch (requestError) {
      setMessage(
        requestError instanceof Error
          ? requestError.message
          : 'مطالعه شروع نشد.',
      )
    } finally {
      setWorking(false)
    }
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

    try {
      await legacySupabaseStudyApi.startTimer({
        mode: 'scheduled',
        subject: currentSubject,
        sessionId: activeScheduledSession.id,
        focusLockEnabled: focusLock,
      })
      setShowStartPanel(false)
      setCustomSubject('')
      await loadActiveState()
    } catch (requestError) {
      setMessage(
        requestError instanceof Error
          ? requestError.message
          : 'مطالعه زمان‌بندی‌شده شروع نشد.',
      )
    } finally {
      setWorking(false)
    }
  }

  const pauseTimer = async () => {
    setWorking(true)
    setMessage('')

    try {
      await legacySupabaseStudyApi.pauseTimer()
      await loadActiveState()
    } catch (requestError) {
      setMessage(
        requestError instanceof Error
          ? requestError.message
          : 'تایمر متوقف نشد.',
      )
    } finally {
      setWorking(false)
    }
  }

  const resumeTimer = async () => {
    setWorking(true)
    setMessage('')

    try {
      await legacySupabaseStudyApi.resumeTimer()
      await loadActiveState()
    } catch (requestError) {
      setMessage(
        requestError instanceof Error
          ? requestError.message
          : 'تایمر ادامه پیدا نکرد.',
      )
    } finally {
      setWorking(false)
    }
  }

  const stopTimer = async () => {
    setWorking(true)
    setMessage('')

    try {
      const savedSeconds =
        (await legacySupabaseStudyApi.stopTimer()) ?? elapsedSeconds
      setMessage(
        `آفرین! ${formatTimer(savedSeconds)} مطالعه ثبت شد 🎀`,
      )
      await loadActiveState()
    } catch (requestError) {
      setMessage(
        requestError instanceof Error
          ? requestError.message
          : 'مطالعه ذخیره نشد.',
      )
    } finally {
      setWorking(false)
    }
  }

  const toggleTheme = async () => {
    if (!profile) return

    const nextTheme = profile.theme === 'dark' ? 'light' : 'dark'

    try {
      await legacySupabaseProfileApi.updateTheme(profile.id, nextTheme)
      setProfile({ ...profile, theme: nextTheme })
    } catch (requestError) {
      setMessage(
        requestError instanceof Error
          ? requestError.message
          : 'تم ذخیره نشد.',
      )
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

  if (showOnboarding) {
    if (onboardingStep === 'welcome') {
      return (
        <Welcome
          onStart={() => setOnboardingStep('intro')}
          onLogin={() => {
            localStorage.setItem(
              'sweet-study-onboarding',
              'true'
            )
            setShowOnboarding(false)
          }}
        />
      )
    }

    return (
      <IntroSlider
        onFinish={() => {
          localStorage.setItem(
            'sweet-study-onboarding',
            'true'
          )
          setShowOnboarding(false)
        }}
      />
    )
  }

  if (!session) {
    return <Auth />
  }

  if (!profile) {
    return (
      <main className="loading-screen">
        در حال ساخت پروفایل...
      </main>
    )
  }


  if (activeState?.focusLockEnabled) {
    return (
      <FocusStudyScreen
        activeState={activeState}
        elapsedSeconds={elapsedSeconds}
        themeClass={themeClass}
        working={working}
        onExit={() =>
          setActiveState({
            ...activeState,
            focusLockEnabled: false,
          })
        }
        onPause={() => void pauseTimer()}
        onResume={() => void resumeTimer()}
        onStop={() => void stopTimer()}
      />
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

      <Suspense
        fallback={
          <section className="loading-screen" aria-live="polite">
            در حال بارگذاری بخش...
          </section>
        }
      >
        <Routes>
          <Route
            path={appRoutes.home}
            element={
              <StudyHomePage
                profile={profile}
                sessions={sessions}
                activeState={activeState}
                activeScheduledSession={activeScheduledSession}
                elapsedSeconds={elapsedSeconds}
                working={working}
                onOpenStartDialog={() => setShowStartPanel(true)}
                onPause={() => void pauseTimer()}
                onResume={() => void resumeTimer()}
                onStop={() => void stopTimer()}
              />
            }
          />

          <Route
            path={appRoutes.profile}
            element={
              <div className="tab-page me-tab-page">
                <MePage
                  profile={profile}
                  onProfileUpdated={(updatedProfile) =>
                    setProfile(updatedProfile)
                  }
                />
              </div>
            }
          />

          <Route
            path={appRoutes.progress}
            element={
              <div className="tab-page progress-tab-page">
                <ProgressPage
                  userId={profile.id}
                  displayName={profile.displayName}
                />
              </div>
            }
          />

          <Route
            path={appRoutes.ranking}
            element={
              <div className="tab-page ranking-tab-page">
                <RankingPage currentUserId={profile.id} />
              </div>
            }
          />

          <Route
            path="*"
            element={<Navigate to={appRoutes.home} replace />}
          />
        </Routes>

        <GamificationCelebration
          userId={profile.id}
          refreshKey={activeState ? 1 : 0}
        />
      </Suspense>

      <BottomNavigation />

      {showStartPanel && !activeState && (
        <StartStudyDialog
          selectedSubject={selectedSubject}
          customSubject={customSubject}
          focusLockEnabled={focusLock}
          scheduledSessionAvailable={Boolean(activeScheduledSession)}
          working={working}
          onClose={() => setShowStartPanel(false)}
          onSelectSubject={(subject) => {
            setSelectedSubject(subject)
            setCustomSubject('')
          }}
          onCustomSubjectChange={setCustomSubject}
          onFocusLockChange={setFocusLock}
          onStartFreeStudy={(event) => void startFreeStudy(event)}
          onStartScheduledStudy={() => void startScheduledStudy()}
        />
      )}
    </main>
  )
}

export default App
