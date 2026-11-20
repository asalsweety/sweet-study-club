import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Armchair, Coins, Shirt } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../../app/api'
import { queryKeys, useChibi, useSettings } from '../../app/session'
import QueryError from '../../components/QueryError'
import { Button } from '../../components/ui/button'
import {
  chibiItems, chibiStyles, decorIds, defaultChibi, hairColors, minutesPerCoin, outfitIds, skinTones,
  type ChibiItemId, type ChibiLook, type ChibiUpdate,
} from '../../shared/api/chibi'
import { fa } from '../../shared/lib/format'
import PixelStudyScene from '../focus/PixelStudyScene'
import { prepareStudyArt, studyImage } from '../focus/studyRoomImage'

const companions = { asal: 'با عسل درس بخون', girl: 'چیبی دختر', boy: 'چیبی پسر' }
const companionPortraits = { girl: '/images/chibi-pack/girl.webp', boy: '/images/chibi-pack/boy.webp' }
const skins = { light: 'روشن', warm: 'گندمی', deep: 'تیره' }
const hair = { brown: 'قهوه‌ای', black: 'مشکی', auburn: 'مسی' }
const selectClass = 'min-h-11 w-full min-w-0 rounded-xl border border-input bg-card px-3 text-base'

type StudioAction = ChibiUpdate | { action: 'buy'; item: ChibiItemId }

export default function ChibiStudio() {
  const client = useQueryClient()
  const chibi = useChibi()
  const settings = useSettings()
  const scene = settings.data?.chibiScene ?? 'night-desk'
  const [draft, setDraft] = useState<ChibiLook | null>(null)
  useEffect(() => {
    // Decode the picker and its three previews while the wallet is loading.
    for (const url of Object.values(companionPortraits)) void studyImage(url).decode().catch(() => undefined)
    for (const companion of chibiStyles) prepareStudyArt(scene, 'studying', { ...defaultChibi, companion })
  }, [scene])
  const save = useMutation({
    mutationFn: (input: StudioAction) => input.action === 'buy' ? api.shop.buyChibiItem(input.item) : api.shop.updateChibi(input),
    onSuccess: async (next, input) => {
      await client.cancelQueries({ queryKey: queryKeys.chibi, exact: true })
      client.setQueryData(queryKeys.chibi, next)
      // A tap during the request starts a new draft, which the older save must preserve.
      if (input.action === 'look') setDraft(current => current === input.look ? null : current)
    },
    onError: () => void client.invalidateQueries({ queryKey: queryKeys.chibi }),
  })
  if (chibi.isPending) return <div role="status" className="skeleton h-72 rounded-2xl"><span className="sr-only">در حال آماده‌سازی اتاق چیبی</span></div>
  if (!chibi.data) return <QueryError error={chibi.error} retry={() => void chibi.refetch()} />

  const { appearance, coins, owned } = chibi.data
  const look = draft ?? { companion: appearance.companion, skin: appearance.skin, hair: appearance.hair }
  const changed = look.companion !== appearance.companion || look.skin !== appearance.skin || look.hair !== appearance.hair
  const showConfirmation = save.isSuccess && (save.variables.action !== 'look' || !changed)

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
        <PixelStudyScene appearance={{ ...appearance, ...look }} scene={scene} isNight state="studying" className="h-auto w-full rounded-2xl" />
        <form className="flex min-w-0 flex-col gap-3" onSubmit={(event) => {
          event.preventDefault()
          if (changed && !save.isPending) save.mutate({ action: 'look', look })
        }}>
          <fieldset className="min-w-0">
            <legend className="mb-2 text-sm font-bold">همراه مطالعه</legend>
            <div className="grid grid-cols-2 gap-2">
              {chibiStyles.filter((id) => id !== 'asal').map((id) => (
                <label key={id} className="relative min-w-0 cursor-pointer">
                  <input type="radio" name="chibi-companion" value={id} className="peer sr-only" checked={look.companion === id} onChange={() => setDraft({ ...look, companion: id })} />
                  <span className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-input bg-card px-2 py-3 text-center text-sm font-bold peer-checked:border-ring peer-checked:bg-secondary peer-checked:text-secondary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                    <img src={companionPortraits[id]} alt="" width={56} height={86} className="h-[86px] w-auto object-contain" decoding="async" />
                    {companions[id]}
                  </span>
                </label>
              ))}
              <label className="col-span-2 min-w-0 cursor-pointer">
                <input type="radio" name="chibi-companion" value="asal" className="peer sr-only" checked={look.companion === 'asal'} onChange={() => setDraft({ ...look, companion: 'asal' })} />
                <span className="flex min-h-11 items-center justify-center rounded-xl border border-input bg-card px-3 text-center text-sm font-bold peer-checked:border-ring peer-checked:bg-secondary peer-checked:text-secondary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring">{companions.asal}</span>
              </label>
            </div>
          </fieldset>
          {look.companion !== 'asal' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1 text-sm font-bold">
                <label htmlFor="chibi-skin">رنگ پوست</label>
                <select id="chibi-skin" className={selectClass} value={look.skin} onChange={(event) => setDraft({ ...look, skin: event.target.value as ChibiLook['skin'] })}>
                  {skinTones.map((id) => <option key={id} value={id}>{skins[id]}</option>)}
                </select>
              </div>
              <div className="grid gap-1 text-sm font-bold">
                <label htmlFor="chibi-hair">رنگ مو</label>
                <select id="chibi-hair" className={selectClass} value={look.hair} onChange={(event) => setDraft({ ...look, hair: event.target.value as ChibiLook['hair'] })}>
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
      <p role="status" className="text-sm text-muted-foreground">
        {showConfirmation && (save.variables.action === 'buy' ? 'به وسایلت اضافه شد.' : 'تغییرات ذخیره شد.')}
      </p>
    </section>
  )
}
