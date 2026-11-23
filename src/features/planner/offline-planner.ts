import { api } from '../../app/api'
import { auth } from '../../app/auth'
import { ApiClientError } from '../../shared/api/api-client-error'
import { errorMessage } from '../../shared/api/http'
import { canReachApi } from '../../shared/api/reachability'
import { createPlannerItemInputSchema, type CreatePlannerItemInput, type UpdatePlannerItemInput } from '../../shared/api/planner'
import { maxSheetDataLength, type Sheet, type SheetKind } from '../../shared/api/sheets'
import { addDays } from '../../shared/lib/tehran'
import { applyEdit, journal, patchSheet, projected, rememberSheet, validPageSize, type Edit, type Journal, type Pending, type SheetEdit } from './planner-journal'

const offline = () => !navigator.onLine
const temporary = (err: unknown) => err instanceof ApiClientError &&
  (err.code === 'NETWORK_ERROR' || err.status === 408 || err.status === 429 || (err.status ?? 0) >= 500)
const missing = (err: unknown) => err instanceof ApiClientError && err.status === 404
const signal = 'sweetstudy-planner-changed'
const syncs = new Map<string, Promise<void>>()

function notify(member: string) {
  window.dispatchEvent(new CustomEvent(signal, { detail: member }))
  try { localStorage.setItem(signal, JSON.stringify([member, crypto.randomUUID()])) } catch { /* Same-tab updates still work. */ }
}
export function onPlannerChange(member: string, fn: () => void) {
  const local = (event: Event) => { if ((event as CustomEvent<string>).detail === member) fn() }
  const otherTab = (event: StorageEvent) => {
    if (event.key === signal && event.newValue?.startsWith('[' + JSON.stringify(member) + ',')) fn()
  }
  window.addEventListener(signal, local)
  window.addEventListener('storage', otherTab)
  return () => { window.removeEventListener(signal, local); window.removeEventListener('storage', otherTab) }
}

async function read<T, R>(member: string, fetch: () => Promise<T>, remember: (state: Journal, value: T) => void, select: (state: Journal) => R, uncached: (value: T) => R, retryRace = true): Promise<R> {
  if (canReachApi()) {
    const before = await journal(member, 'readonly', state => state.version).catch(() => undefined)
    try {
      const remote = await fetch()
      if (before === undefined) return uncached(remote)
      // An older in-flight list must not erase an already-acknowledged local edit.
      const changed = await journal(member, 'readwrite', state => {
        if (state.version !== before) return true
        remember(state, remote)
        return false
      }).catch(() => undefined)
      if (changed === undefined) return uncached(remote)
      if (changed && retryRace) return read(member, fetch, remember, select, uncached, false)
    } catch (err) { if (!temporary(err)) throw err }
  }
  return journal(member, 'readonly', select)
}

export function listOfflineTasks(member: string, from: string, to: string) {
  return read(member, () => api.planner.list(from, to, member), (state, items) => {
    state.tasks = [...state.tasks.filter(row => row.date < from || row.date > to), ...items]
    const dates = new Set(state.dates)
    for (let date = from; date <= to; date = addDays(date, 1)) dates.add(date)
    state.dates = [...dates]
  }, state => ({
    items: projected(state).tasks.filter(item => item.date >= from && item.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date) || Number(a.isDone) - Number(b.isDone) || a.position - b.position),
    dates: state.dates,
  }), items => ({ items, dates: null as string[] | null }))
}
export function listOfflineSheets(member: string) {
  return read(member, () => api.sheets.list(member), (state, sheets) => {
    state.sheets = sheets
    const available = new Set(sheets.map(page => page.id))
    state.pages = state.pages.filter(page => available.has(page.id) || state.pending.some(change => change.id === page.id))
  }, state => projected(state).sheets.sort((a, b) => b.updatedAt - a.updatedAt), value => value)
}
export async function getOfflineSheet(member: string, id: string) {
  const pending = await journal(member, 'readonly', state => state.pending.some(change => change.id === id) ? projected(state).pages.find(page => page.id === id) : undefined).catch(() => undefined)
  if (pending) return pending
  return read(member, () => api.sheets.get(id, member), (state, value) => rememberSheet(state, value), state => {
    const page = projected(state).pages.find(sheet => sheet.id === id)
    if (!page) throw new ApiClientError('این برگه هنوز روی این دستگاه باز نشده است. یک‌بار با اینترنت بازش کن.', { code: 'OFFLINE_SHEET_MISSING' })
    return page
  }, value => value)
}

async function send(member: string, change: Pending) {
  const { id, edit } = change
  switch (edit.type) {
    case 'task-create': return api.planner.create(edit.item, member)
    case 'task-update': return api.planner.update(id, edit.patch, member)
    case 'task-delete':
    case 'sheet-delete':
      try {
        if (edit.type === 'task-delete') await api.planner.remove(id, member)
        else await api.sheets.remove(id, member)
      } catch (error) { if (!missing(error)) throw error }
      return
    case 'sheet-create': return api.sheets.create({ id, kind: edit.sheet.kind, title: edit.sheet.title }, member)
    case 'sheet-update': {
      // Merge only changed form fields into the latest server version. The
      // conditional write guards edits by another browser between GET and PUT.
      for (let attempt = 0; ; attempt++) {
        const current = await api.sheets.get(id, member)
        const next = patchSheet(current, edit.patch)
        if (current.title === next.title && Object.entries(edit.patch.fields).every(([key, value]) => current.data[key] === (value ?? undefined))) return current
        try {
          const { updatedAt } = await api.sheets.update(id, { title: next.title, data: next.data, expectedUpdatedAt: current.updatedAt }, member)
          return { ...next, updatedAt }
        } catch (err) {
          if (!(err instanceof ApiClientError) || err.code !== 'SHEET_VERSION_CONFLICT' || attempt >= 2) throw err
        }
      }
    }
  }
}
type Result = Awaited<ReturnType<typeof send>>
function acknowledge(state: Journal, change: Pending, result: Result) {
  if (!state.pending.some(row => row.key === change.key)) return
  if (result && 'kind' in result && 'data' in result) rememberSheet(state, result)
  else if (result) state.tasks = [...state.tasks.filter(row => row.id !== result.id), result]
  else applyEdit(state, change)
  state.pending = state.pending.filter(row => row.key !== change.key)
  state.version++
}

