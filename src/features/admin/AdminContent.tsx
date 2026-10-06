import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Megaphone, Package, Send } from 'lucide-react'
import { useState } from 'react'
import { api } from '../../app/api'
import { errorMessage } from '../../shared/api/http'
import type { PlanRequest, Product } from '../../shared/api/shop'
import { formatToman, jalaliShort } from '../../shared/lib/format'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Switch } from '../../components/ui/switch'
import { Textarea } from '../../components/ui/textarea'

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
        <Button size="sm" variant="secondary" onClick={() => answer.mutate('in_progress')}>در حال انجام</Button>
        <Button size="sm" onClick={() => answer.mutate('delivered')} disabled={!text.trim()}><Send size={14} /> تحویل</Button>
        <span className="mr-auto self-center text-xs text-muted-foreground">{request.status === 'delivered' ? 'تحویل شده' : request.status === 'in_progress' ? 'در حال انجام' : 'جدید'}</span>
      </div>
      {answer.isError && <p className="text-sm text-destructive">{errorMessage(answer.error)}</p>}
    </li>
  )
}

function ProductRow({ product }: { product: Product }) {
  const client = useQueryClient()
  const [price, setPrice] = useState(String(product.priceToman))
  const save = useMutation({
    mutationFn: (changes: Partial<{ priceToman: number; isActive: boolean }>) =>
      api.admin.saveProduct(product.id, {
        slug: product.slug,
        kind: product.kind,
        title: product.title,
        summary: product.summary,
        description: product.description,
        priceToman: changes.priceToman ?? product.priceToman,
        durationDays: product.durationDays,
        isActive: changes.isActive ?? product.isActive,
        position: 0,
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin', 'products'] })
      void client.invalidateQueries({ queryKey: ['shop'] })
    },
  })
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-2xl bg-muted/40 p-3 text-sm">
      <span className="min-w-32 flex-1 font-bold">{product.title}</span>
      <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} onBlur={() => Number(price) !== product.priceToman && save.mutate({ priceToman: Math.max(0, Number(price)) })} className="w-32" aria-label="قیمت (تومان)" />
      <span className="w-28 text-xs text-muted-foreground">{formatToman(product.priceToman)}</span>
      <Switch checked={product.isActive} onCheckedChange={(isActive) => save.mutate({ isActive })} aria-label="فعال" />
    </li>
  )
}

export default function AdminContent() {
  const client = useQueryClient()
  const plans = useQuery({ queryKey: ['admin', 'plans'], queryFn: api.admin.planRequests })
  const products = useQuery({ queryKey: ['admin', 'products'], queryFn: api.admin.products })
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const broadcast = useMutation({
    mutationFn: () => api.admin.broadcast(title.trim(), body.trim(), 7),
    onSuccess: () => {
      setTitle('')
      setBody('')
      void client.invalidateQueries({ queryKey: ['broadcasts'] })
    },
  })

  return (
    <div className="flex flex-col gap-5">
      <section className="glass flex flex-col gap-3 rounded-[2rem] p-5">
        <h2 className="text-lg font-black">💌 درخواست‌های Plan by Asal</h2>
        {plans.data?.length === 0 && <p className="text-sm text-muted-foreground">درخواستی نیست.</p>}
        <ul className="flex flex-col gap-2">{plans.data?.map((request) => <PlanReply key={request.id} request={request} />)}</ul>
      </section>

      <section className="glass flex flex-col gap-3 rounded-[2rem] p-5">
        <h2 className="flex items-center gap-2 text-lg font-black"><Megaphone size={18} className="text-primary" /> اطلاعیه برای همه</h2>
        <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); broadcast.mutate() }}>
          <Input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان" required />
          <Textarea rows={3} value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} placeholder="متن اطلاعیه (۷ روز نمایش داده می‌شود)" required />
          <Button type="submit" disabled={!title.trim() || !body.trim() || broadcast.isPending} className="self-start rounded-xl">ارسال اطلاعیه</Button>
          {broadcast.isSuccess && <p className="text-sm text-[var(--success-text)]">اطلاعیه منتشر شد.</p>}
        </form>
      </section>

      <section className="glass flex flex-col gap-3 rounded-[2rem] p-5">
        <h2 className="flex items-center gap-2 text-lg font-black"><Package size={18} className="text-primary" /> محصولات و قیمت‌ها</h2>
        <ul className="flex flex-col gap-2">{products.data?.map((product) => <ProductRow key={product.id} product={product} />)}</ul>
      </section>
    </div>
  )
}
