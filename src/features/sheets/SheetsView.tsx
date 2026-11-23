import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Check, CloudOff, LoaderCircle, Plus, Printer, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSession } from '../../app/session'
import { useOnlineStatus } from '../../app/pwa/online-status'
import { createOfflineSheet, deleteOfflineSheet, getOfflineSheet, listOfflineSheets, updateOfflineSheet } from '../planner/offline-planner'
import { sheetDiff } from '../planner/planner-journal'
import QueryError from '../../components/QueryError'
import { Button } from '../../components/ui/button'
import { errorMessage } from '../../shared/api/http'
import { sheetKinds, sheetSummarySchema, type Sheet, type SheetKind, type SheetSummary, type SheetValue } from '../../shared/api/sheets'
import { confirmAction } from '../../shared/lib/confirm'
import { toast } from '../../shared/lib/toast'
import { SheetProvider } from './kit'
import { clearSheetDraft, createSheetSaveQueue, keepSheetDraft, readSheetDraft, type SheetDraft, type SheetSaveStatus } from './sheet-save'
import { SheetHeader, templates } from './templates'
import './sheets.css'

const sheetsKey = (member: string) => ['planner-sheets', member] as const
const sheetKey = (member: string, id: string) => ['planner-sheets', member, id] as const
const dateFormat = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function SheetsView() {
  const [params, setParams] = useSearchParams()
  const memberId = useSession().data?.user.id
  const openId = params.get('sheet')
  const open = useCallback((id: string | null) => setParams((current) => {
    const next = new URLSearchParams(current)
    if (id) next.set('sheet', id)
    else next.delete('sheet')
    next.set('view', 'sheets')
    return next
  }), [setParams])
  if (!memberId) return null
  return openId ? <SheetEditor id={openId} memberId={memberId} onClose={() => open(null)} /> : <SheetLibrary member={memberId} onOpen={open} />
}