async function drain(member: string) {
  if (offline() || !(await journal(member, 'readonly', state => state.pending.length))) return
  if ((await auth.verifySession())?.user.id !== member) return
  const lease = crypto.randomUUID()
  const now = Date.now()
  const acquired = await journal(member, 'readwrite', state => {
    if (state.lease && state.lease.until > now) return false
    state.lease = { key: lease, until: now + 60_000 }
    return true
  })
  if (!acquired) return
  const renew = setInterval(() => {
    void journal(member, 'readwrite', state => { if (state.lease?.key === lease) state.lease.until = Date.now() + 60_000 }).catch(() => {})
  }, 15_000)
  try {
    while (!offline()) {
      const next = await journal(member, 'readonly', state => {
        if (state.lease?.key !== lease) return
        const blocked = new Set(state.pending.filter(row => row.error).map(row => row.id))
        return state.pending.find(row => !blocked.has(row.id))
      })
      if (!next) return
      try {
        const result = await send(member, next)
        await journal(member, 'readwrite', state => acknowledge(state, next, result))
      } catch (err) {
        if (temporary(err) || !(err instanceof ApiClientError) || err.status === 401 || err.status === 403 || err.code === 'ACCOUNT_CHANGED') return
        await journal(member, 'readwrite', state => {
          const item = state.pending.find(row => row.key === next.key)
          if (item) item.error = errorMessage(err)
        })
      }
      notify(member)
    }
  } finally {
    clearInterval(renew)
    await journal(member, 'readwrite', state => { if (state.lease?.key === lease) delete state.lease })
  }
}
export function syncOfflinePlanner(member: string): Promise<void> {
  const inFlight = syncs.get(member)
  if (inFlight) return inFlight
  const run = navigator.locks
    ? navigator.locks.request('sweetstudy-planner:' + member, { ifAvailable: true }, async lock => { if (lock) await drain(member) })
    : drain(member)
  const next = run.catch(() => { /* Durable queue retries on reconnect or explicit retry. */ }).finally(() => syncs.delete(member))
  syncs.set(member, next)
  return next
}
export function plannerPending(member: string) {
  return journal(member, 'readonly', state => ({ count: state.pending.length, failed: state.pending.find(row => row.error) }))
}
export async function retryPlanner(member: string, discardId?: string) {
  await journal(member, 'readwrite', state => {
    if (discardId) state.pending = state.pending.filter(row => row.id !== discardId)
    else for (const row of state.pending) delete row.error
    state.version++
  })
  notify(member)
  await syncOfflinePlanner(member)
}

async function queue(member: string, id: string, edit: Edit) {
  const change = { key: crypto.randomUUID(), at: Date.now(), id, edit }
  try {
    await journal(member, 'readwrite', state => {
      // Adjacent notebook autosaves can be compacted before any sender acquires a lease.
      const last = state.pending.at(-1)
      if (!state.lease && !last?.error && last?.id === id && last.edit.type === 'sheet-update' && edit.type === 'sheet-update') {
        last.edit.patch = { ...last.edit.patch, ...edit.patch, fields: { ...last.edit.patch.fields, ...edit.patch.fields } }
        last.at = change.at
      } else state.pending.push(change)
      state.version++
    })
  } catch {
    if (offline()) throw new ApiClientError('مرورگر نتوانست تغییرات پلنر را روی این دستگاه ذخیره کند.', { code: 'OFFLINE_PLANNER_STORAGE' })
    await send(member, change)
  }
  notify(member)
  void syncOfflinePlanner(member)
}
export async function createOfflineTask(member: string, input: CreatePlannerItemInput) {
  const parsed = createPlannerItemInputSchema.parse(input)
  const item = { ...parsed, id: crypto.randomUUID(), isDone: false, position: 100 }
  await queue(member, item.id, { type: 'task-create', item })
}
export const updateOfflineTask = (member: string, id: string, patch: UpdatePlannerItemInput) => queue(member, id, { type: 'task-update', patch })
export const deleteOfflineTask = (member: string, id: string) => queue(member, id, { type: 'task-delete' })
export async function createOfflineSheet(member: string, kind: SheetKind, title: string) {
  const now = Date.now()
  const sheet: Sheet = { id: crypto.randomUUID(), kind, title, data: {}, createdAt: now, updatedAt: now }
  await queue(member, sheet.id, { type: 'sheet-create', sheet })
  return sheet
}
export async function updateOfflineSheet(member: string, sheet: Sheet, patch: SheetEdit) {
  if (!validPageSize(sheet.data, maxSheetDataLength)) throw new ApiClientError('ظرفیت این برگه پر شده است.', { code: 'SHEET_TOO_LARGE' })
  if (patch.title !== undefined || Object.keys(patch.fields).length) await queue(member, sheet.id, { type: 'sheet-update', patch })
}
export const deleteOfflineSheet = (member: string, id: string) => queue(member, id, { type: 'sheet-delete' })
