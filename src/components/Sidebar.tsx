import { Flower2 } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import type { UserProfile } from '../shared/api/profile'
import { cn } from '../shared/lib/utils'
import { accountNavigation, adminNavigation, primaryNavigation, secondaryNavigation } from '../app/navigation/items'
import { appRoutes } from '../app/navigation/routes'
import Avatar from './Avatar'
import { useQuery } from '@tanstack/react-query'
import { api } from '../app/api'
import { queryKeys } from '../app/session'
import { fa } from '../shared/lib/format'

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
  const level = useQuery({ queryKey: queryKeys.gamification, queryFn: api.progress.gamification }).data?.level.level
  return <aside className="desktop-sidebar">
    <Link to={appRoutes.home} viewTransition className="brand-lockup px-2"><span className="brand-mark"><img src="/images/figma/club-logo.webp" alt="" width={41} height={41} /><Flower2 className="sidebar-flower" size={24} aria-hidden /></span><span dir="ltr">sweet study<span className="block text-[10px] font-medium tracking-[0.23em] text-muted-foreground">A LITTLE EVERY DAY</span></span></Link>
    <nav aria-label="صفحات اصلی" className="stagger mt-12 grid gap-1.5"><p className="nav-caption">فضای مطالعه</p>{primaryNavigation.map((item) => <SidebarLink key={item.path} {...item} />)}</nav>
    <nav aria-label="باشگاه" className="stagger mt-8 grid gap-1.5"><p className="nav-caption">کنار هم، بهتر</p>{secondaryNavigation.map((item) => <SidebarLink key={item.path} {...item} />)}{profile.role === 'admin' && <SidebarLink {...adminNavigation} />}</nav>
    <Link to={accountNavigation.path} viewTransition title={accountNavigation.label} className="sidebar-account mt-auto flex items-center gap-3 rounded-xl px-3"><Avatar name={profile.displayName} url={profile.avatarUrl} size="sm" /><div className="min-w-0"><p className="truncate text-sm font-bold">{profile.displayName}{level !== undefined && ` · سطح ${fa(level)}`}</p><p className="mt-1 text-xs text-muted-foreground">حساب و تنظیمات</p></div></Link>
  </aside>
}
