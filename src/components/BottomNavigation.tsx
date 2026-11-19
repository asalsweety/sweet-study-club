import { Menu } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { getPrimaryNavigation } from '../app/navigation/items'
import { haptic } from '../shared/lib/confetti'
import { cn } from '../shared/lib/utils'

export default function BottomNavigation({ onMore, expanded, displayName }: { onMore: () => void; expanded: boolean; displayName: string }) {
  const { pathname } = useLocation()
  const primaryNavigation = getPrimaryNavigation(displayName)
  const moreActive = !primaryNavigation.some((item) => item.path === pathname)
  return <nav aria-label="صفحات اصلی" className="mobile-navigation">
    {primaryNavigation.map(({ path, label, icon: Icon }) => <NavLink key={path} to={path} end viewTransition title={label} onPointerDown={() => haptic(6)} className={({ isActive }) => cn('mobile-nav-item', isActive && 'is-active')}>
      {({ isActive }) => <>
        {isActive && <span aria-hidden className="mobile-nav-pill" />}
        <Icon size={21} strokeWidth={isActive ? 2.2 : 1.8} />
        <span className="line-clamp-2 max-w-full wrap-anywhere text-center leading-tight">{label}</span>
      </>}
    </NavLink>)}
    <button type="button" onClick={onMore} onPointerDown={() => haptic(6)} aria-expanded={expanded} aria-haspopup="dialog" className={cn('mobile-nav-item', moreActive && 'is-active')}>
      {moreActive && <span aria-hidden className="mobile-nav-pill" />}
      <Menu size={21} />
      <span>بیشتر</span>
    </button>
  </nav>
}
