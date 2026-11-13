import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, LoaderCircle, ShoppingBag } from 'lucide-react'
import { useRef } from 'react'
import { api } from '../../app/api'
import { queryKeys } from '../../app/session'
import { errorMessage } from '../../shared/api/http'
import type { Product } from '../../shared/api/shop'
import { formatToman, jalaliShort } from '../../shared/lib/format'
import { cn } from '../../shared/lib/utils'
import { Button } from '../../components/ui/button'

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
  const buy = useMutation({
    mutationFn: async () => {
      const order = await api.shop.order(product.id, attempt.current)
      return paymentsMode === 'dev' ? api.shop.devPay(order.id) : order
    },
    onSuccess: () => {
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
          {product.durationDays && <p className="text-xs text-muted-foreground">برای {product.durationDays} روز</p>}
        </div>
        {product.owned && product.durationDays === null ? (
          <span className="flex items-center gap-1 text-sm font-bold text-[var(--success-text)]"><BadgeCheck size={18} /> خریداری شده</span>
        ) : (
          <Button onClick={() => buy.mutate()} disabled={buy.isPending || paymentsMode === 'unavailable'} className="rounded-xl bg-primary font-bold">
            {buy.isPending ? <LoaderCircle className="animate-spin" /> : <ShoppingBag />}
            {paymentsMode === 'unavailable' ? 'به‌زودی' : product.owned ? 'تمدید' : 'خرید'}
          </Button>
        )}
      </div>
      {product.ownedUntil && <p className="text-xs text-[var(--success-text)]">فعال تا {jalaliShort(product.ownedUntil.slice(0, 10))}</p>}
      {buy.isError && <p className="text-sm text-destructive">{errorMessage(buy.error)}</p>}
    </article>
  )
}
