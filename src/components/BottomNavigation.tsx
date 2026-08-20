import {
  BarChart3,
  House,
  Trophy,
  UserRound,
} from 'lucide-react'

export type AppTab = 'home' | 'progress' | 'ranking' | 'me'

type BottomNavigationProps = {
  activeTab: AppTab
  onChange: (tab: AppTab) => void
}

const navigationItems: Array<{
  id: AppTab
  label: string
  icon: typeof House
}> = [
  {
    id: 'home',
    label: 'Home',
    icon: House,
  },
  {
    id: 'progress',
    label: 'Progress',
    icon: BarChart3,
  },
  {
    id: 'ranking',
    label: 'Ranking',
    icon: Trophy,
  },
  {
    id: 'me',
    label: 'Me',
    icon: UserRound,
  },
]

export default function BottomNavigation({
  activeTab,
  onChange,
}: BottomNavigationProps) {
  return (
    <nav className="bottom-navigation" aria-label="صفحات اصلی">
      {navigationItems.map((item) => {
        const Icon = item.icon
        const isActive = activeTab === item.id

        return (
          <button
            type="button"
            key={item.id}
            className={isActive ? 'active' : ''}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onChange(item.id)}
          >
            <span className="navigation-icon">
              <Icon size={22} strokeWidth={isActive ? 2.6 : 2} />
            </span>

            <small>{item.label}</small>
          </button>
        )
      })}
    </nav>
  )
}
