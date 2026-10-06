import { NavLink } from 'react-router-dom'
import { primaryNavigation } from '../app/navigation/items'
import { appRoutes } from '../app/navigation/routes'
import { cn } from '../shared/lib/utils'

export default function BottomNavigation() {
  return (
    <nav
      aria-label="صفحات اصلی"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center gap-1 rounded-[1.75rem] border border-white/40 bg-card/75 p-1.5 shadow-2xl shadow-primary/15 backdrop-blur-2xl lg:hidden dark:border-white/10"
    >
      {primaryNavigation.map(({ path, label, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          end={path === appRoutes.home}
          className={({ isActive }) =>
            cn(
              'group relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-bold transition-all duration-300',
              isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                aria-hidden
                className={cn(
                  'absolute inset-0 rounded-2xl bg-[image:var(--primary-gradient)] shadow-lg shadow-primary/30 transition-all duration-300',
                  isActive ? 'scale-100 opacity-100' : 'scale-75 opacity-0',
                )}
              />
              <Icon className="relative transition-transform duration-300 group-active:scale-90" size={20} strokeWidth={isActive ? 2.6 : 2} />
              <span className="relative">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
