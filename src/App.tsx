import { lazy, Suspense, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { appRoutes } from './app/navigation/routes'
import { useProfile, useSession, useSignOut } from './app/session'
import AppShell from './components/AppShell'
import IntroSlider from './components/onboarding/IntroSlider'
import Welcome from './components/onboarding/Welcome'
import AuthScreen from './features/auth/AuthScreen'
import BackgroundServices from './features/presence/BackgroundServices'

const HomePage = lazy(() => import('./pages/HomePage'))
const FocusPage = lazy(() => import('./pages/FocusPage'))
const PlannerPage = lazy(() => import('./pages/PlannerPage'))
const ProgressPage = lazy(() => import('./pages/ProgressPage'))
const FriendsPage = lazy(() => import('./pages/FriendsPage'))
const RankingPage = lazy(() => import('./pages/RankingPage'))
const ShopPage = lazy(() => import('./pages/ShopPage'))
const MePage = lazy(() => import('./pages/MePage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const InvitePage = lazy(() => import('./pages/InvitePage'))

const ONBOARDING_KEY = 'sweet-study-onboarding'

function FullScreenLoader({ label }: { label: string }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background text-foreground" aria-live="polite">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <LoaderCircle className="animate-spin text-primary" size={20} />
        {label}
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

export default function App() {
  const session = useSession()
  const signedIn = Boolean(session.data)
  const profile = useProfile(signedIn)
  const signOut = useSignOut()
  const [onboarding, setOnboarding] = useState<'welcome' | 'intro' | null>(() =>
    window.location.pathname === appRoutes.onboarding || !localStorage.getItem(ONBOARDING_KEY) ? 'welcome' : null,
  )

  const finishOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    if (window.location.pathname === appRoutes.onboarding) window.history.replaceState({}, '', appRoutes.home)
    setOnboarding(null)
  }

  if (onboarding === 'welcome') return <Welcome onStart={() => setOnboarding('intro')} onLogin={finishOnboarding} />
  if (onboarding === 'intro') return <IntroSlider onFinish={finishOnboarding} />
  if (session.isPending) return <FullScreenLoader label="در حال آماده‌سازی اتاق مطالعه..." />
  if (!signedIn) return <AuthScreen onShowIntro={() => setOnboarding('welcome')} />
  if (!profile.data) return <FullScreenLoader label="در حال آماده‌کردن پروفایل..." />

  return (
    <Suspense fallback={<FullScreenLoader label="در حال بارگذاری..." />}>
      <Routes>
        <Route path={appRoutes.focus} element={<FocusPage />} />
        <Route
          path="*"
          element={
            <AppShell profile={profile.data} onSignOut={() => signOut.mutate()}>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path={appRoutes.home} element={<HomePage profile={profile.data} />} />
                  <Route path={appRoutes.planner} element={<PlannerPage />} />
                  <Route path={appRoutes.progress} element={<ProgressPage profile={profile.data} />} />
                  <Route path={appRoutes.friends} element={<FriendsPage />} />
                  <Route path={appRoutes.ranking} element={<RankingPage />} />
                  <Route path={appRoutes.shop} element={<ShopPage />} />
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
      <BackgroundServices />
    </Suspense>
  )
}
