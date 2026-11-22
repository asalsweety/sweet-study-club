import { lazy, Suspense, useEffect, useSyncExternalStore } from 'react'
import { RefreshCw } from 'lucide-react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { appRoutes } from './app/navigation/routes'
import { useOnlineStatus } from './app/pwa/online-status'
import { usePrefetchStudyData, useProfile, useSession, useSettings } from './app/session'
import { ApiClientError } from './shared/api/api-client-error'
import { Button } from './components/ui/button'
import StudySticker from './components/StudySticker'
import Toaster from './components/Toaster'
import { confirmStore } from './shared/lib/confirm'
import { useSessionCelebration } from './features/study/sessionCelebrationStore'
import { setThemePreference } from './features/theme/model'

const loadShell = () => import('./components/AppShell')
const loadHome = () => import('./pages/HomePage')
const loadFocus = () => import('./pages/FocusPage')
const AppShell = lazy(loadShell)
const AuthScreen = lazy(() => import('./features/auth/AuthScreen'))
const BackgroundServices = lazy(() => import('./features/presence/BackgroundServices'))
const BroadcastPopups = lazy(() => import('./features/broadcasts/BroadcastPopups'))
const SessionCelebration = lazy(() => import('./features/study/SessionCelebration'))
// Confirmations are only requested after sign-in; keep the dialog code out of the entry bundle.
const ConfirmHost = lazy(() => import('./components/ConfirmHost'))