function SheetLibrary({ member, onOpen }: { member: string; onOpen: (id: string) => void }) {
  const client = useQueryClient()
  const online = useOnlineStatus()
  const sheets = useQuery({ queryKey: sheetsKey(member), queryFn: () => listOfflineSheets(member), networkMode: 'always' })
  const create = useMutation({
    mutationFn: (kind: SheetKind) => createOfflineSheet(member, kind, defaultTitle(kind)),
    networkMode: 'always',
    onSuccess: (sheet) => {
      client.setQueryData(sheetKey(member, sheet.id), sheet)
      client.setQueryData<SheetSummary[]>(sheetsKey(member), (current) =>
        current && [sheetSummarySchema.parse(sheet), ...current.filter((item) => item.id !== sheet.id)])
      void client.invalidateQueries({ queryKey: sheetsKey(member), exact: true })
      onOpen(sheet.id)
    },
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
        {create.isError && <div className="mt-3"><QueryError error={create.error} retry={() => create.mutate(create.variables)} /></div>}
      </section>

      <section className="glass rise rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-bold">صفحه‌های من</h2>
        {sheets.isError && <div className="mt-3"><QueryError error={sheets.error} retry={() => void sheets.refetch()} /></div>}
        <ul className="mt-3 grid gap-2">
          {sheets.isPending && Array.from({ length: 3 }, (_, i) => <li key={i} className="skeleton h-16 rounded-2xl" />)}
          {sheets.data?.length === 0 && <li className="rounded-2xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">{online ? 'هنوز صفحه‌ای نساختی.' : 'روی این دستگاه برگه‌ای برای نمایش نیست.'} از بالا یک برگه انتخاب کن.</li>}
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

function SheetEditor({ id, memberId, onClose }: { id: string; memberId: string; onClose: () => void }) {
  const sheet = useQuery({ queryKey: sheetKey(memberId, id), queryFn: () => getOfflineSheet(memberId, id), networkMode: 'always' })
  if (sheet.isError) return <div className="grid gap-4"><BackButton onClose={onClose} /><QueryError error={sheet.error} retry={() => void sheet.refetch()} /></div>
  if (!sheet.data) return <div className="skeleton h-[70vh] rounded-3xl" aria-label="در حال بارگذاری" />
  const draftKey = `planner-sheet-draft:${memberId}:${id}`
  return <LoadedEditor key={draftKey} member={memberId} sheet={sheet.data} draftKey={draftKey} onClose={onClose} />
}

function BackButton({ onClose }: { onClose: () => void }) {
  return <Button variant="ghost" onClick={onClose} className="sheet-back w-fit" aria-label="همۀ صفحه‌ها"><ArrowRight /><span className="sheet-back-text">همۀ صفحه‌ها</span></Button>
}

function LoadedEditor({ sheet, member, draftKey, onClose }: { sheet: Sheet; member: string; draftKey: string; onClose: () => void }) {
  const client = useQueryClient()
  const online = useOnlineStatus()
  const [initial] = useState(() => readSheetDraft(draftKey))
  const [draft, setDraft] = useState<SheetDraft>(initial ?? { data: sheet.data, title: sheet.title })
  const [status, setStatus] = useState<SheetSaveStatus>({ kind: initial ? 'dirty' : 'saved' })
  const latest = useRef(draft)
  const lastSaved = useRef<SheetDraft>({ title: sheet.title, data: sheet.data })
  const deleted = useRef(false)
  const kept = useRef(Boolean(initial))
  const timer = useRef<number | undefined>(undefined)

  const [saves] = useState(() => createSheetSaveQueue(initial, async (next) => {
    const title = next.title.trim() || defaultTitle(sheet.kind)
    const updatedAt = Date.now()
    const value = { ...sheet, data: next.data, title, updatedAt }
    await updateOfflineSheet(member, value, sheetDiff(lastSaved.current, value))
    lastSaved.current = { data: next.data, title }
    if (deleted.current) return
    client.setQueryData(sheetKey(member, sheet.id), value)
    client.setQueryData<SheetSummary[]>(sheetsKey(member), (current) => {
      const updated = current?.find((item) => item.id === sheet.id)
      return updated && current ? [{ ...updated, title, updatedAt }, ...current.filter((item) => item.id !== sheet.id)] : current
    })
  }, setStatus, (saved) => clearSheetDraft(draftKey, saved)))

  const schedule = useCallback((next: SheetDraft) => {
    latest.current = next
    setDraft(next)
    kept.current = keepSheetDraft(draftKey, next)
    saves.replace(next)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void saves.flush(), 700)
  }, [draftKey, saves])

  useEffect(() => {
    const flush = () => {
      window.clearTimeout(timer.current)
      void saves.flush()
    }
    const onHide = () => { if (document.visibilityState === 'hidden') flush() }
    if (initial) flush()
    window.addEventListener('online', flush)
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('online', flush)
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onHide)
      flush()
    }
  }, [initial, saves])

  const store = useMemo(() => ({
    data: draft.data,
    set: (key: string, value: SheetValue | undefined) => {
      const data = { ...latest.current.data }
      if (value === undefined || value === '') delete data[key]
      else data[key] = value
      schedule({ data, title: latest.current.title })
    },
  }), [draft.data, schedule])

  const close = async () => {
    window.clearTimeout(timer.current)
    if (await saves.flush() || kept.current) onClose()
  }

  const remove = useMutation({
    networkMode: 'always',
    mutationFn: async () => {
      window.clearTimeout(timer.current)
      await saves.flush()
      await deleteOfflineSheet(member, sheet.id)
    },
    onSuccess: () => {
      deleted.current = true
      saves.discard()
      clearSheetDraft(draftKey)
      client.removeQueries({ queryKey: sheetKey(member, sheet.id) })
      void client.invalidateQueries({ queryKey: sheetsKey(member), exact: true })
      toast('صفحه حذف شد.')
      onClose()
    },
    onError: (error) => toast(errorMessage(error), { icon: '⚠️' }),
  })
  const askRemove = async () => {
    if (await confirmAction({ title: 'این صفحه حذف شود؟', description: 'همۀ نوشته‌های این برگه پاک می‌شود و برنمی‌گردد.', confirmLabel: 'حذف صفحه' })) remove.mutate()
  }

  const { Body } = templates[sheet.kind]
  const paper = useRef<HTMLElement>(null)
  return (
    <div className="sheet-editor grid min-w-0 gap-4">
      <div className="sheet-toolbar">
        <BackButton onClose={() => void close()} />
        <input className="sheet-title-input" value={draft.title} maxLength={80} aria-label="نام صفحه" onChange={(event) => schedule({ data: latest.current.data, title: event.target.value })} />
        <span className="sheet-save" role="status" data-state={status.kind}>
          {status.kind === 'saved' && <><Check size={14} />{online ? 'ذخیره شد' : 'روی این دستگاه ذخیره شد'}</>}
          {(status.kind === 'saving' || status.kind === 'dirty') && <><LoaderCircle size={14} className="animate-spin" />در حال ذخیره…</>}
          {status.kind === 'error' && <button type="button" onClick={() => void saves.flush()} aria-label="تلاش دوباره برای ذخیره"><CloudOff size={14} />تلاش دوباره</button>}
        </span>
        <Button variant="outline" size="icon" aria-label="چاپ این صفحه" title="چاپ" onClick={() => window.print()}><Printer /></Button>
        <Button variant="outline" size="icon" aria-label="حذف این صفحه" title="حذف" onClick={() => void askRemove()} disabled={remove.isPending}><Trash2 /></Button>
      </div>
      {status.kind === 'error' && <p role="alert" className="text-sm text-destructive">{errorMessage(status.error)}</p>}
      <SectionJump target={paper} version={sheet.kind} />
      <SheetProvider value={store}>
        <div className="sheet-frame">
          <i className="sheet-edge is-top" aria-hidden /><i className="sheet-edge is-bottom" aria-hidden />
          <i className="sheet-edge is-start" aria-hidden /><i className="sheet-edge is-end" aria-hidden />
          {(['top-start', 'top-end', 'bottom-start', 'bottom-end'] as const).map((corner, index) => (
            <img key={corner} className={`sheet-corner is-${corner}`} src={`/images/study-stickers/${index % 3 === 0 ? 'cute-heart-1' : 'cute-flower-1'}.webp`} alt="" aria-hidden width={44} height={44} />
          ))}
          <article ref={paper} className="sheet-paper" data-kind={sheet.kind}>
            <SheetHeader kind={sheet.kind} />
            <Body />
          </article>
        </div>
      </SheetProvider>
    </div>
  )
}

/** Phones: a sticky row of section chips to jump around a long sheet. */
function SectionJump({ target, version }: { target: React.RefObject<HTMLElement | null>; version: string }) {
  const [sections, setSections] = useState<{ title: string; element: HTMLElement }[]>([])
  useEffect(() => {
    const headings = [...(target.current?.querySelectorAll<HTMLElement>('.sheet-section-head h3') ?? [])]
    setSections(headings.map((element) => ({ title: (element.textContent ?? '').replace(/\s*\(.*$/, '').replace(/^[۰-۹]+\.\s*/, '').trim(), element })))
  }, [target, version])
  if (sections.length < 2) return null
  return (
    <nav className="sheet-jump" aria-label="بخش‌های این صفحه">
      {sections.map((section) => (
        <button key={section.title} type="button" onClick={() => section.element.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{section.title}</button>
      ))}
    </nav>
  )
}
