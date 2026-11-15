import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Music2, Play, Plus, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api } from '../../app/api'
import { queryKeys, useSettings } from '../../app/session'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { errorMessage } from '../../shared/api/http'
import type { MusicLink } from '../../shared/api/settings'
import { cn } from '../../shared/lib/utils'
import { guessTitle, musicEmbed, providerLabels } from './music'

/**
 * Saved YouTube, SoundCloud and Spotify links for the focus room. Links live
 * on the account (every device); the chosen one plays in a small player.
 */
export function MusicButton({ className, onPlay }: { className?: string; onPlay: (link: MusicLink) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}><Music2 size={16} />موسیقی</button>
      <MusicLibrary open={open} onOpenChange={setOpen} onPlay={(link) => { setOpen(false); onPlay(link) }} />
    </>
  )
}

function MusicLibrary({ open, onOpenChange, onPlay }: { open: boolean; onOpenChange: (open: boolean) => void; onPlay: (link: MusicLink) => void }) {
  const client = useQueryClient()
  const settings = useSettings(open)
  const links = settings.data?.musicLinks ?? []
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [invalid, setInvalid] = useState(false)
  const save = useMutation({
    mutationFn: (next: MusicLink[]) => api.settings.update({ musicLinks: next }),
    onSuccess: (next) => client.setQueryData(queryKeys.settings, next),
  })

  const add = (event: FormEvent) => {
    event.preventDefault()
    const embed = musicEmbed(url)
    if (!embed) { setInvalid(true); return }
    const link: MusicLink = { id: crypto.randomUUID().slice(0, 12), url: url.trim(), title: (title.trim() || guessTitle(url)).slice(0, 60) }
    save.mutate([link, ...links].slice(0, 8), { onSuccess: () => { setUrl(''); setTitle(''); onPlay(link) } })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>موسیقی مطالعه</DialogTitle>
          <DialogDescription>لینک یوتیوب، ساندکلاد یا اسپاتیفای را اضافه کن؛ روی همۀ دستگاه‌هایت ذخیره می‌شود.</DialogDescription>
        </DialogHeader>
        <form onSubmit={add} className="grid gap-3">
          <Input dir="ltr" inputMode="url" type="url" enterKeyHint="done" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="https://youtube.com/watch?v=…" value={url} onChange={(e) => { setUrl(e.target.value); setInvalid(false) }} aria-label="لینک موسیقی" aria-invalid={invalid} />
          <Input placeholder="اسم دلخواه (اختیاری)، مثلاً لوفای شبانه" maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} aria-label="اسم موسیقی" />
          {invalid && <p role="alert" className="text-xs text-[var(--destructive-text)]">این لینک پشتیبانی نمی‌شود. لینک یک ویدیو یا پلی‌لیست یوتیوب، یک ترک ساندکلاد یا ترک/آلبوم/پلی‌لیست اسپاتیفای بگذار.</p>}
          {save.isError && <p role="alert" className="text-xs text-[var(--destructive-text)]">{errorMessage(save.error)}</p>}
          <Button type="submit" className="rounded-xl" disabled={!url.trim() || save.isPending}><Plus />افزودن و پخش</Button>
        </form>
        {links.length > 0 && <ul className="grid gap-2">
          {links.map((link) => {
            const embed = musicEmbed(link.url)
            return (
              <li key={link.id} className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2">
                <button type="button" onClick={() => onPlay(link)} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 text-right transition-colors hover:bg-muted">
                  <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl text-white', embed?.provider === 'youtube' ? 'bg-[#e0453a]' : embed?.provider === 'spotify' ? 'bg-[#1db954]' : 'bg-[#ff7a1a]')}><Play size={16} className="fill-current" /></span>
                  <span className="min-w-0"><span className="block truncate text-sm font-bold">{link.title}</span><span className="block text-xs text-muted-foreground">{embed ? providerLabels[embed.provider] : 'لینک'}</span></span>
                </button>
                <Button variant="ghost" size="icon-sm" aria-label={`حذف ${link.title}`} disabled={save.isPending} onClick={() => save.mutate(links.filter((item) => item.id !== link.id))}><Trash2 size={16} /></Button>
              </li>
            )
          })}
        </ul>}
        <p className="text-[11px] leading-6 text-muted-foreground">اسپاتیفای برای پخش کامل، ورود به حساب اسپاتیفای در همین مرورگر را می‌خواهد؛ بدون آن پیش‌نمایش ۳۰ ثانیه‌ای پخش می‌شود.</p>
      </DialogContent>
    </Dialog>
  )
}

/** The small floating player for the chosen link. */
export function MusicPlayer({ link, onClose }: { link: MusicLink; onClose: () => void }) {
  const embed = musicEmbed(link.url)
  if (!embed) return null
  return (
    <div className="music-player" role="region" aria-label={`در حال پخش: ${link.title}`}>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="flex min-w-0 items-center gap-2 text-xs font-bold"><Music2 size={14} className="shrink-0" /><span className="truncate">{link.title}</span></span>
        <button type="button" onClick={onClose} aria-label="بستن پخش‌کننده" className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-white/10"><X size={15} /></button>
      </div>
      <iframe key={embed.src} title={link.title} src={embed.src} height={embed.height} className="block w-full border-0" allow="autoplay; encrypted-media; picture-in-picture" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />
    </div>
  )
}
