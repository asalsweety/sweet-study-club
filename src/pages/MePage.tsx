import { LogOut, Palette, ShieldCheck } from 'lucide-react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { appRoutes } from '../app/navigation/routes'
import { useEntitlements, useSignOut } from '../app/session'
import type { UserProfile } from '../shared/api/profile'
import Avatar from '../components/Avatar'
import PageHeading from '../components/PageHeading'
import QueryError from '../components/QueryError'
import { Button } from '../components/ui/button'
import BadgesPanel from '../features/me/BadgesPanel'
import DnaPanel from '../features/me/DnaPanel'
import ExportPanel from '../features/me/ExportPanel'
import SettingsPanel from '../features/me/SettingsPanel'
import SubjectsPanel from '../features/me/SubjectsPanel'
import ScoresPanel from '../features/learning/ScoresPanel'
import ThemeToolbar from '../features/theme/components/ThemeToolbar'
import { useTheme } from '../features/theme/useTheme'

const sections = [['settings', 'تنظیمات'], ['subjects', 'درس‌های من'], ['achievements', 'دستاوردها'], ['export', 'گزارش‌ها']] as const
export default function MePage({ profile }: { profile: UserProfile }) {
  const entitlements = useEntitlements()
  const signOut = useSignOut()
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const requested = params.get('section') ?? location.hash.slice(1)
  const section = sections.some(([id]) => id === requested) ? requested : 'settings'
  const theme = useTheme()
  return <div className="grid gap-6">
    <PageHeading eyebrow="فضای شخصی" title="حساب و تنظیمات" description="این فضا را با ریتم، هدف‌ها و سلیقۀ خودت هماهنگ کن." />
    <section className="surface flex flex-wrap items-center gap-4 p-5 sm:p-6"><Avatar name={profile.displayName} url={profile.avatarUrl} size="lg" /><div className="min-w-0 flex-1"><h2 className="text-xl font-bold">{profile.displayName}</h2><p className="mt-1 truncate text-sm text-muted-foreground" dir="ltr">{profile.email}</p></div>{entitlements.data?.plus && <span className="rounded-full bg-secondary px-3 py-1 text-xs text-primary">Sweet Plus</span>}{profile.role === 'admin' && <Button asChild variant="outline"><Link to={appRoutes.admin}><ShieldCheck />مدیریت باشگاه</Link></Button>}</section>
    <nav className="section-tabs" aria-label="بخش‌های حساب">{sections.map(([id, title]) => <Link key={id} to={`?section=${id}`} onClick={(event) => { event.preventDefault(); setParams({ section: id }) }} aria-current={section === id ? 'page' : undefined}>{title}</Link>)}</nav>
    {section === 'settings' && <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]"><SettingsPanel profile={profile} /><div className="grid gap-5"><section className="surface p-5"><h2 className="mb-3 flex items-center gap-2 font-bold"><Palette size={18} />ظاهر فضای تو</h2><p className="mb-5 text-sm leading-7 text-muted-foreground">رنگ دلخواه و حالت روشن یا تیره را انتخاب کن.</p><ThemeToolbar preset={theme.preset} mode={theme.mode} onPresetChange={theme.setPreset} onModeChange={theme.setMode} /></section><section className="surface p-5"><h2 className="font-bold">حساب کاربری</h2><p className="my-3 text-sm leading-7 text-muted-foreground">اطلاعات مطالعه به حسابت متصل است و با ورود دوباره در دسترس خواهد بود.</p><Button variant="outline" disabled={signOut.isPending} onClick={() => signOut.mutate()} className="text-destructive"><LogOut />{signOut.isPending ? 'در حال خروج…' : 'خروج از حساب'}</Button>{signOut.isError && <div className="mt-3"><QueryError error={signOut.error} /></div>}</section></div></div>}
    {section === 'subjects' && <SubjectsPanel />}
    {section === 'achievements' && <div className="grid items-start gap-5 lg:grid-cols-2"><BadgesPanel /><DnaPanel /></div>}
    {section === 'export' && <div className="grid items-start gap-5 lg:grid-cols-2"><ExportPanel profile={profile} /><ScoresPanel onAnalyze={(id) => navigate(`${appRoutes.learning}?tab=assistant&score=${encodeURIComponent(id)}`)} /></div>}
  </div>
}
