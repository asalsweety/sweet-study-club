import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Armchair, Coins, Shirt } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../app/api'
import { queryKeys, useChibi, useSettings } from '../../app/session'
import QueryError from '../../components/QueryError'
import { Button } from '../../components/ui/button'
import {
  chibiItems, chibiStyles, decorIds, hairColors, minutesPerCoin, outfitIds, skinTones,
  type ChibiItemId, type ChibiLook, type ChibiUpdate,
} from '../../shared/api/chibi'
import { fa } from '../../shared/lib/format'
import PixelStudyScene from '../focus/PixelStudyScene'

const companions = { asal: 'با عسل درس بخون', girl: 'چیبی دختر', boy: 'چیبی پسر' }
const skins = { light: 'روشن', warm: 'گندمی', deep: 'تیره' }
const hair = { brown: 'قهوه‌ای', black: 'مشکی', auburn: 'مسی' }
const selectClass = 'min-h-11 w-full min-w-0 rounded-xl border border-input bg-card px-3 text-base'

type StudioAction = ChibiUpdate | { action: 'buy'; item: ChibiItemId }

export default function ChibiStudio() {
  const client = useQueryClient()
  const chibi = useChibi()
  const settings = useSettings()
  const [draft, setDraft] = useState<ChibiLook | null>(null)
  const [message, setMessage] = useState('')
  const save = useMutation({
    mutationFn: (input: StudioAction) => input.action === 'buy' ? api.shop.buyChibiItem(input.item) : api.shop.updateChibi(input),
    onMutate: () => setMessage(''),
    onSuccess: (next, input) => {
      client.setQueryData(queryKeys.chibi, next)
      if (input.action === 'look') setDraft(null)
      setMessage(input.action === 'buy' ? 'به وسایلت اضافه شد.' : 'تغییرات ذخیره شد.')
    },
    onError: () => void client.invalidateQueries({ queryKey: queryKeys.chibi }),
  })
  if (chibi.isPending) return <div role="status" className="skeleton h-72 rounded-2xl"><span className="sr-only">در حال آماده‌سازی اتاق چیبی</span></div>
  if (!chibi.data) return <QueryError error={chibi.error} retry={() => void chibi.refetch()} />

  const { appearance, coins, owned } = chibi.data
  const look = draft ?? appearance
  const changed = look.companion !== appearance.companion || look.skin !== appearance.skin || look.hair !== appearance.hair

  return (
    <section id="chibi" className="surface flex min-w-0 flex-col gap-5 p-4 sm:p-6" aria-labelledby="chibi-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="chibi-heading" className="text-xl font-bold">اتاق چیبی</h2>
          <p className="mt-1 text-sm text-muted-foreground">به ازای هر {fa(minutesPerCoin)} دقیقه مطالعه‌ی ثبت‌شده، یک سکه می‌گیری.</p>
        </div>
        <p aria-live="polite" className="flex items-center gap-2 rounded-full bg-secondary px-3 py-2 text-sm font-bold text-secondary-foreground">
          <Coins size={17} aria-hidden /> {fa(coins)} سکه
        </p>
      </div>

      <div className="grid min-w-0 items-start gap-4 md:grid-cols-2">
        <PixelStudyScene appearance={{ ...appearance, ...look }} scene={settings.data?.chibiScene ?? 'night-desk'} isNight state="studying" className="h-auto w-full rounded-2xl" />
        <form className="flex min-w-0 flex-col gap-3" onSubmit={(event) => {
          event.preventDefault()
          if (changed && !save.isPending) save.mutate({ action: 'look', look })
        }}>
          <div className="grid gap-1 text-sm font-bold">
            <label htmlFor="chibi-companion">همراه مطالعه</label>
            <select id="chibi-companion" className={selectClass} value={look.companion} disabled={save.isPending} onChange={(event) => setDraft({ ...look, companion: event.target.value as ChibiLook['companion'] })}>
              {chibiStyles.map((id) => <option key={id} value={id}>{companions[id]}</option>)}
            </select>
          </div>
          {look.companion !== 'asal' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1 text-sm font-bold">
                <label htmlFor="chibi-skin">رنگ پوست</label>
                <select id="chibi-skin" className={selectClass} value={look.skin} disabled={save.isPending} onChange={(event) => setDraft({ ...look, skin: event.target.value as ChibiLook['skin'] })}>
                  {skinTones.map((id) => <option key={id} value={id}>{skins[id]}</option>)}
                </select>
              </div>
              <div className="grid gap-1 text-sm font-bold">
                <label htmlFor="chibi-hair">رنگ مو</label>
                <select id="chibi-hair" className={selectClass} value={look.hair} disabled={save.isPending} onChange={(event) => setDraft({ ...look, hair: event.target.value as ChibiLook['hair'] })}>
                  {hairColors.map((id) => <option key={id} value={id}>{hair[id]}</option>)}
                </select>
              </div>
            </div>
          )}
          <Button type="submit" disabled={!changed || save.isPending}>ذخیره‌ی همراه مطالعه</Button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(['outfit', 'decor'] as const).map((slot) => {
          const isOutfit = slot === 'outfit'
          const Icon = isOutfit ? Shirt : Armchair
          return (
            <section key={slot} className="flex min-w-0 flex-col gap-2">
              <h3 className="flex items-center gap-2 font-bold"><Icon size={18} aria-hidden />{isOutfit ? 'لباس‌ها' : 'وسایل اتاق'}</h3>
              {(isOutfit ? outfitIds : decorIds).map((id) => {
                const item = chibiItems[id]
                const hasItem = owned.includes(id)
                const equipped = appearance[slot] === id
                const apply = () => {
                  if (!hasItem) save.mutate({ action: 'buy', item: id })
                  else save.mutate({ action: 'equip', item: id, use: !equipped })
                }
                const label = hasItem ? (equipped ? 'بردار' : 'استفاده کن') : `${fa(item.cost)} سکه`
                return (
                  <div key={id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-muted/50 p-3">
                    <div className="flex items-center gap-2">
                      {'color' in item && <span aria-hidden className="size-4 rounded-full" style={{ backgroundColor: item.color }} />}
                      <span className="text-sm font-bold">{item.name}</span>
                      {equipped && <span className="text-xs text-muted-foreground">فعال</span>}
                    </div>
                    <Button type="button" variant="outline" disabled={save.isPending || (!hasItem && coins < item.cost)} onClick={apply} aria-label={hasItem ? `${label}: ${item.name}` : `خرید ${item.name} با ${label}`}>
                      {!hasItem && <Coins aria-hidden />}
                      {label}
                    </Button>
                  </div>
                )
              })}
            </section>
          )
        })}
      </div>
      {save.isError && <QueryError error={save.error} />}
      <p role="status" className="text-sm text-muted-foreground">{message}</p>
    </section>
  )
}
