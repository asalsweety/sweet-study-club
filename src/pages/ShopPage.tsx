import PageHeading from '../components/PageHeading'
import QueryError from '../components/QueryError'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Receipt } from 'lucide-react'
import { api } from '../app/api'
import { queryKeys } from '../app/session'
import { formatToman, jalaliShort } from '../shared/lib/format'
import PlanRequestsPanel from '../features/shop/PlanRequestsPanel'
import ChibiStudio from '../features/shop/ChibiStudio'
import ProductCard from '../features/shop/ProductCard'

const orderStatus = { pending: 'در انتظار پرداخت', paid: 'پرداخت شد', cancelled: 'لغو شد', failed: 'ناموفق' } as const
const stickerSheets = [
  ['sheet-bees', 'زنبورهای باشگاه'],
  ['sheet-garden', 'گل‌ها، زنبورها و قلب‌ها'],
  ['sheet-tape', 'نوارهای افقی'],
  ['sheet-tape-vertical', 'نوارهای عمودی'],
  ['sheet-girl', 'حالت‌های چیبی دختر'],
  ['sheet-boy', 'حالت‌های چیبی پسر'],
] as const

const individualStickers = [
  { label: 'زنبورها', files: Array.from({ length: 13 }, (_, i) => `cute-bee-${i + 1}`) },
  { label: 'گل‌ها', files: Array.from({ length: 12 }, (_, i) => `cute-flower-${i + 1}`) },
  { label: 'قلب‌ها', files: Array.from({ length: 13 }, (_, i) => `cute-heart-${i + 1}`) },
  { label: 'نوارها', files: [1, 2, 3].flatMap(i => [`cute-strip-${i}`, `cute-strip-${i}-v`]) },
  { label: 'باشگاه', files: ['bee', 'books', 'honey', 'library', 'cottage', ...[1, 2, 3, 4].map(i => `bee-sticker-${i}`)] },
]
export default function ShopPage() {
  const [collection, setCollection] = useState('')
  const orders = useQuery({ queryKey: queryKeys.orders, queryFn: api.shop.orders })
  const catalog = useQuery({ queryKey: queryKeys.shop, queryFn: api.shop.products })

  return (
    <div className="shop-reference flex flex-col gap-5">
      <PageHeading eyebrow="برای قدم بعدی" title="فروشگاه باشگاه" description="با مطالعه سکه جمع کن و اتاق چیبی‌ات را بچین." />
      {catalog.isError && <QueryError error={catalog.error} retry={() => void catalog.refetch()} />}
      {catalog.data && <section className="grid gap-3" aria-labelledby="shop-catalog">
        <h2 id="shop-catalog" className="text-lg font-bold">محصولات باشگاه</h2>
        {catalog.data.products.length > 0
          ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{catalog.data.products.map((product) =>
            <ProductCard key={product.id} product={product} paymentsMode={catalog.data.paymentsMode} />)}</div>
          : <p className="surface p-4 text-sm text-muted-foreground">محصولی برای نمایش نیست.</p>}
      </section>}
      <ChibiStudio />
      <details className="surface p-4 sm:p-6">
        <summary className="min-h-11 cursor-pointer rounded-lg py-2 text-base font-bold focus-visible:outline-2 focus-visible:outline-ring">برگه‌های برچسب</summary>
        <div className="grid grid-cols-2 gap-3 pt-2 md:grid-cols-3">
          {stickerSheets.map(([file, label]) => {
            const src = `/images/study-stickers/${file}.webp`
            return <a key={file} href={src} className="block rounded-xl border border-border bg-muted/40 p-2 text-center text-sm font-semibold hover:border-ring focus-visible:outline-2 focus-visible:outline-ring">
              <img src={src} alt="" width={864} height={864} loading="lazy" decoding="async" className="mb-2 aspect-square h-auto w-full rounded-lg object-contain" />
              {label}
            </a>
          })}
        </div>
        <label className="mt-5 flex flex-wrap items-center gap-3 text-sm font-bold">برچسب‌های تکی
          <select value={collection} onChange={e => setCollection(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2"><option value="">انتخاب مجموعه</option>{individualStickers.map(group => <option key={group.label}>{group.label}</option>)}</select>
        </label>
        {collection && <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-8">{individualStickers.find(group => group.label === collection)?.files.map((name, index) => <a key={name} href={`/images/study-stickers/${name}.webp`}><img src={`/images/study-stickers/${name}.webp`} alt={`${collection} ${index + 1}`} width={144} height={144} loading="lazy" className="aspect-square w-full object-contain" /></a>)}</div>}
      </details>
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
