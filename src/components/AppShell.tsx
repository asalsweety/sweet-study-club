import { ArrowLeft, Flower2, Lock, Menu, Search } from 'lucide-react'
import { useTimerView } from '../features/study/useStudyTimer'
import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { appRoutes } from '../app/navigation/routes'
import { useOnlineStatus } from '../app/pwa/online-status'
import type { UserProfile } from '../shared/api/profile'
import BottomNavigation from './BottomNavigation'
import Avatar from './Avatar'
import Sidebar from './Sidebar'
import './workspace-reference.css'
import { accountNavigation, adminNavigation, getPrimaryNavigation, secondaryNavigation } from '../app/navigation/items'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import CommandPalette from './CommandPalette'
import LiveSessionCapsule from './LiveSessionCapsule'
import StudyHelper from '../features/helper/StudyHelper'
import ThemeToggle from '../features/theme/ThemeToggle'
import InstallAppButton from '../features/pwa/InstallAppButton'

/** While a full-focus session runs, every other page points back to the focus room. */
function FocusLockBanner() {
  return <Link to={appRoutes.focus} viewTransition className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-[var(--warning)]/40 bg-[var(--warning-soft)] px-4 py-3 text-sm font-bold text-[var(--warning-text)] [animation:rise-in_480ms_var(--ease-spring)_backwards]"><span className="flex items-center gap-2"><Lock size={16} />حالت تمرکز کامل روشن است</span><span className="flex items-center gap-1 text-xs">برگرد به اتاق تمرکز<ArrowLeft size={14} /></span></Link>
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export default function AppShell({ profile, children }: { profile: UserProfile; children: ReactNode }) {
  const location = useLocation()
  const online = useOnlineStatus()
  const timer = useTimerView().current
  const [menuOpen, setMenuOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const destinations = [...getPrimaryNavigation(profile.displayName), ...secondaryNavigation, accountNavigation, ...(profile.role === 'admin' ? [adminNavigation] : [])]
  return <div className="app-workspace" data-page={location.pathname} dir="rtl">
    <a className="skip-link" href="#main-content">رفتن به محتوای صفحه</a>
    <Sidebar profile={profile} />
    <div className="min-w-0 flex-1">
      <header className="workspace-header">
        <button type="button" className="workspace-menu" aria-label="همۀ بخش‌ها" onClick={() => setMenuOpen(true)}>
          {location.pathname === appRoutes.home ? <><img src="/images/figma/club-logo.webp" width={41} height={41} alt="" className="dark:hidden" /><Flower2 className="hidden dark:block" size={24} /></> : <Menu size={20} />}
        </button>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <InstallAppButton />
          <ThemeToggle />
          <button type="button" className="header-chip workspace-search" onClick={() => setPaletteOpen(true)} aria-label="جست‌وجو و فرمان‌ها" aria-keyshortcuts="Control+K Meta+K /">
            <Search size={16} /><span className="hidden sm:inline">جست‌وجو و فرمان‌ها</span><span className="sm:hidden">جست‌وجو</span><kbd dir="ltr" className="hidden sm:inline">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
          </button>
          <Link to={appRoutes.profile} aria-label="حساب و تنظیمات" className="grid size-11 place-items-center rounded-full lg:hidden"><Avatar name={profile.displayName} url={profile.avatarUrl} size="sm" /></Link>
        </div>
        <div className="workspace-tools">
          <LiveSessionCapsule className="header-live" />
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="workspace-content">
        {!online && <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted px-4 py-2 text-sm" role="status">
          <span>آفلاین هستی. مطالعه و برنامه‌ریزی در این دستگاه ذخیره می‌شوند.</span>
          <Link className="font-bold text-primary underline" to={appRoutes.offline}>کتابخانۀ آفلاین</Link>
        </div>}
        {/* Keyed by route so each page enters with its own cascade. */}
        {timer?.focusLockEnabled && timer.timerStatus === 'running' && <FocusLockBanner />}
        <div key={location.pathname} className="page-transition">{children}</div>
      </main>
      <footer className="workspace-footer"><span dir="ltr" className="flex items-center gap-2"><Flower2 size={14} /> sweet study club</span><span className="flex flex-wrap items-center gap-3"><span>با ریتم خودت، رو به جلو.</span><a href="/privacy" className="hover:text-foreground">حریم خصوصی</a><a href="/terms" className="hover:text-foreground">قوانین</a></span></footer>
    </div>
    {/* Today already shows the full timer card. */}
    {location.pathname !== appRoutes.home && <LiveSessionCapsule className="mobile-live-capsule" />}
    <BottomNavigation displayName={profile.displayName} onMore={() => setMenuOpen(true)} expanded={menuOpen} />
    <StudyHelper key={location.pathname} open={guideOpen} onOpenChange={setGuideOpen} />
    <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onOpenHelper={() => setGuideOpen(true)} isAdmin={profile.role === 'admin'} displayName={profile.displayName} />
    <Dialog open={menuOpen} onOpenChange={setMenuOpen}><DialogContent dir="rtl" className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>فضای تو</DialogTitle><DialogDescription>همۀ بخش‌های باشگاه، یک‌جا.</DialogDescription></DialogHeader><InstallAppButton variant="card" className="mb-2" onDone={() => setMenuOpen(false)} /><nav aria-label="همۀ بخش‌ها" className="stagger grid gap-1">{destinations.map(({ path, label, icon: Icon }) => <Link key={path} to={path} viewTransition onClick={() => setMenuOpen(false)} aria-current={location.pathname === path ? 'page' : undefined} className="nav-item"><Icon size={19} /><span className="min-w-0 flex-1 wrap-anywhere">{label}</span><ArrowLeft size={16} /></Link>)}</nav></DialogContent></Dialog>
  </div>
}
