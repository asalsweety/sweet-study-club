import { ArrowLeft, Flower2, Menu, Search } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { appRoutes } from '../app/navigation/routes'
import type { UserProfile } from '../shared/api/profile'
import BottomNavigation from './BottomNavigation'
import Sidebar from './Sidebar'
import { accountNavigation, adminNavigation, primaryNavigation, secondaryNavigation } from '../app/navigation/items'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import Avatar from './Avatar'
import CommandPalette from './CommandPalette'
import LiveSessionCapsule from './LiveSessionCapsule'
import StudyHelper from '../features/helper/StudyHelper'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export default function AppShell({ profile, children }: { profile: UserProfile; children: ReactNode }) {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const destinations = [...primaryNavigation, ...secondaryNavigation, accountNavigation, ...(profile.role === 'admin' ? [adminNavigation] : [])]
  const current = destinations.find((item) => item.path === location.pathname)?.label ?? 'باشگاه مطالعه'
  return <div className="app-workspace" dir="rtl">
    <a className="skip-link" href="#main-content">رفتن به محتوای صفحه</a>
    <Sidebar profile={profile} />
    <div className="min-w-0 flex-1">
      <header className="workspace-header">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" className="grid size-11 place-items-center rounded-xl transition-transform active:scale-95 lg:hidden" aria-label="همهٔ بخش‌ها" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
          <span className="hidden text-xs text-muted-foreground sm:inline">باشگاه مطالعه</span><span aria-hidden className="hidden text-border sm:inline">/</span>
          <span key={current} className="truncate text-sm font-bold [animation:rise-in_420ms_var(--ease-spring)_backwards]">{current}</span>
        </div>
        <div className="flex items-center gap-2">
          <LiveSessionCapsule className="header-live" />
          <button type="button" className="header-chip" onClick={() => setPaletteOpen(true)} aria-label="جست‌وجو و فرمان‌ها" aria-keyshortcuts="Control+K Meta+K /">
            <Search size={16} />
            <span className="hidden md:inline">جست‌وجو و فرمان‌ها</span>
            <span className="hidden items-center gap-1 md:flex" dir="ltr"><span className="kbd">{isMac ? '⌘' : 'Ctrl'}</span><span className="kbd">K</span></span>
          </button>
          <Link to={appRoutes.profile} viewTransition className="flex min-h-11 items-center gap-2 rounded-xl px-2 transition-colors hover:bg-muted" aria-label="حساب و تنظیمات"><span className="hidden text-xs text-muted-foreground sm:inline">{profile.displayName}</span><Avatar name={profile.displayName} url={profile.avatarUrl} size="sm" /></Link>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="workspace-content">
        {/* Keyed by route so each page enters with its own cascade. */}
        <div key={location.pathname} className="page-transition">{children}</div>
      </main>
      <footer className="workspace-footer"><span dir="ltr" className="flex items-center gap-2"><Flower2 size={14} /> sweet study club</span><span>با ریتم خودت، رو به جلو.</span></footer>
    </div>
    {/* Today already shows the full timer card. */}
    {location.pathname !== appRoutes.home && <LiveSessionCapsule className="mobile-live-capsule" />}
    <BottomNavigation onMore={() => setMenuOpen(true)} expanded={menuOpen} />
    <StudyHelper key={location.pathname} />
    <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} isAdmin={profile.role === 'admin'} />
    <Dialog open={menuOpen} onOpenChange={setMenuOpen}><DialogContent dir="rtl" className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>فضای تو</DialogTitle><DialogDescription>همهٔ بخش‌های باشگاه، یک‌جا.</DialogDescription></DialogHeader><nav aria-label="همهٔ بخش‌ها" className="stagger grid gap-1">{destinations.map(({ path, label, icon: Icon }) => <Link key={path} to={path} viewTransition onClick={() => setMenuOpen(false)} aria-current={location.pathname === path ? 'page' : undefined} className="nav-item"><Icon size={19} /><span className="flex-1">{label}</span><ArrowLeft size={16} /></Link>)}</nav></DialogContent></Dialog>
  </div>
}
