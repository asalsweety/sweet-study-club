import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Check, CloudOff, LoaderCircle, Plus, Printer, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../app/api'
import QueryError from '../../components/QueryError'
import { Button } from '../../components/ui/button'
import { errorMessage } from '../../shared/api/http'
import { sheetKinds, type Sheet, type SheetData, type SheetKind, type SheetValue } from '../../shared/api/sheets'
import { confirmAction } from '../../shared/lib/confirm'
import { toast } from '../../shared/lib/toast'
import { SheetProvider } from './kit'
import { SheetHeader, templates } from './templates'
import './sheets.css'

const sheetsKey = ['planner-sheets'] as const
const sheetKey = (id: string) => ['planner-sheets', id] as const
const dateFormat = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function SheetsView() {
  const [params, setParams] = useSearchParams()
  const openId = params.get('sheet')
  const open = useCallback((id: string | null) => setParams((current) => {
    if (id) current.set('sheet', id)
    else current.delete('sheet')
    current.set('view', 'sheets')
    return current
  }), [setParams])
  return openId ? <SheetEditor id={openId} onClose={() => open(null)} /> : <SheetLibrary onOpen={open} />
}

function SheetLibrary({ onOpen }: { onOpen: (id: string) => void }) {
  const client = useQueryClient()
  const sheets = useQuery({ queryKey: sheetsKey, queryFn: api.sheets.list })
  const create = useMutation({
    mutationFn: (kind: SheetKind) => api.sheets.create(kind),
    onSuccess: (sheet) => {
      client.setQueryData(sheetKey(sheet.id), sheet)
      void client.invalidateQueries({ queryKey: sheetsKey })
      onOpen(sheet.id)
    },
    onError: (error) => toast(errorMessage(error), { icon: '⚠️' }),
  })
  return (
    <div className="grid gap-6">
      <section className="glass rise rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-bold">افزودن صفحۀ تازه</h2>
        <p className="mt-1 text-sm text-muted-foreground">هر برگه را هر چند بار که لازم داری اضافه کن؛ همه‌چیز خودکار ذخیره می‌شود.</p>
        <div className="sheet-templates mt-4">
          {sheetKinds.map((kind) => {
            const template = templates[kind]
            const Icon = template.icon
            return (
              <button key={kind} type="button" className="sheet-template" disabled={create.isPending} onClick={() => create.mutate(kind)}>
                <span className="sheet-template-icon"><Icon size={20} /></span>
                <span className="min-w-0 flex-1 text-right">
                  <span className="block text-sm font-bold">{defaultTitle(kind)}</span>
                  <span className="block text-xs leading-6 text-muted-foreground">{template.description}</span>
                </span>
                {create.isPending && create.variables === kind ? <LoaderCircle size={18} className="animate-spin" /> : <Plus size={18} className="text-[var(--primary-ink)]" />}
              </button>
            )
          })}
        </div>
      </section>

      <section className="glass rise rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-bold">صفحه‌های من</h2>
        {sheets.isError && <div className="mt-3"><QueryError error={sheets.error} retry={() => void sheets.refetch()} /></div>}
        <ul className="mt-3 grid gap-2">
          {sheets.isPending && Array.from({ length: 3 }, (_, i) => <li key={i} className="skeleton h-16 rounded-2xl" />)}
          {sheets.data?.length === 0 && <li className="rounded-2xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">هنوز صفحه‌ای نساختی. از بالا یک برگه انتخاب کن.</li>}
          {sheets.data?.map((sheet) => {
            const Icon = templates[sheet.kind].icon
            return (
              <li key={sheet.id}>
                <button type="button" onClick={() => onOpen(sheet.id)} className="sheet-list-item">
                  <span className="sheet-template-icon"><Icon size={18} /></span>
                  <span className="min-w-0 flex-1 text-right">
                    <span className="block truncate font-bold">{sheet.title}</span>
                    <span className="block text-xs text-muted-foreground">{defaultTitle(sheet.kind)} · ویرایش {dateFormat.format(sheet.updatedAt)}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

const defaultTitles: Record<SheetKind, string> = {
  identity: 'شناسنامه و تعهدنامه',
  monthly: 'برنامۀ ماهانه',
  habits: 'عادت‌ها و اولویت‌ها',
  weekly: 'برنامۀ هفتگی',
  daily: 'برنامۀ روزانه',
  review: 'مرور و تحلیل آزمون',
  chapter: 'خلاصه و کارنامۀ فصل',
}
const defaultTitle = (kind: SheetKind) => defaultTitles[kind]

type SaveState = 'saved' | 'saving' | 'dirty' | 'error'

function SheetEditor({ id, onClose }: { id: string; onClose: () => void }) {
  const sheet = useQuery({ queryKey: sheetKey(id), queryFn: () => api.sheets.get(id), staleTime: Infinity })
  if (sheet.isError) return <div className="grid gap-4"><BackButton onClose={onClose} /><QueryError error={sheet.error} retry={() => void sheet.refetch()} /></div>
  if (!sheet.data) return <div className="skeleton h-[70vh] rounded-3xl" aria-label="در حال بارگذاری" />
  return <LoadedEditor key={sheet.data.id} sheet={sheet.data} onClose={onClose} />
}

function BackButton({ onClose }: { onClose: () => void }) {
  return <Button variant="ghost" onClick={onClose} className="w-fit"><ArrowRight />همۀ صفحه‌ها</Button>
}

function LoadedEditor({ sheet, onClose }: { sheet: Sheet; onClose: () => void }) {
  const client = useQueryClient()
  const [data, setData] = useState<SheetData>(sheet.data)
  const [title, setTitle] = useState(sheet.title)
  const [state, setState] = useState<SaveState>('saved')
  const pending = useRef<{ data: SheetData; title: string } | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current)
    const next = pending.current
    if (!next) return
    pending.current = null
    setState('saving')
    try {
      await api.sheets.update(sheet.id, { data: next.data, title: next.title.trim() || defaultTitle(sheet.kind) })
      client.setQueryData(sheetKey(sheet.id), { ...sheet, data: next.data, title: next.title, updatedAt: Date.now() })
      setState(pending.current ? 'dirty' : 'saved')
    } catch {
      pending.current ??= next
      setState('error')
    }
  }, [client, sheet])

  const schedule = useCallback((nextData: SheetData, nextTitle: string) => {
    pending.current = { data: nextData, title: nextTitle }
    setState('dirty')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void flush(), 700)
  }, [flush])

  // Save whatever is left when leaving the page or closing the tab.
  useEffect(() => {
    const onHide = () => { if (pending.current) void flush() }
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onHide)
      if (pending.current) void flush()
      void client.invalidateQueries({ queryKey: sheetsKey })
    }
  }, [client, flush])

  const store = useMemo(() => ({
    data,
    set: (key: string, value: SheetValue | undefined) => {
      setData((current) => {
        const next = { ...current }
        if (value === undefined || value === '') delete next[key]
        else next[key] = value
        schedule(next, title)
        return next
      })
    },
  }), [data, schedule, title])

  const remove = useMutation({
    mutationFn: () => api.sheets.remove(sheet.id),
    onSuccess: () => {
      pending.current = null
      client.removeQueries({ queryKey: sheetKey(sheet.id) })
      void client.invalidateQueries({ queryKey: sheetsKey })
      toast('صفحه حذف شد.')
      onClose()
    },
    onError: (error) => toast(errorMessage(error), { icon: '⚠️' }),
  })
  const askRemove = async () => {
    if (await confirmAction({ title: 'این صفحه حذف شود؟', description: 'همۀ نوشته‌های این برگه پاک می‌شود و برنمی‌گردد.', confirmLabel: 'حذف صفحه' })) remove.mutate()
  }

  const { Body } = templates[sheet.kind]
  return (
    <div className="grid gap-4">
      <div className="sheet-toolbar">
        <BackButton onClose={onClose} />
        <input className="sheet-title-input" value={title} maxLength={80} aria-label="نام صفحه" onChange={(event) => { setTitle(event.target.value); schedule(data, event.target.value) }} />
        <span className="sheet-save" role="status" data-state={state}>
          {state === 'saved' && <><Check size={14} />ذخیره شد</>}
          {(state === 'saving' || state === 'dirty') && <><LoaderCircle size={14} className="animate-spin" />در حال ذخیره…</>}
          {state === 'error' && <button type="button" onClick={() => void flush()}><CloudOff size={14} />ذخیره نشد؛ دوباره</button>}
        </span>
        <Button variant="outline" size="icon" aria-label="چاپ این صفحه" title="چاپ" onClick={() => window.print()}><Printer /></Button>
        <Button variant="outline" size="icon" aria-label="حذف این صفحه" title="حذف" onClick={() => void askRemove()} disabled={remove.isPending}><Trash2 /></Button>
      </div>
      <SheetProvider value={store}>
        <article className="sheet-paper" data-kind={sheet.kind}>
          <SheetHeader kind={sheet.kind} />
          <Body />
        </article>
      </SheetProvider>
    </div>
  )
}
