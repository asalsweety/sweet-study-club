import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Package, Send } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../app/api'
import { errorMessage } from '../../shared/api/http'
import type { PlanRequest } from '../../shared/api/shop'
import { jalaliShort } from '../../shared/lib/format'
import { Button } from '../../components/ui/button'
import { Textarea } from '../../components/ui/textarea'
import { QueryState } from '../learning/components'
import AdminProducts from './AdminProducts'

function PlanReply({ request }: { request: PlanRequest }) {
  const client = useQueryClient()
  const [text, setText] = useState(request.response ?? '')
  const answer = useMutation({
    mutationFn: (status: 'in_progress' | 'delivered') => api.admin.answerPlan(request.id, status, text.trim() || null),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin', 'plans'] }),
  })
  return (
    <li className="flex flex-col gap-2 rounded-2xl bg-muted/40 p-4">
      <div className="flex justify-between gap-2 text-sm">
        <span className="font-bold">{request.displayName} · {request.goal}</span>
        <span className="text-xs text-muted-foreground">{jalaliShort(request.createdAt.slice(0, 10))}</span>
      </div>
      {request.details && <p className="whitespace-pre-line text-sm text-foreground/80">{request.details}</p>}
      <Textarea rows={4} value={text} maxLength={20000} onChange={(e) => setText(e.target.value)} placeholder="برنامه‌ی شخصی را اینجا بنویس..." />
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" disabled={answer.isPending} onClick={() => answer.mutate('in_progress')}>در حال انجام</Button>
        <Button size="sm" onClick={() => answer.mutate('delivered')} disabled={!text.trim() || answer.isPending}><Send size={14} /> تحویل</Button>
        <span className="mr-auto self-center text-xs text-muted-foreground">{request.status === 'delivered' ? 'تحویل شده' : request.status === 'in_progress' ? 'در حال انجام' : 'جدید'}</span>
      </div>
      {answer.isError && <p className="text-sm text-destructive">{errorMessage(answer.error)}</p>}
    </li>
  )
}

export default function AdminContent() {
  const client = useQueryClient()
  const plans = useQuery({ queryKey: ['admin', 'plans'], queryFn: api.admin.planRequests })
  const deliveries = useQuery({ queryKey: ['admin', 'deliveries'], queryFn: api.admin.deliveryOrders })
  const fulfill = useMutation({
    mutationFn: ({ id, fulfilled }: { id: string; fulfilled: boolean }) => api.admin.setDeliveryFulfilled(id, fulfilled),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin', 'deliveries'] }),
  })

  return (
    <div className="flex flex-col gap-5">
      <AdminProducts />
      <section className="glass flex flex-col gap-3 rounded-2xl p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold"><Package size={18} className="text-primary" /> سفارش‌های تحویلی</h2>
        <QueryState pending={deliveries.isPending} error={deliveries.error} retry={deliveries.refetch} empty={deliveries.data?.length === 0 && 'سفارش تحویلی ثبت نشده است.'} />
        <QueryState error={fulfill.error} />
        <ul className="grid gap-2">{deliveries.data?.map((order) => (
          <li key={order.id} className="rounded-2xl border border-border bg-card p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-bold">{order.productTitle} · {order.delivery?.method === 'pickup' ? 'تحویل حضوری' : 'ارسال پستی'}</span><span className="text-xs text-muted-foreground">{jalaliShort(order.createdAt.slice(0, 10))} · {order.status === 'paid' ? 'پرداخت شد' : 'در انتظار پرداخت'}</span></div>
            {order.delivery && <p className="mt-2 leading-7 text-muted-foreground"><span className="font-bold text-foreground">{order.delivery.name}</span> · <span dir="ltr">{order.delivery.phone}</span>{order.delivery.method === 'shipping' && <> · {order.delivery.city}، {order.delivery.address} · کد پستی <span dir="ltr">{order.delivery.postalCode}</span></>}{order.delivery.note && <> · {order.delivery.note}</>}</p>}
            <p className="mt-1 text-xs text-muted-foreground">{order.buyerName} · <span dir="ltr">{order.buyerEmail}</span></p>
            {order.status === 'paid' && <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-xs text-muted-foreground">{order.fulfilledAt ? 'تحویل شده' : 'آمادۀ پیگیری تحویل'}</span>
              <Button size="sm" variant="outline" disabled={fulfill.isPending} onClick={() => fulfill.mutate({ id: order.id, fulfilled: !order.fulfilledAt })}>{order.fulfilledAt ? 'بازگردانی وضعیت' : 'ثبت تحویل'}</Button>
            </div>}
          </li>
        ))}</ul>
      </section>

      <section className="glass flex flex-col gap-3 rounded-2xl p-5">
        <h2 className="text-lg font-bold">💌 درخواست‌های Plan by Asal</h2>
        <QueryState pending={plans.isPending} error={plans.error} retry={plans.refetch} empty={plans.data?.length === 0 && 'درخواستی نیست.'} />
        <ul className="flex flex-col gap-2">{plans.data?.map((request) => <PlanReply key={request.id} request={request} />)}</ul>
      </section>

    </div>
  )
}
