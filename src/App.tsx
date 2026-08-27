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
import { Flower2, LoaderCircle, LogOut, Moon, Sun } from 'lucide-react'
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
import { demoReviewEnabled } from './shared/config/demo-review'
import { Alert, AlertDescription } from './components/ui/alert'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'

type AppSession = Session | { user: { id: string } }

const demoProfile: Profile = {
  id: 'demo-user',
  email: 'demo@sweet.local',
  displayName: 'کاربر نمایشی',
  avatarUrl: null,
  role: 'admin',
  theme: 'light',
}

const GamificationCelebration = lazy(
  () => import('./components/GamificationCelebration'),
)
const MePage = lazy(() => import('./components/MePage'))
const ProgressPage = lazy(() => import('./components/ProgressPage'))
const RankingPage = lazy(() => import('./components/RankingPage'))

function App() {
  const [session, setSession] = useState<AppSession | null>(null)
  const [demoMode, setDemoMode] = useState(false)
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
    if (!session || demoMode) return

    const interval = window.setInterval(() => {
      setScheduleClock(Date.now())
    }, 30_000)

    return () => window.clearInterval(interval)
  }, [demoMode, session])

  useEffect(() => {
    if (!session || demoMode) return

    void loadTodaySessions().catch((requestError) => {
      setMessage(
        requestError instanceof Error
          ? requestError.message
          : 'برنامه امروز بارگذاری نشد.',
      )
    })
  }, [currentScheduleDate, demoMode, loadTodaySessions, session])

  useEffect(() => {
    if (!session || demoMode) return

    const interval = window.setInterval(() => {
      void supabase.rpc('touch_presence')
    }, 30_000)

    return () => window.clearInterval(interval)
  }, [demoMode, session])

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

  const enterDemoReview = () => {
    if (!demoReviewEnabled) return

    const now = Date.now()

    setDemoMode(true)
    setSession({ user: { id: demoProfile.id } })
    setProfile(demoProfile)
    setSessions([
      {
        id: 'demo-session',
        title: 'پارت نمایشی امروز',
        sessionDate: dateInTehran(now),
        startsAt: new Date(now - 15 * 60_000).toISOString(),
        endsAt: new Date(now + 45 * 60_000).toISOString(),
        isCancelled: false,
      },
    ])
    setActiveState(null)
    setMessage('نسخه نمایشی محلی فعال است؛ داده‌ها ذخیره نمی‌شوند.')
  }

  const startDemoTimer = (
    mode: 'free' | 'scheduled',
    sessionId: string | null,
  ) => {
    const startedAt = new Date().toISOString()

    setActiveState({
      userId: demoProfile.id,
      logId: 'demo-log',
      mode,
      subjectName: currentSubject,
      sessionId,
      timerStatus: 'running',
      startedAt,
      currentSegmentStartedAt: startedAt,
      pausedAt: null,
      accumulatedSeconds: 0,
      focusLockEnabled: focusLock,
    })
    setShowStartPanel(false)
    setCustomSubject('')
  }

  const startFreeStudy = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!currentSubject) {
      setMessage('اول اسم درس را انتخاب یا وارد کن.')
      return
    }

    setWorking(true)
    setMessage('')

    try {
      if (demoMode) {
        startDemoTimer('free', null)
        return
      }

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
      if (demoMode) {
        startDemoTimer('scheduled', activeScheduledSession.id)
        return
      }

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
    if (demoMode && activeState) {
      const pausedAt = new Date().toISOString()

      setActiveState({
        ...activeState,
        timerStatus: 'paused',
        currentSegmentStartedAt: null,
        pausedAt,
        accumulatedSeconds: calculateElapsed(activeState),
      })
      return
    }

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
    if (demoMode && activeState) {
      setActiveState({
        ...activeState,
        timerStatus: 'running',
        currentSegmentStartedAt: new Date().toISOString(),
        pausedAt: null,
      })
      return
    }

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
    if (demoMode) {
      setMessage(
        `آفرین! ${formatTimer(elapsedSeconds)} مطالعه نمایشی تمام شد.`,
      )
      setActiveState(null)
      return
    }

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

    if (demoMode) {
      setProfile({ ...profile, theme: nextTheme })
      return
    }

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
    if (demoMode) {
      setDemoMode(false)
      setSession(null)
      setProfile(null)
      setSessions([])
      setActiveState(null)
      setMessage('')
      return
    }

    await supabase.auth.signOut()
    window.location.reload()
  }

  const themeClass =
    profile?.theme === 'dark' ? 'theme-dark' : 'theme-light'

  if (loading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background text-foreground">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="animate-spin" size={20} />
          در حال بارگذاری برنامه...
        </div>
      </main>
    )
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
    return <Auth onDemoLogin={enterDemoReview} />
  }

  if (!profile) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background text-foreground">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="animate-spin" size={20} />
          در حال آماده‌کردن پروفایل...
        </div>
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
    <main
      className={`${themeClass} min-h-dvh bg-background px-4 py-5 text-foreground sm:px-6`}
      dir="rtl"
    >
      <header className="mx-auto mb-6 flex w-full max-w-6xl items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Flower2 size={23} />
          </span>
          <div className="min-w-0">
            <Badge variant="secondary" className="mb-1 hidden sm:inline-flex">
              اتاق مطالعه گروهی
            </Badge>
            <h1 className="truncate text-lg font-black tracking-tight sm:text-2xl">
              Sweet Study Club
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant="outline"
            onClick={toggleTheme}
            aria-label={profile.theme === 'dark' ? 'فعال‌کردن تم روشن' : 'فعال‌کردن تم تیره'}
          >
            {profile.theme === 'dark' ? (
              <Sun size={19} />
            ) : (
              <Moon size={19} />
            )}
          </Button>

          <Button variant="ghost" onClick={logout}>
            <LogOut size={19} />
            <span className="hidden sm:inline">خروج</span>
          </Button>
        </div>
      </header>

      {message && (
        <Alert className="mx-auto mb-5 max-w-6xl">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Suspense
        fallback={
          <section
            className="mx-auto flex min-h-64 max-w-6xl items-center justify-center gap-3 text-sm text-muted-foreground"
            aria-live="polite"
          >
            <LoaderCircle className="animate-spin" size={20} />
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
                demoMode={demoMode}
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
              <div className="mx-auto w-full max-w-6xl pb-28">
                <MePage
                  profile={profile}
                  demoMode={demoMode}
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
              <div className="mx-auto w-full max-w-6xl pb-28">
                <ProgressPage
                  userId={profile.id}
                  displayName={profile.displayName}
                  demoMode={demoMode}
                />
              </div>
            }
          />

          <Route
            path={appRoutes.ranking}
            element={
              <div className="mx-auto w-full max-w-6xl pb-28">
                <RankingPage
                  currentUserId={profile.id}
                  demoMode={demoMode}
                />
              </div>
            }
          />

          <Route
            path="*"
            element={<Navigate to={appRoutes.home} replace />}
          />
        </Routes>

        {!demoMode && (
          <GamificationCelebration
            userId={profile.id}
            refreshKey={activeState ? 1 : 0}
          />
        )}
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
