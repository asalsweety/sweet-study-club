import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../../app/api'
import { queryKeys, useSettings } from '../../app/session'
import { errorMessage } from '../../shared/api/http'
import type { UserProfile } from '../../shared/api/profile'
import type { UpdateSettingsInput } from '../../shared/api/settings'
import { cn } from '../../shared/lib/utils'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-muted/40 p-3.5">
      <div className="min-w-0">
        <p className="text-sm font-bold">{title}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

export default function SettingsPanel({ profile }: { profile: UserProfile }) {
  const client = useQueryClient()
  const settings = useSettings()
  const [name, setName] = useState(profile.displayName)
  const [bio, setBio] = useState('')
  useEffect(() => setBio(settings.data?.bio ?? ''), [settings.data?.bio])

  const update = useMutation({
    mutationFn: (input: UpdateSettingsInput) => api.settings.update(input),
    onSuccess: (next) => {
      client.setQueryData(queryKeys.settings, next)
      void client.invalidateQueries({ queryKey: ['leaderboard'] })
    },
  })
  const rename = useMutation({
    mutationFn: () => api.profile.update({ displayName: name.trim() }),
    onSuccess: (next) => client.setQueryData(queryKeys.profile, next),
  })
  const s = settings.data
  if (!s) return <div className="skeleton h-96 rounded-[2rem]" />

  const askNotifications = async (enabled: boolean) => {
    if (enabled && 'Notification' in window && Notification.permission === 'default') await Notification.requestPermission()
    update.mutate({ notificationsEnabled: enabled })
  }

  return (
    <section className="glass rise flex flex-col gap-3 rounded-[2rem] p-5 sm:p-6">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-black"><Settings2 size={19} className="text-primary" /> تنظیمات شخصی</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="me-name">اسم نمایشی</Label>
          <Input id="me-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name.trim() !== profile.displayName && rename.mutate()} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="me-bio">یک جمله درباره‌ی خودت</Label>
          <Input id="me-bio" value={bio} maxLength={280} onChange={(e) => setBio(e.target.value)} onBlur={() => bio !== (s.bio ?? '') && update.mutate({ bio: bio.trim() || null })} placeholder="مثلاً داوطلب پزشکی ۱۴۰۶ 🩺" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="me-goal">هدف روزانه (دقیقه)</Label>
          <Input id="me-goal" type="number" min={0} max={1440} defaultValue={s.dailyGoalMinutes} onBlur={(e) => update.mutate({ dailyGoalMinutes: Math.min(1440, Math.max(0, Number(e.target.value))) })} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="me-konkur">تاریخ کنکور (میلادی)</Label>
          <Input id="me-konkur" type="date" dir="ltr" defaultValue={s.konkurDate ?? ''} onChange={(e) => update.mutate({ konkurDate: e.target.value || null })} />
        </div>
      </div>

      <Row title="نمایش در جدول رتبه‌بندی" hint="اگر خاموش باشد، زمانت در لیگ دیده نمی‌شود.">
        <Switch checked={s.showOnLeaderboard} onCheckedChange={(value) => update.mutate({ showOnLeaderboard: value })} />
      </Row>
      <Row title="چه کسانی مطالعه‌ی زنده‌ام را ببینند؟">
        <div className="flex rounded-xl bg-card p-1 text-xs font-bold">
          {([['everyone', 'همه'], ['friends', 'دوستان'], ['nobody', 'هیچ‌کس']] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => update.mutate({ liveVisibility: value })} className={cn('rounded-lg px-2.5 py-1.5', s.liveVisibility === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
              {label}
            </button>
          ))}
        </div>
      </Row>
      <Row title="نمایش تایمر" hint="تایمر ساده یا اتاق چیبی با والپیپر">
        <div className="flex rounded-xl bg-card p-1 text-xs font-bold">
          {([['digital', 'ساده'], ['chibi', 'چیبی']] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => update.mutate({ timerDisplay: value })} className={cn('rounded-lg px-3 py-1.5', s.timerDisplay === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
              {label}
            </button>
          ))}
        </div>
      </Row>
      <Row title="یادآورها و اعلان‌ها" hint="پایان پومودورو و یادآورهای پلنر">
        <Switch checked={s.notificationsEnabled} onCheckedChange={(value) => void askNotifications(value)} />
      </Row>

      {(update.isError || rename.isError) && <p className="text-sm text-destructive">{errorMessage(update.error ?? rename.error)}</p>}
    </section>
  )
}
