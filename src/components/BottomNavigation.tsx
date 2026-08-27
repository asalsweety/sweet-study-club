import { BarChart3, House, Trophy, UserRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { appRoutes } from '../app/navigation/routes'
import { cn } from '../shared/lib/utils'

const navigationItems = [
  { path: appRoutes.home, label: 'خانه', icon: House },
  { path: appRoutes.progress, label: 'پیشرفت', icon: BarChart3 },
  { path: appRoutes.ranking, label: 'رتبه‌بندی', icon: Trophy },
  { path: appRoutes.profile, label: 'حساب من', icon: UserRound },
] as const

export default function BottomNavigation() {
  return (
    <nav
      className="soft-enter fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-md items-center gap-1 rounded-2xl border border-sidebar-border bg-sidebar/95 p-1.5 text-sidebar-foreground shadow-xl shadow-foreground/10 backdrop-blur-xl md:inset-x-auto md:right-6 md:bottom-6"
      aria-label="صفحات اصلی"
    >
      {navigationItems.map((item) => {
        const Icon = item.icon

        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === appRoutes.home}
            className={({ isActive }) =>
              cn(
                'flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold transition-colors md:min-w-24',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={19} strokeWidth={isActive ? 2.6 : 2} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
