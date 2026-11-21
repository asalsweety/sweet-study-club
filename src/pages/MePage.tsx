import { useQuery } from '@tanstack/react-query'
import { api } from '../app/api'
import { fa } from '../shared/lib/format'
import { LogOut } from 'lucide-react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { appRoutes } from '../app/navigation/routes'
import { queryKeys, useSignOut } from '../app/session'
import type { UserProfile } from '../shared/api/profile'
import PageHeading from '../components/PageHeading'
import QueryError from '../components/QueryError'
import { Button } from '../components/ui/button'
import BadgesPanel from '../features/me/BadgesPanel'
import DnaPanel from '../features/me/DnaPanel'
import ExportPanel from '../features/me/ExportPanel'
import SettingsPanel from '../features/me/SettingsPanel'
import SubjectsPanel from '../features/me/SubjectsPanel'
import ProfileCard from '../features/me/ProfileCard'
import ChangePasswordForm from '../features/me/ChangePasswordForm'
import ScoresPanel from '../features/learning/ScoresPanel'

const sections = [['overview', 'پروفایل'], ['settings', 'تنظیمات'], ['subjects', 'درس‌های من'], ['achievements', 'دستاوردها'], ['export', 'گزارش‌ها']] as const
export default function MePage({ profile }: { profile: UserProfile }) {
  const signOut = useSignOut()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const requested = params.get('section') ?? location.hash.slice(1)
  const section = sections.some(([id]) => id === requested) ? requested : 'overview'
  const level = useQuery({ queryKey: queryKeys.gamification, queryFn: api.progress.gamification, enabled: section === 'overview' }).data?.level
  const sectionNav = (
    <nav className="section-tabs" aria-label="بخش‌های حساب">
      {sections.map(([id, title]) => <Link key={id} to={`?section=${id}`} aria-current={section === id ? 'page' : undefined}>{title}</Link>)}
    </nav>
  )
  return <div className={section === 'overview' ? 'profile-overview grid gap-5' : 'grid gap-6'}>
    {section === 'overview' ? <>
      <PageHeading action={sectionNav} eyebrow="پروفایل و تنظیمات" title={profile.displayName + (level ? ` · سطح ${fa(level.level)}` : '')} description={level ? `${fa(Math.max(0, level.nextLevelAt - level.experience))} XP تا سطح بعد · هر دقیقه ۱ XP، هر تست درست ۲ XP` : 'مسیر مطالعه و تنظیمات تو'} />
      <ProfileCard profile={profile} />
      <div className="grid items-start gap-5 md:grid-cols-2"><ExportPanel compact profile={profile} /><DnaPanel compact /></div>
      <SettingsPanel profile={profile} compact />
    </> : <>
    <PageHeading action={sectionNav} eyebrow="فضای شخصی" title="حساب و تنظیمات" description="این فضا را با ریتم، هدف‌ها و سلیقۀ خودت هماهنگ کن." />
    <ProfileCard profile={profile} />
    </>}
    {section === 'settings' && <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <SettingsPanel profile={profile} />
      <section className="surface p-5">
        <h2 className="font-bold">حساب کاربری</h2>
        <p className="my-3 text-sm leading-7 text-muted-foreground">اطلاعات مطالعه به حسابت متصل است و با ورود دوباره در دسترس خواهد بود.</p>
        <Button variant="outline" disabled={signOut.isPending} onClick={() => signOut.mutate()} className="text-destructive"><LogOut />{signOut.isPending ? 'در حال خروج…' : 'خروج از حساب'}</Button>
        {signOut.isError && <div className="mt-3"><QueryError error={signOut.error} /></div>}
        <ChangePasswordForm />
      </section>
    </div>}
    {section === 'subjects' && <SubjectsPanel />}
    {section === 'achievements' && <div className="grid items-start gap-5 lg:grid-cols-2"><BadgesPanel /><DnaPanel /></div>}
    {section === 'export' && <div className="grid items-start gap-5 lg:grid-cols-2"><ExportPanel profile={profile} /><ScoresPanel onAnalyze={(id) => navigate(`${appRoutes.learning}?tab=assistant&score=${encodeURIComponent(id)}`)} /></div>}
  </div>
}
