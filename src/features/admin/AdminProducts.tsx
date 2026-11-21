import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Package, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api } from '../../app/api'
import { queryKeys } from '../../app/session'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { NativeSelect } from '../../components/ui/native-select'
import { Textarea } from '../../components/ui/textarea'
import { type AdminProduct, type ProductKind, type UpsertProductInput, upsertProductInputSchema } from '../../shared/api/shop'
import { formatToman } from '../../shared/lib/format'
import { QueryState } from '../learning/components'
import { Field } from './Field'
import { formText } from './form-values'

const kindNames: Record<ProductKind, string> = {
  planner: 'پلنر', study_plan: 'برنامۀ آماده', package: 'بسته', plan_by_asal: 'برنامۀ شخصی',
  dna_plan: 'برنامۀ Study DNA', subscription: 'اشتراک',
}

function ProductForm({ product, onClose, refresh }: { product: AdminProduct | null; onClose: () => void; refresh: () => void }) {
  const [invalid, setInvalid] = useState(false)
  const save = useMutation({
    mutationFn: (input: UpsertProductInput) => api.admin.saveProduct(product?.id ?? null, input),
    onSuccess: () => { refresh(); onClose() },
  })
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const days = formText(form, 'durationDays')
    const parsed = upsertProductInputSchema.safeParse({
      slug: formText(form, 'slug'), kind: formText(form, 'kind'), title: formText(form, 'title'),
      summary: formText(form, 'summary'), description: formText(form, 'description'),
      priceToman: Number(formText(form, 'priceToman')), durationDays: days ? Number(days) : null,
      position: Number(formText(form, 'position')), isActive: form.has('active'), requiresDelivery: form.has('delivery'),
    })
    setInvalid(!parsed.success)
    if (parsed.success) save.mutate(parsed.data)
  }
  return <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-4">
    <h3 className="mb-3 font-bold">{product ? 'ویرایش محصول' : 'محصول جدید'}</h3>
    <fieldset disabled={save.isPending} className="grid gap-3 sm:grid-cols-2">
      <Field label="عنوان"><Input name="title" maxLength={120} required defaultValue={product?.title} /></Field>
      <Field label="شناسهٔ انگلیسی"><Input name="slug" dir="ltr" pattern="[a-z0-9\-]{2,60}" maxLength={60} required defaultValue={product?.slug} /></Field>
      <Field label="نوع محصول"><NativeSelect name="kind" defaultValue={product?.kind ?? 'planner'}>{Object.entries(kindNames).map(([kind, name]) => <option key={kind} value={kind}>{name}</option>)}</NativeSelect></Field>
      <Field label="قیمت (تومان)"><Input name="priceToman" type="number" min={0} max={1_000_000_000} required defaultValue={product?.priceToman ?? 0} /></Field>
      <Field label="مدت دسترسی (روز، اختیاری)"><Input name="durationDays" type="number" min={1} max={3650} defaultValue={product?.durationDays ?? ''} /></Field>
      <Field label="ترتیب نمایش"><Input name="position" type="number" min={0} max={1000} required defaultValue={product?.position ?? 0} /></Field>
      <div className="grid gap-3 sm:col-span-2">
        <Field label="خلاصه"><Input name="summary" required maxLength={300} defaultValue={product?.summary} /></Field>
        <Field label="توضیحات"><Textarea name="description" rows={4} maxLength={4000} defaultValue={product?.description} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input name="delivery" type="checkbox" defaultChecked={product?.requiresDelivery} /> نیاز به ارسال یا تحویل حضوری</label>
      <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={product?.isActive} /> نمایش در فروشگاه</label>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit">ذخیره محصول</Button>
        <Button type="button" variant="ghost" onClick={onClose}>انصراف</Button>
      </div>
    </fieldset>
    {invalid && <p role="alert" className="mt-2 text-sm text-destructive">عنوان، شناسه، خلاصه و مقادیر عددی را بررسی کن.</p>}
    <QueryState error={save.error} />
  </form>
}

export default function AdminProducts() {
  const client = useQueryClient()
  const products = useQuery({ queryKey: ['admin', 'products'], queryFn: api.admin.products })
  const [editing, setEditing] = useState<AdminProduct | 'new' | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['admin', 'products'] })
    void client.invalidateQueries({ queryKey: queryKeys.shop })
  }
  const archive = useMutation({
    mutationFn: (product: AdminProduct) => product.archivedAt ? api.admin.restoreProduct(product.id) : api.admin.archiveProduct(product.id),
    onSuccess: refresh,
  })
  const visible = products.data?.filter((product) => Boolean(product.archivedAt) === showArchived)
  return <section className="glass grid gap-3 rounded-2xl p-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-lg font-bold"><Package size={18} className="text-primary" /> محصولات و قیمت‌ها</h2>
      <Button size="sm" onClick={() => setEditing('new')}><Plus /> محصول جدید</Button>
    </div>
    {editing !== null && <ProductForm key={editing === 'new' ? 'new' : editing.id} product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} refresh={refresh} />}
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> نمایش محصولات بایگانی‌شده</label>
    <QueryState pending={products.isPending} error={products.error} retry={products.refetch} empty={visible?.length === 0 && 'محصولی در این بخش نیست.'} />
    <QueryState error={archive.error} />
    <ul className="grid gap-2">{visible?.map((product) => <li key={product.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 p-3">
      <div className="min-w-0">
        <h3 className="break-words text-sm font-bold">{product.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{kindNames[product.kind]} · {formatToman(product.priceToman)} · {product.archivedAt ? 'بایگانی‌شده' : product.isActive ? 'در فروشگاه' : 'پیش‌نویس'}</p>
      </div>
      <div className="flex gap-2">
        {!product.archivedAt && <Button size="sm" variant="secondary" onClick={() => setEditing(product)}>ویرایش</Button>}
        <Button size="sm" variant="outline" disabled={archive.isPending || editing !== null} onClick={() => {
          if (product.archivedAt || window.confirm('محصول از فروشگاه برداشته شود؟ سفارش‌ها و دسترسی‌های قبلی حفظ می‌شوند.')) archive.mutate(product)
        }}>{product.archivedAt ? 'بازگردانی' : 'حذف از فروشگاه'}</Button>
      </div>
    </li>)}</ul>
  </section>
}
