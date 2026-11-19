import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, CornerDownLeft, MessageCircle, Maximize2, Play, Search, Settings2, Sparkles, UserPlus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ComponentType, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../app/api'
import { queryKeys } from '../app/session'
import { accountNavigation, adminNavigation, getPrimaryNavigation, secondaryNavigation } from '../app/navigation/items'
import { appRoutes } from '../app/navigation/routes'
import { haptic } from '../shared/lib/confetti'

type Command = {
  id: string
  group: string
  label: string
  hint?: string
  keywords: string
  icon: ComponentType<{ size?: number }>
  run: () => void
}

/** Folds Arabic letter forms and Persian digits so typing either way matches. */
function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ۀ/g, 'ه')
    .replace(/[ً-ٟ‌]/g, '')
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .trim()
}

const navigationKeywords: Record<string, string> = {
  [appRoutes.home]: 'home today dashboard خانه داشبورد',
  [appRoutes.planner]: 'planner plan calendar برنامه تقویم پلنر',
  [appRoutes.learning]: 'learn exam questions test آزمون تست سوال',
  [appRoutes.progress]: 'progress stats chart آمار نمودار گزارش',
  [appRoutes.friends]: 'friends live social دوست زنده',
  [appRoutes.ranking]: 'league ranking leaderboard رتبه جدول',
  [appRoutes.shop]: 'shop store plus خرید فروشگاه',
  [appRoutes.profile]: 'account profile settings پروفایل تنظیمات',
  [appRoutes.admin]: 'admin studio مدیریت',
}

const quickActions = 'اقدام‌های سریع'

