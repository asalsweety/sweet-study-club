import QueryError from '../../components/QueryError'
import { Button } from '../../components/ui/button'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../app/api'
import { useOnlineStatus } from '../../app/pwa/online-status'
import { queryKeys, useSettings } from '../../app/session'
import { errorMessage } from '../../shared/api/http'
import type { UserProfile } from '../../shared/api/profile'
import type { UpdateSettingsInput } from '../../shared/api/settings'
import { examForProfile, profileLabel } from '../../shared/lib/education'
import { daysUntil, fa, jalaliFullDate } from '../../shared/lib/format'
import { cn } from '../../shared/lib/utils'
import { setThemePreference, type ThemePreference } from '../theme/model'
import { DateInput } from '../../components/ui/date-input'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-muted/40 p-3.5">
      <div className="min-w-0">
        <p className="text-sm font-bold">{title}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

export default function SettingsPanel({ profile, compact = false }: { profile: UserProfile; compact?: boolean }) {
  const online = useOnlineStatus()
  const client = useQueryClient()
  const settings = useSettings()
  const [name, setName] = useState(profile.displayName)
  const [bio, setBio] = useState('')
  useEffect(() => setBio(settings.data?.bio ?? ''), [settings.data?.bio])
  const [konkurPreview, setKonkurPreview] = useState('')
  useEffect(() => setKonkurPreview(settings.data?.konkurDate ?? ''), [settings.data?.konkurDate])

  const update = useMutation({
    mutationFn: (input: UpdateSettingsInput) => api.settings.update(input),
    onSuccess: (next) => {
      client.setQueryData(queryKeys.settings, next)
      void client.invalidateQueries({ queryKey: ['leaderboard'] })
    },
  })
  const rename = useMutation({
    mutationFn: async (input: { dailyGoalMinutes: number; konkurDate?: string | null }) => {
      const nextProfile = await api.profile.update({ displayName: name.trim() })
      client.setQueryData(queryKeys.profile, nextProfile)
      return api.settings.update({ ...input, bio: bio.trim() || null })
    },
    onSuccess: (next) => client.setQueryData(queryKeys.settings, next),
  })
  const theme = useMutation({
    mutationFn: (next: ThemePreference) => api.profile.update({ theme: next }),
    onMutate: (next) => setThemePreference(next),
    onSuccess: (next) => client.setQueryData(queryKeys.profile, next),
    onError: () => setThemePreference(profile.theme),
  })
  const s = settings.data
  if (settings.isError && !s) return <QueryError error={settings.error} retry={() => void settings.refetch()} />
  if (!s) return <div className="skeleton h-96 rounded-2xl" />

  const askNotifications = async (enabled: boolean) => {
    if (enabled && 'Notification' in window && Notification.permission === 'default') await Notification.requestPermission()
    update.mutate({ notificationsEnabled: enabled })
  }

  return (
    <fieldset disabled={!online} aria-label="تنظیمات شخصی" className="glass rise flex min-w-0 flex-col gap-3 rounded-2xl p-5 sm:p-6">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold"><Settings2 size={19} className="text-primary" /> تنظیمات شخصی</h2>

      {!compact && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/15 bg-secondary/50 p-4">
        <div>
          <p className="text-xs text-muted-foreground">مسیر تحصیلی</p>
          <p className="mt-1 text-sm font-bold">{profileLabel(s.educationGroup, s.educationStage) ?? 'هنوز انتخاب نشده'}</p>
        </div>
        {online && <Button asChild variant="outline" size="sm" className="rounded-xl"><Link to="/welcome">تغییر مسیر</Link></Button>}
      </div>}

      <form onSubmit={(event) => {
        event.preventDefault()
        const values = new FormData(event.currentTarget)
        rename.mutate({ dailyGoalMinutes: Number(values.get('dailyGoalMinutes')), ...(!compact && { konkurDate: String(values.get('konkurDate') || '') || null }) })
      }} className="grid gap-4 border-b border-border pb-5">
      <fieldset disabled={rename.isPending} className={cn("grid min-w-0 gap-4 sm:grid-cols-2", compact && "lg:grid-cols-3")}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="me-name">اسم نمایشی</Label>
          <Input id="me-name" value={name} required minLength={2} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="me-bio">یک جمله درباره‌ی خودت</Label>
          <Input id="me-bio" value={bio} maxLength={280} onChange={(e) => setBio(e.target.value)} placeholder="مثلاً داوطلب پزشکی ۱۴۰۶" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="me-goal">هدف روزانه (دقیقه)</Label>
          <Input name="dailyGoalMinutes" required step={1} id="me-goal" type="number" min={0} max={1440} defaultValue={s.dailyGoalMinutes} />
        </div>
        {!compact && <div className="flex flex-col gap-2">
          <Label htmlFor="me-konkur">تاریخ {examForProfile(s.educationGroup, s.educationStage) ?? 'آزمون'}</Label>
          <DateInput name="konkurDate" id="me-konkur" value={konkurPreview} aria-describedby="me-konkur-jalali" onChange={(event) => setKonkurPreview(event.target.value)} />
          <p id="me-konkur-jalali" className="text-xs text-muted-foreground" aria-live="polite">{konkurPreview && /^\d{4}-\d{2}-\d{2}$/.test(konkurPreview) ? `${jalaliFullDate(konkurPreview)} · ${daysUntil(konkurPreview) > 0 ? `${fa(daysUntil(konkurPreview))} روز مانده` : 'این تاریخ گذشته است'}` : 'روز آزمون را از تقویم انتخاب کن؛ معادل شمسی‌اش همین‌جا نشان داده می‌شود.'}</p>
        </div>}
      </fieldset>
      <div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={rename.isPending || name.trim().length < 2}>{rename.isPending ? 'در حال ذخیره…' : 'ذخیرۀ تغییرات'}</Button>{rename.isSuccess && <p role="status" className="text-xs text-primary">تغییرات ذخیره شد.</p>}</div>
      </form>
      {compact ? <div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-muted px-3 py-1">{s.showOnLeaderboard ? 'نمایش در لیگ: روشن' : 'نمایش در لیگ: خاموش'}</span><span className="rounded-full bg-muted px-3 py-1">تایمر {s.timerDisplay === 'chibi' ? 'چیبی' : 'ساده'}</span><Link to="?section=settings" className="rounded-full bg-secondary px-3 py-1 underline">ویرایش تنظیمات و حریم خصوصی</Link></div> : <>
      <p className="text-xs leading-6 text-muted-foreground">تنظیمات زیر با تغییر، ذخیره می‌شوند.</p>
      <Row title="نمایش در جدول رتبه‌بندی" hint="اگر خاموش باشد، زمانت در لیگ دیده نمی‌شود.">
        <Switch aria-label="نمایش در جدول رتبه‌بندی" disabled={update.isPending} checked={s.showOnLeaderboard} onCheckedChange={(value) => update.mutate({ showOnLeaderboard: value })} />
      </Row>
      <Row title="چه کسانی مطالعه‌ی زنده‌ام را ببینند؟">
        <div className="flex rounded-xl bg-card p-1 text-xs font-bold">
          {([['everyone', 'همه'], ['friends', 'دوستان'], ['nobody', 'هیچ‌کس']] as const).map(([value, label]) => (
            <button key={value} type="button" disabled={update.isPending} aria-pressed={s.liveVisibility === value} onClick={() => update.mutate({ liveVisibility: value })} className={cn('rounded-lg px-2.5 py-1.5', s.liveVisibility === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
              {label}
            </button>
          ))}
        </div>
      </Row>
      <Row title="ظاهر برنامه" hint="روشن، تیره، یا هماهنگ با تنظیم گوشی">
        <div className="flex rounded-xl bg-card p-1 text-xs font-bold" role="group" aria-label="ظاهر برنامه">
          {([['light', 'روشن'], ['dark', 'تیره'], ['system', 'مثل دستگاه']] as const).map(([value, label]) => (
            <button key={value} type="button" disabled={theme.isPending} aria-pressed={profile.theme === value} onClick={() => theme.mutate(value)} className={cn('rounded-lg px-3 py-1.5', profile.theme === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
              {label}
            </button>
          ))}
        </div>
      </Row>
      <Row title="نمایش تایمر" hint="تایمر ساده یا اتاق چیبی با والپیپر">
        <div className="flex rounded-xl bg-card p-1 text-xs font-bold">
          {([['digital', 'ساده'], ['chibi', 'چیبی']] as const).map(([value, label]) => (
            <button key={value} type="button" disabled={update.isPending} aria-pressed={s.timerDisplay === value} onClick={() => update.mutate({ timerDisplay: value })} className={cn('rounded-lg px-3 py-1.5', s.timerDisplay === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
              {label}
            </button>
          ))}
        </div>
      </Row>
      <Row title="یادآورها و اعلان‌ها" hint="پایان پومودورو و یادآورهای پلنر">
        <Switch aria-label="یادآورها و اعلان‌ها" disabled={update.isPending} checked={s.notificationsEnabled} onCheckedChange={(value) => void askNotifications(value)} />
      </Row>

      </>}
      {(update.isError || rename.isError || theme.isError) && <p role="alert" className="text-sm text-destructive">{errorMessage(update.error ?? rename.error ?? theme.error)}</p>}
    </fieldset>
  )
}
