import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Copy, ImageOff, KeyRound, LogOut, Search, ShieldCheck, UserRound } from 'lucide-react'
import { useState } from 'react'
import { api, type AdminUser } from '../../app/api'
import Avatar from '../../components/Avatar'
import VerifiedBadge from '../../components/VerifiedBadge'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { errorMessage } from '../../shared/api/http'
import { confirmAction } from '../../shared/lib/confirm'
import { fa, faGrouped, formatHours } from '../../shared/lib/format'
import { toast } from '../../shared/lib/toast'
import { useDebouncedValue } from '../../shared/lib/useDebouncedValue'

const dateFormat = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric' })
const relative = new Intl.RelativeTimeFormat('fa', { numeric: 'auto' })

function lastSeen(at: number | null) {
  if (at === null) return 'هنوز سر نزده'
  const minutes = Math.round((Date.now() - at) / 60_000)
  if (minutes < 3) return 'آنلاین'
  if (minutes < 60) return relative.format(-minutes, 'minute')
  if (minutes < 1440) return relative.format(-Math.round(minutes / 60), 'hour')
  return relative.format(-Math.round(minutes / 1440), 'day')
}

type Filter = 'all' | 'admin' | 'verified' | 'new'
const filters: [Filter, string][] = [['all', 'همه'], ['new', 'تازه‌واردها'], ['verified', 'تأییدشده'], ['admin', 'مدیرها']]

