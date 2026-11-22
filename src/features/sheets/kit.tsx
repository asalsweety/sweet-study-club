import { Check as CheckIcon, Heart, Star } from 'lucide-react'
import { createContext, useContext, useSyncExternalStore, type ComponentType, type ReactNode } from 'react'
import { maxSheetFieldLength, type SheetData, type SheetValue } from '../../shared/api/sheets'
import { cn } from '../../shared/lib/utils'

type SheetStore = { data: SheetData; set: (key: string, value: SheetValue | undefined) => void }
const SheetContext = createContext<SheetStore | null>(null)
export const SheetProvider = SheetContext.Provider

function useStore() {
  const store = useContext(SheetContext)
  if (!store) throw new Error('Sheet fields need a SheetProvider.')
  return store
}

export function useText(key: string) {
  const { data, set } = useStore()
  const value = data[key]
  return [typeof value === 'string' ? value : '', (next: string) => set(key, next || undefined)] as const
}
export function useNumber(key: string) {
  const { data, set } = useStore()
  const value = data[key]
  return [typeof value === 'number' ? value : 0, (next: number) => set(key, next || undefined)] as const
}
export function useFlag(key: string) {
  const { data, set } = useStore()
  return [data[key] === true, (next: boolean) => set(key, next || undefined)] as const
}

const persianDigits = (value: number | string) => String(value).replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]!)
export const fa = persianDigits

/** A writable line, like the dotted lines on the printed page. */
export function Line({ k, label, placeholder, fallback, className, multiline = false, rows = 3, inputMode, dir, maxLength = 400 }: {
  k: string; label?: string | undefined; placeholder?: string | undefined; fallback?: string; className?: string; multiline?: boolean; rows?: number
  inputMode?: 'text' | 'numeric' | 'decimal'; dir?: 'rtl' | 'ltr' | 'auto'; maxLength?: number
}) {
  const [stored, setValue] = useText(k)
  // Printed defaults (e.g. habit names) show until the member writes their own.
  const value = stored || (fallback ?? '')
  const field = multiline
    ? <textarea aria-label={label ?? placeholder} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} rows={rows} maxLength={Math.min(maxLength * 4, maxSheetFieldLength)} className="sheet-line sheet-area" dir={dir} />
    : <input aria-label={label ?? placeholder} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} maxLength={maxLength} inputMode={inputMode} className="sheet-line" dir={dir} />
  if (!label) return <span className={cn('sheet-field', className)}>{field}</span>
  return <label className={cn('sheet-field sheet-field-labelled', multiline && 'is-multiline', className)}><span className="sheet-label">{label}</span>{field}</label>
}

/** A small number box (counts, scores). */
export function NumberBox({ k, label, max = 9999, className }: { k: string; label: string; max?: number; className?: string }) {
  const [value, setValue] = useText(k)
  return <input aria-label={label} value={fa(value)} inputMode="numeric" placeholder="—" className={cn('sheet-number', className)}
    onChange={(e) => {
      const digits = e.target.value.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/\D/g, '').slice(0, String(max).length)
      setValue(digits && Number(digits) > max ? String(max) : digits)
    }} />
}

export function Tick({ k, label, children, className }: { k: string; label?: string; children?: ReactNode; className?: string }) {
  const [on, setOn] = useFlag(k)
  return (
    <label className={cn('sheet-tick', on && 'is-on', className)}>
      <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} aria-label={label} />
      <span className="sheet-tick-box" aria-hidden><CheckIcon size={13} strokeWidth={3} /></span>
      {children}
    </label>
  )
}

/** A checkbox with a writable line next to it. */
export function TickLine({ k, placeholder, fallback, label }: { k: string; placeholder?: string | undefined; fallback?: string; label?: string | undefined }) {
  return <div className="sheet-tick-line"><Tick k={`${k}.done`} label={`انجام شد: ${label ?? fallback ?? placeholder ?? ''}`.trim()} /><Line k={`${k}.text`} placeholder={placeholder} {...(fallback === undefined ? {} : { fallback })} /></div>
}

