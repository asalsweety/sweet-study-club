import { Flower2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { appRoutes } from '../app/navigation/routes'
import type { UserProfile } from '../shared/api/profile'
import ThemeToolbar from '../features/theme/components/ThemeToolbar'
import { useTheme } from '../features/theme/useTheme'
import BottomNavigation from './BottomNavigation'
import Sidebar from './Sidebar'

type AppShellProps = {
  profile: UserProfile
  onSignOut: () => void
  children: ReactNode
}

export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-32 -right-24 size-[28rem] rounded-full bg-primary/20 blur-3xl motion-safe:animate-[float_18s_ease-in-out_infinite]" />
      <div className="absolute top-1/3 -left-32 size-[26rem] rounded-full bg-[var(--chart-4)]/15 blur-3xl motion-safe:animate-[float_22s_ease-in-out_infinite_reverse]" />
      <div className="absolute -bottom-40 right-1/4 size-[24rem] rounded-full bg-[var(--chart-2)]/15 blur-3xl motion-safe:animate-[float_26s_ease-in-out_infinite]" />
    </div>
  )
}

export default function AppShell({ profile, onSignOut, children }: AppShellProps) {
  const theme = useTheme()

  return (
    <div className="flex min-h-dvh bg-background text-foreground" dir="rtl">
      <AmbientBackground />
      <Sidebar profile={profile} onSignOut={onSignOut} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/40 bg-background/70 px-4 py-3 backdrop-blur-xl lg:justify-end lg:border-none lg:bg-transparent lg:px-8 lg:pt-6 lg:backdrop-blur-none">
          <Link to={appRoutes.home} className="flex items-center gap-2.5 lg:hidden">
            <span className="grid size-9 place-items-center rounded-xl bg-[image:var(--primary-gradient)] text-primary-foreground shadow-md shadow-primary/30">
              <Flower2 size={18} />
            </span>
            <span className="text-base font-black tracking-tight">Sweet Study</span>
          </Link>
          <ThemeToolbar
            preset={theme.preset}
            mode={theme.mode}
            onPresetChange={theme.setPreset}
            onModeChange={theme.setMode}
          />
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-32 sm:px-6 lg:px-8 lg:pb-12">{children}</main>
      </div>

      <BottomNavigation />
    </div>
  )
}
