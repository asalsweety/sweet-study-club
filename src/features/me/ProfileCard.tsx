import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, LoaderCircle, ShieldCheck, Trash2 } from 'lucide-react'
import { useRef, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../app/api'
import { appRoutes } from '../../app/navigation/routes'
import { useOnlineStatus } from '../../app/pwa/online-status'
import { queryKeys, useEntitlements } from '../../app/session'
import Avatar from '../../components/Avatar'
import VerifiedBadge from '../../components/VerifiedBadge'
import { Button } from '../../components/ui/button'
import { errorMessage } from '../../shared/api/http'
import type { UserProfile } from '../../shared/api/profile'
import { toast } from '../../shared/lib/toast'

const size = 256

/** Center-crops and shrinks a photo to a small square so uploads stay tiny. */
async function squarePicture(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) throw new Error('unreadable')
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) throw new Error('unreadable')
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  bitmap.close()
  const encode = (type: string, quality: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
  // Older Safari cannot encode WebP and quietly returns PNG; JPEG is the fallback.
  const webp = await encode('image/webp', 0.86)
  const blob = webp?.type === 'image/webp' ? webp : await encode('image/jpeg', 0.86)
  if (!blob) throw new Error('unreadable')
  return blob
}

export default function ProfileCard({ profile }: { profile: UserProfile }) {
  const online = useOnlineStatus()
  const client = useQueryClient()
  const entitlements = useEntitlements()
  const input = useRef<HTMLInputElement>(null)
  const done = (next: UserProfile) => client.setQueryData(queryKeys.profile, next)
  const upload = useMutation({
    mutationFn: async (file: File) => api.profile.uploadAvatar(await squarePicture(file)),
    onSuccess: (next) => { done(next); toast('عکس پروفایلت عوض شد.', { icon: '📸' }) },
    onError: (error) => toast(error instanceof Error && error.message === 'unreadable' ? 'این فایل خوانده نشد؛ یک عکس JPG یا PNG امتحان کن.' : errorMessage(error), { icon: '⚠️' }),
  })
  const remove = useMutation({
    mutationFn: api.profile.removeAvatar,
    onSuccess: (next) => { done(next); toast('عکس پروفایل حذف شد.') },
    onError: (error) => toast(errorMessage(error), { icon: '⚠️' }),
  })
  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { toast('فقط فایل تصویری قابل انتخاب است.', { icon: '⚠️' }); return }
    if (file.size > 15 * 1024 * 1024) { toast('این عکس خیلی بزرگ است (بیشتر از ۱۵ مگابایت).', { icon: '⚠️' }); return }
    upload.mutate(file)
  }
  const busy = !online || upload.isPending || remove.isPending
  const pick = () => input.current?.click()

  return (
    <section className="surface flex flex-wrap items-center gap-4 p-5 sm:p-6">
      <button type="button" className="avatar-picker" onClick={pick} disabled={busy} aria-label="انتخاب عکس پروفایل">
        <Avatar name={profile.displayName} url={profile.avatarUrl} size="xl" />
        <span className="avatar-picker-badge" aria-hidden>{upload.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Camera size={14} />}</span>
      </button>
      <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={onPick} />
      <div className="min-w-0 flex-1">
        <h2 className="flex min-w-0 items-center gap-1 text-xl font-bold"><span className="wrap-anywhere">{profile.displayName}</span><VerifiedBadge verified={profile.verified} size={20} /></h2>
        <p className="mt-1 truncate text-sm text-muted-foreground" dir="ltr">{profile.email}</p>
        <div className="mt-2 flex flex-wrap gap-3 text-xs">
          <button type="button" onClick={pick} disabled={busy} className="font-bold text-[var(--primary-ink)]">{profile.avatarUrl ? 'عوض کردن عکس' : 'افزودن عکس پروفایل'}</button>
          {profile.avatarUrl && <button type="button" onClick={() => remove.mutate()} disabled={busy} className="flex items-center gap-1 text-muted-foreground"><Trash2 size={12} />حذف عکس</button>}
        </div>
      </div>
      {entitlements.data?.plus && <span className="rounded-full bg-secondary px-3 py-1 text-xs text-primary">Sweet Plus</span>}
      {online && profile.role === 'admin' && <Button asChild variant="outline"><Link to={appRoutes.admin}><ShieldCheck />مدیریت باشگاه</Link></Button>}
    </section>
  )
}
