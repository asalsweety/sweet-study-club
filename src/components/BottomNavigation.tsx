import {
  BarChart3,
  House,
  Trophy,
  UserRound,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { appRoutes } from '../app/navigation/routes'

const navigationItems: Array<{
  path: (typeof appRoutes)[keyof typeof appRoutes]
  label: string
  icon: typeof House
}> = [
  {
    path: appRoutes.home,
    label: 'Home',
    icon: House,
  },
  {
    path: appRoutes.progress,
    label: 'Progress',
    icon: BarChart3,
  },
  {
    path: appRoutes.ranking,
    label: 'Ranking',
    icon: Trophy,
  },
  {
    path: appRoutes.profile,
    label: 'Me',
    icon: UserRound,
  },
]

export default function BottomNavigation() {
  return (
    <nav className="bottom-navigation" aria-label="صفحات اصلی">
      {navigationItems.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === appRoutes.home}
            className={({ isActive }) =>
              isActive ? 'active' : undefined
            }
          >
            {({ isActive }) => (
              <>
                <span className="navigation-icon">
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.6 : 2}
                  />
                </span>

                <small>{item.label}</small>
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
