import type { PlannerItem, UpdatePlannerItemInput } from '../../shared/api/planner'
import type { Sheet, SheetData, SheetSummary, SheetValue } from '../../shared/api/sheets'

export type SheetEdit = { title?: string; fields: Record<string, SheetValue | null> }
export type Edit =
  | { type: 'task-create'; item: PlannerItem }
  | { type: 'task-update'; patch: UpdatePlannerItemInput }
  | { type: 'task-delete' }
  | { type: 'sheet-create'; sheet: Sheet }
  | { type: 'sheet-update'; patch: SheetEdit }
  | { type: 'sheet-delete' }
export type Pending = { key: string; id: string; at: number; edit: Edit; error?: string }
export type PlannerData = { tasks: PlannerItem[]; sheets: SheetSummary[]; pages: Sheet[] }
export type Journal = PlannerData & {
  dates: string[]; pending: Pending[]; version: number
  lease?: { key: string; until: number }
}
const empty = (): Journal => ({ tasks: [], sheets: [], pages: [], dates: [], pending: [], version: 0 })

export function patchSheet(sheet: Sheet, patch: SheetEdit): Sheet {
  const data = { ...sheet.data }
  for (const [field, value] of Object.entries(patch.fields)) {
    if (value === null) delete data[field]
    else data[field] = value
  }
  return { ...sheet, title: patch.title ?? sheet.title, data }
}

export function sheetDiff(previous: Pick<Sheet, 'title' | 'data'>, next: Pick<Sheet, 'title' | 'data'>): SheetEdit {
  const fields = Object.fromEntries([...new Set([...Object.keys(previous.data), ...Object.keys(next.data)])]
    .filter(key => previous.data[key] !== next.data[key]).map(key => [key, next.data[key] ?? null]))
  return { fields, ...(previous.title !== next.title && { title: next.title }) }
}

function put<T extends { id: string }>(rows: T[], row: T) {
  return [...rows.filter(value => value.id !== row.id), row]
}

export function rememberSheet(data: PlannerData, page: Sheet) {
  const { data: _fields, ...summary } = page
  data.sheets = put(data.sheets, summary)
  data.pages = put(data.pages, page)
}

export function applyEdit(data: PlannerData, change: Pending) {
  const { id, edit } = change
  switch (edit.type) {
    case 'task-create': data.tasks = put(data.tasks, edit.item); break
    case 'task-update': data.tasks = data.tasks.map(item => item.id === id ? { ...item, ...edit.patch } as PlannerItem : item); break
    case 'task-delete': data.tasks = data.tasks.filter(item => item.id !== id); break
    case 'sheet-create': rememberSheet(data, edit.sheet); break
    case 'sheet-update': {
      const page = data.pages.find(item => item.id === id)
      if (page) rememberSheet(data, { ...patchSheet(page, edit.patch), updatedAt: change.at })
      else data.sheets = data.sheets.map(item => item.id === id ? { ...item, title: edit.patch.title ?? item.title, updatedAt: change.at } : item)
      break
    }
    case 'sheet-delete':
      data.sheets = data.sheets.filter(item => item.id !== id)
      data.pages = data.pages.filter(item => item.id !== id)
      break
  }
}

export function projected(journal: Journal): PlannerData {
  const view = { tasks: journal.tasks, sheets: journal.sheets, pages: journal.pages }
  for (const edit of journal.pending) applyEdit(view, edit)
  return view
}

async function openJournal() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const opening = indexedDB.open('sweetstudy-member-planners', 1)
    opening.onupgradeneeded = () => opening.result.createObjectStore('members')
    opening.onsuccess = () => resolve(opening.result)
    opening.onerror = () => reject(opening.error)
  })
}

/** An IndexedDB read/write transaction serializes edits from all tabs for this member. */
export async function journal<T>(member: string, mode: IDBTransactionMode, fn: (state: Journal) => T): Promise<T> {
  if (!member) throw Error('برای دسترسی به پلنر وارد حسابت شو.')
  const db = await openJournal()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction('members', mode)
      const store = tx.objectStore('members')
      const request = store.get(member)
      let result: T
      let failure: unknown
      request.onsuccess = () => {
        try {
          const state = (request.result as Journal | undefined) ?? empty()
          result = fn(state)
          if (mode === 'readwrite') store.put(state, member)
        } catch (error) { failure = error; tx.abort() }
      }
      tx.oncomplete = () => resolve(result)
      tx.onabort = () => reject(failure ?? tx.error ?? Error('تغییرات روی این دستگاه ذخیره نشد.'))
    })
  } finally { db.close() }
}

export function validPageSize(data: SheetData, limit: number) {
  const serialized = JSON.stringify(data)
  return serialized.length <= limit || [...serialized].length <= limit
}