export default function AdminUsers() {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const search = useDebouncedValue(q.trim())
  const users = useQuery({ queryKey: ['admin', 'users', search], queryFn: () => api.admin.users(search) })
  const weekAgo = Date.now() - 7 * 86_400_000
  const list = (users.data?.users ?? []).filter((user) =>
    filter === 'all' ? true : filter === 'admin' ? user.role === 'admin' : filter === 'verified' ? user.verified : user.createdAt >= weekAgo)
  const selected = users.data?.users.find((user) => user.id === openId) ?? null
  const totals = users.data?.totals

  return (
    <section className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([['همۀ اعضا', totals?.total], ['تازه در این هفته', totals?.newThisWeek], ['تأییدشده', totals?.verified], ['مدیر', totals?.admins]] as const).map(([label, value]) => (
          <div key={label} className="glass rounded-3xl p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-lg font-bold">{value === undefined ? '…' : faGrouped(value)}</p>
          </div>
        ))}
      </div>

      <div className="glass grid gap-3 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1 basis-60">
            <Search size={16} className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجوی نام یا ایمیل" className="pr-9" type="search" enterKeyHint="search" />
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="فیلتر اعضا">
            {filters.map(([id, label]) => (
              <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-bold transition aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground">
                {label}
              </button>
            ))}
          </div>
        </div>

        {users.isError && <p className="text-sm text-destructive">{errorMessage(users.error)}</p>}
        <ul className="grid gap-1.5" aria-busy={users.isPending}>
          {users.isPending && Array.from({ length: 5 }, (_, i) => <li key={i} className="skeleton h-16 rounded-2xl" />)}
          {users.data && list.length === 0 && <li className="rounded-2xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">عضوی با این مشخصات پیدا نشد.</li>}
          {list.map((user) => (
            <li key={user.id}>
              <button type="button" onClick={() => setOpenId(user.id)} className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-right transition hover:bg-muted/60 active:scale-[0.99]">
                <Avatar name={user.displayName} url={user.avatarUrl} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-1 font-bold">
                    <span className="truncate">{user.displayName}</span>
                    <VerifiedBadge verified={user.verified} />
                    {user.role === 'admin' && <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[0.65rem] text-primary">مدیر</span>}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground" dir="ltr">{user.email}</span>
                </span>
                <span className="hidden shrink-0 text-left text-xs text-muted-foreground sm:block">
                  <span className="block font-bold text-foreground">{formatHours(user.totalSeconds)}</span>
                  {lastSeen(user.lastSeenAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {users.data && users.data.users.length >= 200 && <p className="text-xs text-muted-foreground">فقط ۲۰۰ عضو آخر نمایش داده می‌شود؛ برای پیدا کردن بقیه جست‌وجو کن.</p>}
      </div>

      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setOpenId(null) }}>
        <DialogContent dir="rtl" className="max-h-[88dvh] overflow-y-auto">
          {selected && <MemberDetails user={selected} />}
        </DialogContent>
      </Dialog>
    </section>
  )
}

function MemberDetails({ user }: { user: AdminUser }) {
  const client = useQueryClient()
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)
  const refresh = () => client.invalidateQueries({ queryKey: ['admin', 'users'] })
  const fail = (error: unknown) => toast(errorMessage(error), { icon: '⚠️' })

  const role = useMutation({ mutationFn: (next: 'member' | 'admin') => api.admin.setRole(user.id, next), onSuccess: refresh, onError: fail })
  const verify = useMutation({
    mutationFn: (next: boolean) => api.admin.setVerified(user.id, next),
    onSuccess: (_, next) => { toast(next ? 'تیک تأیید داده شد.' : 'تیک تأیید برداشته شد.', { icon: '✔️' }); void refresh() },
    onError: fail,
  })
  const reset = useMutation({
    mutationFn: () => api.admin.resetPassword(user.id),
    onSuccess: (password) => { setTemporaryPassword(password); void refresh() },
    onError: fail,
  })
  const signOut = useMutation({ mutationFn: () => api.admin.signOutUser(user.id), onSuccess: () => { toast('از همۀ دستگاه‌ها خارج شد.'); void refresh() }, onError: fail })
  const avatar = useMutation({ mutationFn: () => api.admin.removeAvatar(user.id), onSuccess: () => { toast('عکس پروفایل حذف شد.'); void refresh() }, onError: fail })

  const askReset = async () => {
    if (await confirmAction({ title: `رمز تازه برای ${user.displayName}؟`, description: 'رمز فعلی‌اش دیگر کار نمی‌کند و از همۀ دستگاه‌ها خارج می‌شود. رمز موقت را فقط یک بار اینجا می‌بینی.', confirmLabel: 'ساخت رمز موقت' })) reset.mutate()
  }
  const copy = async () => {
    if (!temporaryPassword) return
    try { await navigator.clipboard.writeText(temporaryPassword); toast('رمز کپی شد.', { icon: '📋' }) } catch { toast('کپی نشد؛ رمز را دستی بنویس.') }
  }

  return <>
    <DialogHeader>
      <div className="flex items-center gap-3">
        <Avatar name={user.displayName} url={user.avatarUrl} size="lg" />
        <div className="min-w-0">
          <DialogTitle className="flex items-center gap-1.5"><span className="truncate">{user.displayName}</span><VerifiedBadge verified={user.verified} size={18} /></DialogTitle>
          <DialogDescription className="truncate" dir="ltr">{user.email}</DialogDescription>
        </div>
      </div>
    </DialogHeader>

    <dl className="grid grid-cols-2 gap-2 text-sm">
      {([
        ['عضویت از', dateFormat.format(user.createdAt)],
        ['آخرین حضور', lastSeen(user.lastSeenAt)],
        ['کل مطالعه', formatHours(user.totalSeconds)],
        ['دستگاه‌های واردشده', fa(user.sessions)],
      ] as const).map(([label, value]) => (
        <div key={label} className="rounded-2xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-bold">{value}</dd></div>
      ))}
    </dl>

    {temporaryPassword && (
      <div role="status" className="grid gap-2 rounded-2xl border border-primary/40 bg-secondary p-4">
        <p className="text-sm font-bold">رمز موقت {user.displayName}</p>
        <div className="flex items-center gap-2">
          <code dir="ltr" className="min-w-0 flex-1 select-all rounded-xl bg-card px-3 py-2 text-center font-mono text-base tracking-wider">{temporaryPassword}</code>
          <Button size="icon" variant="outline" aria-label="کپی رمز" onClick={() => void copy()}><Copy size={16} /></Button>
        </div>
        <p className="text-xs leading-6 text-muted-foreground">این رمز را خصوصی برایش بفرست. بعد از ورود، از «پروفایل ← تنظیمات ← تغییر رمز» رمز خودش را بگذارد.</p>
      </div>
    )}

    <div className="grid gap-2">
      <Button variant="outline" className="justify-start" disabled={verify.isPending} onClick={() => verify.mutate(!user.verified)}>
        <BadgeCheck />{user.verified ? 'برداشتن تیک تأیید' : 'دادن تیک تأیید (حساب اصلی)'}
      </Button>
      <Button variant="outline" className="justify-start" disabled={reset.isPending} onClick={() => void askReset()}>
        <KeyRound />{reset.isPending ? 'در حال ساخت رمز…' : 'بازنشانی رمز عبور'}
      </Button>
      <Button variant="outline" className="justify-start" disabled={signOut.isPending || user.sessions === 0} onClick={() => signOut.mutate()}>
        <LogOut />خروج از همۀ دستگاه‌ها
      </Button>
      {user.avatarUrl && (
        <Button variant="outline" className="justify-start" disabled={avatar.isPending} onClick={() => avatar.mutate()}>
          <ImageOff />حذف عکس پروفایل
        </Button>
      )}
      <Button variant="outline" className="justify-start" disabled={role.isPending} onClick={() => role.mutate(user.role === 'admin' ? 'member' : 'admin')}>
        {user.role === 'admin' ? <><UserRound />تبدیل به عضو عادی</> : <><ShieldCheck />تبدیل به مدیر</>}
      </Button>
    </div>
  </>
}