export function Stars({ k, max = 5, label = 'امتیاز' }: { k: string; max?: number; label?: string }) {
  const [value, setValue] = useNumber(k)
  return (
    <span className="sheet-stars" role="radiogroup" aria-label={label}>
      {Array.from({ length: max }, (_, index) => {
        const n = index + 1
        return <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${fa(n)} از ${fa(max)}`} className={cn(n <= value && 'is-on')} onClick={() => setValue(value === n ? 0 : n)}><Star size={15} /></button>
      })}
    </span>
  )
}

/** Tap the nth circle to fill up to n (pomodoros, water glasses, study hours). */
export function Counter({ k, count, label, renderLabel, className, shape = 'circle' }: {
  k: string; count: number; label: string; renderLabel?: (n: number) => ReactNode; className?: string; shape?: 'circle' | 'square' | 'cup'
}) {
  const [value, setValue] = useNumber(k)
  return (
    <span className={cn('sheet-counter', `is-${shape}`, className)} role="group" aria-label={label}>
      {Array.from({ length: count }, (_, index) => {
        const n = index + 1
        return <button key={n} type="button" aria-pressed={n <= value} aria-label={`${label}: ${fa(n)}`} className={cn(n <= value && 'is-on')} onClick={() => setValue(value === n ? n - 1 : n)}>{renderLabel?.(n)}</button>
      })}
    </span>
  )
}

/** A single dot that can be toggled on its own (habit chains). */
export function Dot({ k, label }: { k: string; label: string }) {
  const [on, setOn] = useFlag(k)
  return <button type="button" aria-pressed={on} aria-label={label} className={cn('sheet-dot', on && 'is-on')} onClick={() => setOn(!on)} />
}

export function Choice({ k, options, label }: { k: string; label: string; options: { value: string; label: string; icon?: ReactNode }[] }) {
  const [value, setValue] = useText(k)
  return (
    <span className="sheet-choice" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" role="radio" aria-checked={value === option.value} className={cn(value === option.value && 'is-on')} onClick={() => setValue(value === option.value ? '' : option.value)}>
          {option.icon}{option.label}
        </button>
      ))}
    </span>
  )
}

/** Section heading: Persian title with its English name, plus a small motto. */
export function Section({ number, title, english, motto, icon: Icon, children, className }: {
  number?: number; title: string; english?: string; motto?: string; icon?: ComponentType<{ size?: number }>; children: ReactNode; className?: string
}) {
  return (
    <section className={cn('sheet-section', className)}>
      <header className="sheet-section-head">
        <h3>{Icon && <Icon size={17} />}{number !== undefined && `${fa(number)}. `}{title}{english && <span dir="ltr"> ({english})</span>}</h3>
        {motto && <p dir="ltr">{motto}</p>}
      </header>
      {children}
    </section>
  )
}

/** A rounded box with a tinted header strip, like the printed panels. */
export function Panel({ title, tone = 'pink', children, className }: { title?: ReactNode; tone?: 'pink' | 'green'; children: ReactNode; className?: string }) {
  return (
    <div className={cn('sheet-panel', className)} data-tone={tone}>
      {title && <div className="sheet-panel-head">{title}</div>}
      <div className="sheet-panel-body">{children}</div>
    </div>
  )
}

/** A heart that fills in when the goal is reached (monthly goals). */
export function HeartTick({ k, label, tone = 'pink' }: { k: string; label: string; tone?: 'pink' | 'green' }) {
  const [on, setOn] = useFlag(k)
  return <button type="button" aria-pressed={on} aria-label={label} className={cn('sheet-heart', on && 'is-on')} data-tone={tone} onClick={() => setOn(!on)}><Heart size={20} /></button>
}

/** One of the bee, heart and flower stickers from the printed sheets. */
export function Sticker({ name, className, size = 28 }: { name: string; className?: string; size?: number }) {
  return <img src={`/images/study-stickers/${name}.webp`} alt="" width={size} height={size} loading="lazy" decoding="async" draggable={false} className={cn('sheet-sticker', className)} />
}

const phoneQuery = '(max-width: 899px)'
/** Phones get their own layouts for the widest tables. */
export function useIsPhone() {
  return useSyncExternalStore(
    (listener) => { const query = window.matchMedia(phoneQuery); query.addEventListener('change', listener); return () => query.removeEventListener('change', listener) },
    () => window.matchMedia(phoneQuery).matches,
    () => false,
  )
}