export default function CommandPalette({ open, onOpenChange, isAdmin, displayName, onOpenHelper }: { onOpenHelper: () => void; open: boolean; onOpenChange: (open: boolean) => void; isAdmin: boolean; displayName: string }) {
  const navigate = useNavigate()
  const hasTimer = Boolean(useQuery({ queryKey: queryKeys.timer, queryFn: api.timer.get }).data)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  // Ctrl/⌘+K anywhere, or "/" when the person is not typing in a field.
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target?.closest('input, textarea, select, [contenteditable="true"]')
      if ((event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        onOpenChange(!open)
      } else if (event.key === '/' && !typing && !open) {
        event.preventDefault()
        onOpenChange(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  const commands = useMemo<Command[]>(() => {
    const go = (path: string) => () => navigate(path, { viewTransition: true })
    const pages = [...getPrimaryNavigation(displayName), ...secondaryNavigation, accountNavigation, ...(isAdmin ? [adminNavigation] : [])]
    return [
      { id: 'start', group: quickActions, label: 'شروع جلسۀ مطالعه', hint: 'آزاد، پومودورو یا پارت‌های روزانه', keywords: 'start study timer شروع تایمر مطالعه', icon: Play, run: go(`${appRoutes.home}?start=1`) },
      { id: 'pomodoro', group: quickActions, label: hasTimer ? 'بازگشت به جلسۀ در حال اجرا' : 'شروع جلسۀ پومودورو (۲۵ دقیقه)', keywords: 'start study timer pomodoro 25 تایمر مطالعه', icon: Play, run: go(hasTimer ? appRoutes.home : `${appRoutes.home}?start=pomodoro`) },
      { id: 'focus', group: quickActions, label: 'ورود به اتاق تمرکز پیکسلی', keywords: 'focus room fullscreen pixel تمرکز اتاق', icon: Maximize2, run: go(`${appRoutes.focus}?room=pixel`) },
      { id: 'task', group: quickActions, label: 'افزودن کار جدید به برنامۀ امروز', keywords: 'planner add task today کار وظیفه برنامه تقویم', icon: CalendarDays, run: go(`${appRoutes.planner}?add=1`) },
      { id: 'helper', group: quickActions, label: 'باز کردن راهنمای عسل', keywords: 'help guide راهنما عسل', icon: MessageCircle, run: onOpenHelper },
      { id: 'study-assistant', group: 'کارهای سریع', label: 'پرسش از دستیار مطالعه', keywords: 'AI assistant ask chat دستیار هوش مصنوعی عسل تحلیل آزمون', icon: Sparkles, run: go(`${appRoutes.learning}?tab=assistant`) },
      { id: 'invite', group: 'کارهای سریع', label: 'دعوت یک دوست', keywords: 'invite friend code دعوت دوست', icon: UserPlus, run: go(appRoutes.friends) },
      { id: 'settings', group: 'کارهای سریع', label: 'تنظیمات و هدف روزانه', keywords: 'settings goal konkur تنظیمات هدف کنکور', icon: Settings2, run: go(`${appRoutes.profile}?section=settings`) },
      ...pages.map(({ path, label, icon }) => ({ id: `page-${path}`, group: 'صفحه‌ها', label, keywords: navigationKeywords[path] ?? '', icon, run: go(path) })),
    ]
  }, [navigate, isAdmin, displayName, hasTimer, onOpenHelper])

  const results = useMemo(() => {
    const available = hasTimer ? commands.filter(command => command.id !== 'start') : commands
    const needle = normalize(query)
    if (!needle) return available
    return available.filter((command) => normalize(`${command.label} ${command.hint ?? ''} ${command.keywords}`).includes(needle))
  }, [commands, hasTimer, query])

  const choose = (command: Command | undefined) => {
    if (!command) return
    haptic(8)
    onOpenChange(false)
    // Let the panel start closing before running the selected action.
    window.setTimeout(command.run, 60)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((current) => (current + step + results.length) % Math.max(1, results.length))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      choose(results[active])
    }
  }

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  let lastGroup = ''
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) { setQuery(''); setActive(0) } }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay data-slot="dialog-overlay" className="fixed inset-0 z-50" />
        <DialogPrimitive.Content dir="rtl" className="palette-panel" aria-describedby={undefined} onOpenAutoFocus={() => { setQuery(''); setActive(0) }}>
          <DialogPrimitive.Title className="sr-only">جست‌وجو و فرمان‌ها</DialogPrimitive.Title>
          <div className="flex items-center gap-3 border-b border-border px-5 text-sm">
            <Search size={18} className="shrink-0 text-[var(--primary-ink)]" />
            <input
              autoFocus
              value={query}
              onChange={(event) => { setQuery(event.target.value); setActive(0) }}
              onKeyDown={onKeyDown}
              placeholder="جست‌وجو بین صفحات، شروع جلسه و فرمان‌ها..."
              aria-label="جست‌وجوی صفحه یا فرمان"
              role="combobox"
              aria-expanded
              aria-controls="palette-results"
              aria-activedescendant={results[active] ? `palette-${results[active].id}` : undefined}
              enterKeyHint="go"
              autoComplete="off"
              spellCheck={false}
              className="h-15 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground sm:block">ESC</kbd>
          </div>
          <div ref={listRef} id="palette-results" role="listbox" aria-label="نتیجه‌ها" className="palette-list">
            {results.length === 0 && <p className="px-4 py-10 text-center text-sm text-muted-foreground">چیزی پیدا نشد. واژۀ دیگری امتحان کن.</p>}
            {results.map((command, index) => {
              const header = command.group !== lastGroup ? command.group : null
              lastGroup = command.group
              const Icon = command.icon
              return (
                <div key={command.id}>
                  {header && <p className="pb-1.5 pt-3 text-[0.68rem] font-bold text-muted-foreground sm:pt-[25px]">{header}</p>}
                  <button
                    type="button"
                    id={`palette-${command.id}`}
                    role="option"
                    aria-selected={index === active}
                    className="palette-item"
                    onPointerMove={() => setActive(index)}
                    onClick={() => choose(command)}
                  >
                    <Icon size={16} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{command.label}</span>
                      {command.hint && <span className="block truncate text-xs text-muted-foreground">{command.hint}</span>}
                    </span>
                    <CornerDownLeft size={14} className="shrink-0 opacity-70" aria-hidden="true" />
                  </button>
                </div>
              )
            })}
          </div>
          <p className="hidden border-t border-border px-5 py-2 text-xs text-muted-foreground sm:block"><kbd dir="ltr">↑ ↓</kbd> حرکت بین فرمان‌ها · <kbd>Enter</kbd> انتخاب · <kbd>Esc</kbd> بستن</p>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
