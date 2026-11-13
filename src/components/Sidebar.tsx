import { ArrowUpLeft, Flower2 } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import type { UserProfile } from '../shared/api/profile'
import { cn } from '../shared/lib/utils'
import { accountNavigation, adminNavigation, primaryNavigation, secondaryNavigation } from '../app/navigation/items'
import { appRoutes } from '../app/navigation/routes'
import Avatar from './Avatar'

type Item = { path: string; label: string; icon: typeof Flower2 }
export function SidebarLink({ path, label, icon: Icon }: Item) {
  return <NavLink to={path} viewTransition title={label} end={path === appRoutes.home} className={({ isActive }) => cn('nav-item', isActive && 'is-active')}>
    {({ isActive }) => <>
      {isActive && <span aria-hidden className="nav-pill" />}
      <Icon size={19} strokeWidth={isActive ? 2.1 : 1.8} />
      <span>{label}</span>
    </>}
  </NavLink>
}
export default function Sidebar({ profile }: { profile: UserProfile }) {
  return <aside className="desktop-sidebar">
    <Link to={appRoutes.home} viewTransition className="brand-lockup px-2"><span className="brand-mark"><Flower2 size={24} /></span><span dir="ltr">sweet study<span className="block text-[10px] font-medium tracking-[0.23em] text-muted-foreground">YOUR EVERYDAY CLUB</span></span></Link>
    <nav aria-label="صفحات اصلی" className="stagger mt-12 grid gap-1.5"><p className="nav-caption">فضای مطالعه</p>{primaryNavigation.map((item) => <SidebarLink key={item.path} {...item} />)}</nav>
    <nav aria-label="باشگاه" className="stagger mt-8 grid gap-1.5"><p className="nav-caption">کنار هم، بهتر</p>{secondaryNavigation.map((item) => <SidebarLink key={item.path} {...item} />)}{profile.role === 'admin' && <SidebarLink {...adminNavigation} />}</nav>
    <div className="mt-auto pt-8"><div className="hero-card mb-5 p-4"><span className="mb-3 grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--glow-primary)]"><Flower2 size={18} /></span><p className="text-sm font-bold leading-7">قدم‌های کوچک هم حساب‌اند.</p><p className="mt-1 text-xs leading-6 text-muted-foreground">امروز را با یک کار کوچک شروع کن.</p></div>
    <Link to={accountNavigation.path} viewTransition title={accountNavigation.label} className="flex items-center gap-3 rounded-xl border-t border-border px-2 py-4 transition-colors hover:bg-muted"><Avatar name={profile.displayName} url={profile.avatarUrl} size="md" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{profile.displayName}</p><p className="mt-1 text-xs text-muted-foreground">حساب و تنظیمات</p></div><ArrowUpLeft size={16} className="text-muted-foreground" /></Link></div>
  </aside>
}
