import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, LoaderCircle, ShoppingBag } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { api } from '../../app/api'
import { queryKeys } from '../../app/session'
import { errorMessage } from '../../shared/api/http'
import { deliverySchema, type Delivery, type Product } from '../../shared/api/shop'
import { fa, formatToman, jalaliShort } from '../../shared/lib/format'
import { cn } from '../../shared/lib/utils'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'

const kindStyle: Record<Product['kind'], { emoji: string; label: string }> = {
  planner: { emoji: '🗓️', label: 'پلنر' },
  study_plan: { emoji: '📋', label: 'برنامه‌ی آماده' },
  package: { emoji: '🩺', label: 'پکیج' },
  plan_by_asal: { emoji: '💌', label: 'Plan by Asal' },
  dna_plan: { emoji: '🧬', label: 'Study DNA' },
  subscription: { emoji: '✨', label: 'اشتراک' },
}

export default function ProductCard({ product, paymentsMode }: { product: Product; paymentsMode: 'dev' | 'unavailable' }) {
  const client = useQueryClient()
  // One key per purchase attempt so double taps or retries never create two orders.
  const attempt = useRef(crypto.randomUUID())
  const [delivering, setDelivering] = useState(false)
  const buy = useMutation({
    mutationFn: async (delivery?: Delivery) => {
      const order = await api.shop.order(product.id, attempt.current, delivery)
      return paymentsMode === 'dev' ? api.shop.devPay(order.id) : order
    },
    onSuccess: () => {
      setDelivering(false)
      attempt.current = crypto.randomUUID()
      for (const key of [queryKeys.shop, queryKeys.entitlements, queryKeys.orders]) void client.invalidateQueries({ queryKey: key })
    },
  })
  const style = kindStyle[product.kind]
  const featured = product.kind === 'subscription' || product.kind === 'plan_by_asal'

  return (
    <article className={cn('glass rise flex flex-col gap-3 rounded-2xl p-5', featured && 'ring-2 ring-primary/40')}>
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-2xl">{style.emoji}</span>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold">{style.label}</span>
      </div>
      <div>
        <h3 className="text-lg font-bold">{product.title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{product.summary}</p>
      </div>
      <p className="text-sm leading-7 text-foreground/80">{product.description}</p>
      <div className="mt-auto flex items-center justify-between gap-3 pt-2">
        <div>
          <p className="text-xl font-bold text-gradient">{formatToman(product.priceToman)}</p>
          {product.durationDays && <p className="text-xs text-muted-foreground">برای {fa(product.durationDays)} روز</p>}
          {product.requiresDelivery && <p className="text-xs text-muted-foreground">تحویل حضوری یا ارسال پستی</p>}
        </div>
        {product.owned && product.durationDays === null && !product.requiresDelivery ? (
          <span className="flex items-center gap-1 text-sm font-bold text-[var(--success-text)]"><BadgeCheck size={18} /> خریداری شده</span>
        ) : (
          <Button onClick={() => (product.requiresDelivery ? setDelivering(true) : buy.mutate(undefined))} disabled={buy.isPending || paymentsMode === 'unavailable'} className="rounded-xl bg-primary font-bold">
            {buy.isPending ? <LoaderCircle className="animate-spin" /> : <ShoppingBag />}
            {paymentsMode === 'unavailable' ? 'به‌زودی' : product.owned ? 'تمدید' : 'خرید'}
          </Button>
        )}
      </div>
      {product.ownedUntil && <p className="text-xs text-[var(--success-text)]">فعال تا {jalaliShort(product.ownedUntil.slice(0, 10))}</p>}
      {buy.isError && !delivering && <p className="text-sm text-destructive">{errorMessage(buy.error)}</p>}
      {product.requiresDelivery && <DeliverySheet open={delivering} onOpenChange={setDelivering} product={product} pending={buy.isPending} error={buy.isError ? errorMessage(buy.error) : null} onSubmit={(delivery) => buy.mutate(delivery)} />}
    </article>
  )
}

/** Pickup or postal delivery for physical products such as the printed planner. */
function DeliverySheet({ open, onOpenChange, product, pending, error, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; product: Product; pending: boolean; error: string | null; onSubmit: (delivery: Delivery) => void }) {
  const [method, setMethod] = useState<Delivery['method']>('shipping')
  const [problems, setProblems] = useState<string[]>([])
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>
    const parsed = deliverySchema.safeParse({ method, ...values, note: values.note?.trim() || undefined })
    if (!parsed.success) { setProblems([...new Set(parsed.error.issues.map((issue) => issue.message.startsWith('Too') || issue.message.startsWith('Invalid') ? 'همۀ بخش‌های لازم را کامل کن.' : issue.message))]); return }
    setProblems([])
    onSubmit(parsed.data)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>تحویل {product.title}</DialogTitle>
          <DialogDescription>{formatToman(product.priceToman)} · روش تحویل را انتخاب کن.</DialogDescription>
        </DialogHeader>
        <div role="tablist" aria-label="روش تحویل" className="segmented" data-active={method === 'shipping' ? 0 : 1}>
          <span aria-hidden className="segmented-thumb" />
          <button type="button" role="tab" aria-selected={method === 'shipping'} onClick={() => setMethod('shipping')}>ارسال پستی</button>
          <button type="button" role="tab" aria-selected={method === 'pickup'} onClick={() => setMethod('pickup')}>تحویل حضوری</button>
        </div>
        <form key={method} onSubmit={submit} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="name" required minLength={2} maxLength={60} placeholder="نام و نام خانوادگی" autoComplete="name" aria-label="نام و نام خانوادگی" />
            <Input name="phone" required inputMode="tel" dir="ltr" placeholder="09123456789" autoComplete="tel" aria-label="شمارۀ موبایل" />
          </div>
          {method === 'shipping' ? <>
            <Input name="city" required minLength={2} maxLength={60} placeholder="شهر" autoComplete="address-level2" aria-label="شهر" />
            <Textarea name="address" required minLength={10} maxLength={400} rows={3} placeholder="نشانی کامل: خیابان، کوچه، پلاک، واحد" autoComplete="street-address" aria-label="نشانی" />
            <Input name="postalCode" required inputMode="numeric" dir="ltr" placeholder="کد پستی ۱۰ رقمی" autoComplete="postal-code" aria-label="کد پستی" />
          </> : <p className="rounded-2xl bg-secondary/60 p-3 text-xs leading-6 text-muted-foreground">بعد از ثبت سفارش، برای هماهنگی زمان و مکان تحویل با شماره‌ای که می‌دهی تماس گرفته می‌شود.</p>}
          <Input name="note" maxLength={200} placeholder="توضیح (اختیاری)" aria-label="توضیح" />
          {[...problems, ...(error ? [error] : [])].map((problem) => <p key={problem} role="alert" className="text-xs text-[var(--destructive-text)]">{problem}</p>)}
          <Button type="submit" size="lg" className="rounded-2xl" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <ShoppingBag />}ثبت سفارش</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
