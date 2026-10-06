import { LogOut, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { appRoutes } from '../app/navigation/routes'
import { useEntitlements, useSettings, useSignOut } from '../app/session'
import type { UserProfile } from '../shared/api/profile'
import Avatar from '../components/Avatar'
import { Button } from '../components/ui/button'
import BadgesPanel from '../features/me/BadgesPanel'
import DnaPanel from '../features/me/DnaPanel'
import ExportPanel from '../features/me/ExportPanel'
import SettingsPanel from '../features/me/SettingsPanel'
import SubjectsPanel from '../features/me/SubjectsPanel'

export default function MePage({ profile }: { profile: UserProfile }) {
  const settings = useSettings()
  const entitlements = useEntitlements()
  const signOut = useSignOut()

  return (
    <div className="flex flex-col gap-5">
      <section className="glass rise relative flex flex-wrap items-center gap-5 overflow-hidden rounded-[2rem] p-6">
        <div aria-hidden className="absolute -top-16 -left-10 size-48 rounded-full bg-primary/20 blur-3xl" />
        <Avatar name={profile.displayName} url={profile.avatarUrl} size="xl" />
        <div className="relative min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black">{profile.displayName}</h1>
            {entitlements.data?.plus && <span className="rounded-full bg-[image:var(--primary-gradient)] px-2.5 py-0.5 text-xs font-black text-primary-foreground">Sweet Plus ✨</span>}
            {profile.role === 'admin' && <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold">مدیر</span>}
          </div>
          <p className="truncate text-sm text-muted-foreground" dir="ltr">{profile.email}</p>
          {settings.data?.bio && <p className="mt-1 text-sm">{settings.data.bio}</p>}
        </div>
        <div className="relative flex gap-2">
          {profile.role === 'admin' && (
            <Button asChild variant="secondary" className="rounded-2xl font-bold">
              <Link to={appRoutes.admin}><ShieldCheck /> استودیو</Link>
            </Button>
          )}
          <Button variant="ghost" onClick={() => signOut.mutate()} className="rounded-2xl font-bold text-destructive hover:bg-destructive/10">
            <LogOut /> خروج
          </Button>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <SettingsPanel profile={profile} />
          <SubjectsPanel />
          <ExportPanel profile={profile} />
        </div>
        <div className="flex flex-col gap-5">
          <BadgesPanel />
          <DnaPanel />
        </div>
      </div>
    </div>
  )
}
