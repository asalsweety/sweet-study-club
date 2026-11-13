import PageHeading from '../components/PageHeading'
import QueryError from '../components/QueryError'
import { useQuery } from '@tanstack/react-query'
import { Receipt } from 'lucide-react'
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
      <PageHeading eyebrow="برای قدم بعدی" title="فروشگاه باشگاه" description="برنامه‌ها و همراهی بیشتر، برای زمانی که به آن‌ها نیاز داری." />
      {shop.isError && <QueryError error={shop.error} retry={() => void shop.refetch()} />}
      {orders.isError && <QueryError error={orders.error} retry={() => void orders.refetch()} />}
      {shop.data?.products.length === 0 && <p className="surface p-8 text-center text-sm text-muted-foreground">محصولی برای نمایش نداریم. بعداً دوباره سر بزن.</p>}

      {shop.data?.paymentsMode === 'unavailable' && (
        <p className="rounded-2xl bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning-text)]">پرداخت آنلاین به‌زودی فعال می‌شود. فعلاً می‌توانی محصولات را ببینی.</p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shop.isPending && Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton h-72 rounded-2xl" />)}
        {shop.data?.products.map((product) => (
          <ProductCard key={product.id} product={product} paymentsMode={shop.data.paymentsMode} />
        ))}
      </section>

      <PlanRequestsPanel />

      {orders.data && orders.data.length > 0 && (
        <section className="glass rise flex flex-col gap-3 rounded-2xl p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Receipt size={19} className="text-primary" /> سفارش‌های من</h2>
          <ul className="flex flex-col divide-y divide-border/60">
            {orders.data.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
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
