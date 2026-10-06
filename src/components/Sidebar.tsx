import { Flower2, LogOut } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import type { UserProfile } from '../shared/api/profile'
import { cn } from '../shared/lib/utils'
import { adminNavigation, primaryNavigation, secondaryNavigation } from '../app/navigation/items'
import { appRoutes } from '../app/navigation/routes'
import Avatar from './Avatar'

type SidebarProps = {
  profile: UserProfile
  onSignOut: () => void
}

type Item = { path: string; label: string; icon: typeof Flower2 }

function SidebarLink({ path, label, icon: Icon }: Item) {
  return (
    <NavLink
      to={path}
      end={path === appRoutes.home}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-bold transition-all duration-200',
          isActive
            ? 'bg-[image:var(--primary-gradient)] text-primary-foreground shadow-lg shadow-primary/25'
            : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
        )
      }
    >
      <Icon size={19} className="transition-transform duration-200 group-hover:scale-110" />
      {label}
    </NavLink>
  )
}

export default function Sidebar({ profile, onSignOut }: SidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col gap-6 border-l border-border/60 bg-card/55 p-5 backdrop-blur-2xl lg:flex">
      <div className="flex items-center gap-3 px-1">
        <span className="grid size-11 place-items-center rounded-2xl bg-[image:var(--primary-gradient)] text-primary-foreground shadow-lg shadow-primary/30">
          <Flower2 size={22} />
        </span>
        <div>
          <p className="text-base font-black tracking-tight">Sweet Study Club</p>
          <p className="text-xs text-muted-foreground">با هم، آرام و پیوسته</p>
        </div>
      </div>

      <nav aria-label="صفحات اصلی" className="flex flex-col gap-1">
        {primaryNavigation.map((item) => (
          <SidebarLink key={item.path} {...item} />
        ))}
      </nav>

      <div className="flex flex-col gap-1">
        <p className="px-3.5 text-[11px] font-bold tracking-wide text-muted-foreground/80">بیشتر</p>
        {secondaryNavigation.map((item) => (
          <SidebarLink key={item.path} {...item} />
        ))}
        {profile.role === 'admin' && <SidebarLink {...adminNavigation} />}
      </div>

      <div className="mt-auto flex items-center gap-3 rounded-3xl border border-border/60 bg-background/60 p-3">
        <Avatar name={profile.displayName} url={profile.avatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{profile.displayName}</p>
          <p className="truncate text-xs text-muted-foreground" dir="ltr">{profile.email}</p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          aria-label="خروج از حساب"
          className="grid size-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut size={17} />
        </button>
      </div>
    </aside>
  )
}
