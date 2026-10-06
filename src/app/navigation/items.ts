import { BarChart3, CalendarDays, House, ShieldCheck, ShoppingBag, Trophy, UserRound, UsersRound } from 'lucide-react'
import { appRoutes } from './routes'

export const primaryNavigation = [
  { path: appRoutes.home, label: 'خانه', icon: House },
  { path: appRoutes.planner, label: 'پلنر', icon: CalendarDays },
  { path: appRoutes.progress, label: 'پیشرفت', icon: BarChart3 },
  { path: appRoutes.friends, label: 'دوستان', icon: UsersRound },
  { path: appRoutes.profile, label: 'من', icon: UserRound },
] as const

export const secondaryNavigation = [
  { path: appRoutes.ranking, label: 'رتبه‌بندی', icon: Trophy },
  { path: appRoutes.shop, label: 'فروشگاه', icon: ShoppingBag },
] as const

export const adminNavigation = { path: appRoutes.admin, label: 'استودیو', icon: ShieldCheck } as const
