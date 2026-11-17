import PageHeading from '../components/PageHeading'
import QueryError from '../components/QueryError'
import { useQuery } from '@tanstack/react-query'
import { Receipt, ShoppingBag } from 'lucide-react'
import { api } from '../app/api'
import { queryKeys } from '../app/session'
import { formatToman, jalaliShort } from '../shared/lib/format'
import PlanRequestsPanel from '../features/shop/PlanRequestsPanel'
import ChibiStudio from '../features/shop/ChibiStudio'

const orderStatus = { pending: 'در انتظار پرداخت', paid: 'پرداخت شد', cancelled: 'لغو شد', failed: 'ناموفق' } as const

export default function ShopPage() {
  const orders = useQuery({ queryKey: queryKeys.orders, queryFn: api.shop.orders })

  return (
    <div className="flex flex-col gap-5">
      <PageHeading title="فروشگاه باشگاه" description="با مطالعه سکه جمع کن و اتاق چیبی‌ات را بچین." />
      <section className="surface flex items-start gap-3 p-4 sm:p-6" aria-labelledby="shop-launch">
        <ShoppingBag size={22} className="mt-1 shrink-0 text-primary" aria-hidden />
        <div>
          <h2 id="shop-launch" className="text-lg font-bold">فروشگاه به‌زودی باز می‌شود</h2>
          <p className="mt-1 text-sm text-muted-foreground">به‌زودی محصولات مورد علاقه‌ی شما را اضافه می‌کنیم.</p>
        </div>
      </section>
      <ChibiStudio />
      {orders.isError && <QueryError error={orders.error} retry={() => void orders.refetch()} />}

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
