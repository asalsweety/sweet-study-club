import { useQuery } from '@tanstack/react-query'
import { Receipt, Sparkles } from 'lucide-react'
import { api } from '../app/api'
import { queryKeys } from '../app/session'
import { formatToman, jalaliShort } from '../shared/lib/format'
import PlanRequestsPanel from '../features/shop/PlanRequestsPanel'
import ProductCard from '../features/shop/ProductCard'

const orderStatus = { pending: 'در انتظار پرداخت', paid: 'پرداخت شد', cancelled: 'لغو شد', failed: 'ناموفق' } as const

export default function ShopPage() {
  const shop = useQuery({ queryKey: queryKeys.shop, queryFn: api.shop.products })
  const orders = useQuery({ queryKey: queryKeys.orders, queryFn: api.shop.orders })

  return (
    <div className="flex flex-col gap-5">
      <section className="rise relative overflow-hidden rounded-[2rem] bg-[image:var(--primary-gradient)] p-6 text-primary-foreground shadow-2xl shadow-primary/30 sm:p-8">
        <div aria-hidden className="absolute -bottom-20 -left-10 size-64 rounded-full bg-white/15 blur-3xl" />
        <p className="flex items-center gap-2 text-sm font-bold opacity-90"><Sparkles size={16} /> Sweet Study Shop</p>
        <h1 className="mt-2 text-3xl font-black">ابزارهایی برای مسیر قبولی</h1>
        <p className="mt-2 max-w-xl text-sm leading-7 opacity-90">پلنر، برنامه‌های آماده، پکیج‌های پزشکی و برنامه‌ی شخصی که Asal برای خودت می‌نویسد.</p>
      </section>

      {shop.data?.paymentsMode === 'unavailable' && (
        <p className="rounded-2xl bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning-text)]">پرداخت آنلاین به‌زودی فعال می‌شود. فعلاً می‌توانی محصولات را ببینی.</p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shop.isPending && Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton h-72 rounded-[2rem]" />)}
        {shop.data?.products.map((product) => (
          <ProductCard key={product.id} product={product} paymentsMode={shop.data.paymentsMode} />
        ))}
      </section>

      <PlanRequestsPanel />

      {orders.data && orders.data.length > 0 && (
        <section className="glass rise flex flex-col gap-3 rounded-[2rem] p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-black"><Receipt size={19} className="text-primary" /> سفارش‌های من</h2>
          <ul className="flex flex-col divide-y divide-border/60">
            {orders.data.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="font-bold">{order.productTitle}</span>
                <span className="text-muted-foreground">{jalaliShort(order.createdAt.slice(0, 10))}</span>
                <span>{formatToman(order.amountToman)}</span>
                <span className={order.status === 'paid' ? 'font-bold text-[var(--success-text)]' : 'text-muted-foreground'}>{orderStatus[order.status]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