const HomePage = lazy(loadHome)
const FocusPage = lazy(loadFocus)
const PlannerPage = lazy(() => import('./pages/PlannerPage'))
const ProgressPage = lazy(() => import('./pages/ProgressPage'))
const LearningPage = lazy(() => import('./pages/LearningPage'))
const OfflineLearningPage = lazy(() => import('./pages/OfflineLearningPage'))
const FriendsPage = lazy(() => import('./pages/FriendsPage'))
const RankingPage = lazy(() => import('./pages/RankingPage'))
const ShopPage = lazy(() => import('./pages/ShopPage'))
const FeedbackPage = lazy(() => import('./pages/FeedbackPage'))
const MePage = lazy(() => import('./pages/MePage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const LegalPage = lazy(() => import('./pages/LegalPage'))
const InvitePage = lazy(() => import('./pages/InvitePage'))
const OnboardingFlow = lazy(() => import('./features/onboarding/OnboardingFlow'))

function FullScreenLoader({ label }: { label: string }) {
  return (
    <main className="grid min-h-dvh place-items-center text-foreground" aria-live="polite">
      <div className="flex flex-col items-center gap-5 [animation:fade-in_500ms_ease-out_backwards]">
        <span className="relative grid size-16 place-items-center rounded-[1.4rem] bg-primary text-primary-foreground shadow-[var(--glow-primary)]">
          <span aria-hidden className="absolute inset-0 animate-ping rounded-[1.4rem] bg-primary/30 motion-reduce:animate-none" />
          <StudySticker kind="bee" className="relative size-10" />
        </span>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </main>
  )
}

function PageFallback() {
  return (
    <div className="grid gap-4" aria-live="polite" aria-label="در حال بارگذاری">
      <div className="skeleton h-40 rounded-[2rem]" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="skeleton h-32 rounded-[2rem]" />
        <div className="skeleton h-32 rounded-[2rem]" />
      </div>
    </div>
  )
}

function ConnectionProblem({ profile = false, retry, pending }: { profile?: boolean; retry: () => void; pending: boolean }) {
  return <main dir="rtl" className="grid min-h-dvh place-items-center p-6">
    <section className="surface max-w-md p-8 text-center [animation:rise-in_520ms_var(--ease-spring)_backwards]">
      <RefreshCw className="mx-auto mb-5 text-primary" size={28} />
      <h1 className="text-xl font-bold">{profile ? 'اطلاعات حسابت بارگذاری نشد' : 'اتصال برقرار نشد'}</h1>
      <p className="my-4 text-sm leading-7 text-muted-foreground">اتصال اینترنت را بررسی کن و دوباره تلاش کن. نیازی به ساخت حساب جدید نیست.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button disabled={pending} onClick={retry}>{pending ? 'در حال بررسی…' : 'تلاش دوباره'}</Button>
        <Button asChild variant="outline"><Link to={appRoutes.offline}>کتابخانۀ آفلاین</Link></Button>
      </div>
    </section>
  </main>
}

export default function App() {
  return <><AppContent /><Toaster /></>
}

function SessionDialogs() {
  const confirm = useSyncExternalStore(confirmStore.subscribe, confirmStore.get, confirmStore.get)
  const celebration = useSessionCelebration()
  return <Suspense fallback={null}>
    {confirm && <ConfirmHost />}
    {celebration && <SessionCelebration />}
  </Suspense>
}

function AppContent() {
  const { pathname } = useLocation()
  const online = useOnlineStatus()
  return pathname === appRoutes.offline
    ? <Suspense fallback={<FullScreenLoader label="در حال بازکردن کتابخانۀ آفلاین..." />}><OfflineLearningPage online={online} /></Suspense>
    : <AccountContent online={online} />
}

function AccountContent({ online }: { online: boolean }) {
  const session = useSession()
  const signedIn = Boolean(session.data)
  const profile = useProfile(signedIn)
  const settings = useSettings(signedIn)
  const { pathname, search } = useLocation()
  const isToday = pathname === appRoutes.home
  const isFocus = pathname === appRoutes.focus
  usePrefetchStudyData(signedIn && (isToday || isFocus),
    isToday || settings.data?.timerDisplay === 'chibi' || (isFocus && new URLSearchParams(search).get('room') === 'pixel'))
  const accountTheme = profile.data?.theme
  useEffect(() => {
    if (accountTheme) setThemePreference(accountTheme)
  }, [accountTheme])
  useEffect(() => {
    if (!signedIn || pathname === '/welcome') return
    // Load the destination's code while the account reads are in flight.
    // React.lazy will handle import failures when the route renders.
    if (pathname === appRoutes.focus) void loadFocus().catch(() => {})
    else {
      void loadShell().catch(() => {})
      if (pathname === appRoutes.home) void loadHome().catch(() => {})
    }
  }, [signedIn, pathname])
  // Privacy and terms are public: readable before signing in.
  if (pathname === '/privacy' || pathname === '/terms') return <Suspense fallback={<FullScreenLoader label="در حال بارگذاری..." />}><LegalPage kind={pathname === '/privacy' ? 'privacy' : 'terms'} /></Suspense>
  if (!online && (!signedIn || !profile.data || settings.isPending || pathname === appRoutes.learning)) {
    return <Navigate to={appRoutes.offline} replace />
  }
  if (session.isPending) return <FullScreenLoader label="در حال آماده‌سازی اتاق مطالعه..." />
  if (session.isError && !signedIn) return <ConnectionProblem retry={() => void session.refetch()} pending={session.isFetching} />
  const expired = profile.error instanceof ApiClientError && profile.error.status === 401
  if (!signedIn || expired) return <AuthScreen />
  if (profile.isError && !profile.data) return <ConnectionProblem profile retry={() => void profile.refetch()} pending={profile.isFetching} />
  if (!profile.data) return <FullScreenLoader label="در حال آماده‌کردن پروفایل..." />
  if (settings.isPending) return <FullScreenLoader label="در حال آماده‌کردن پروفایل..." />
  const popups = <Suspense fallback={null}><BroadcastPopups key={profile.data.id} userId={profile.data.id} /></Suspense>
  // First run (or an account from before profiles existed): ask who the learner is.
  if (settings.data && !settings.data.educationGroup && pathname !== '/welcome') {
    return <Suspense fallback={<FullScreenLoader label="در حال بارگذاری..." />}><OnboardingFlow settings={settings.data} />{popups}</Suspense>
  }

  return (
    <Suspense fallback={<FullScreenLoader label="در حال بارگذاری..." />}>
      <Routes>
        <Route path={appRoutes.focus} element={<FocusPage />} />
        {settings.data && <Route path="/welcome" element={<OnboardingFlow settings={settings.data} editing={Boolean(settings.data.educationGroup)} />} />}
        <Route
          path="*"
          element={
            <AppShell profile={profile.data}>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path={appRoutes.home} element={<HomePage profile={profile.data} />} />
                  <Route path={appRoutes.planner} element={<PlannerPage displayName={profile.data.displayName} />} />
                  <Route path={appRoutes.progress} element={<ProgressPage profile={profile.data} />} />
                  <Route path={appRoutes.learning} element={<LearningPage />} />
                  <Route path={appRoutes.friends} element={<FriendsPage />} />
                  <Route path={appRoutes.ranking} element={<RankingPage />} />
                  <Route path={appRoutes.shop} element={<ShopPage />} />
                  <Route path={appRoutes.feedback} element={<FeedbackPage />} />
                  <Route path={appRoutes.profile} element={<MePage profile={profile.data} />} />
                  <Route path={appRoutes.invite} element={<InvitePage />} />
                  {profile.data.role === 'admin' && <Route path={appRoutes.admin} element={<AdminPage />} />}
                  <Route path="*" element={<Navigate to={appRoutes.home} replace />} />
                </Routes>
              </Suspense>
            </AppShell>
          }
        />
      </Routes>
      <Suspense fallback={null}><BackgroundServices /></Suspense>
      {popups}
      <SessionDialogs />
    </Suspense>
  )
}
