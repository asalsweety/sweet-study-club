import { BarChart3, BookOpen, CalendarDays, House, ShieldCheck, ShoppingBag, Trophy, UserRound, UsersRound } from 'lucide-react'
import { appRoutes } from './routes'

export const primaryNavigation = [
  { path: appRoutes.home, label: 'امروز', icon: House },
  { path: appRoutes.planner, label: 'برنامۀ من', icon: CalendarDays },
  { path: appRoutes.learning, label: 'یادگیری', icon: BookOpen },
  { path: appRoutes.progress, label: 'پیشرفت', icon: BarChart3 },
] as const
export const secondaryNavigation = [
  { path: appRoutes.friends, label: 'همراهان مطالعه', icon: UsersRound },
  { path: appRoutes.ranking, label: 'لیگ مطالعه', icon: Trophy },
  { path: appRoutes.shop, label: 'فروشگاه', icon: ShoppingBag },
] as const
export const accountNavigation = { path: appRoutes.profile, label: 'حساب و تنظیمات', icon: UserRound } as const
export const adminNavigation = { path: appRoutes.admin, label: 'مدیریت باشگاه', icon: ShieldCheck } as const
