import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useQuery } from '@tanstack/react-query'
import { CornerDownLeft, Maximize2, Moon, Palette, Play, Search, Settings2, Sun, UserPlus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ComponentType, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../app/api'
import { queryKeys } from '../app/session'
import { accountNavigation, adminNavigation, primaryNavigation, secondaryNavigation } from '../app/navigation/items'
import { appRoutes } from '../app/navigation/routes'
import { themePresetOptions } from '../features/theme/model'
import { useTheme } from '../features/theme/useTheme'
import { haptic } from '../shared/lib/confetti'
import { toast } from '../shared/lib/toast'

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

export default function CommandPalette({ open, onOpenChange, isAdmin }: { open: boolean; onOpenChange: (open: boolean) => void; isAdmin: boolean }) {
  const navigate = useNavigate()
  const theme = useTheme()
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
    const pages = [...primaryNavigation, ...secondaryNavigation, accountNavigation, ...(isAdmin ? [adminNavigation] : [])]
    return [
      { id: 'start', group: 'کارهای سریع', label: 'شروع جلسۀ مطالعه', hint: 'آزاد، پومودورو یا پارت‌های روزانه', keywords: 'start study timer pomodoro شروع تایمر مطالعه', icon: Play, run: () => navigate(`${appRoutes.home}?start=1`, { viewTransition: true }) },
      { id: 'focus', group: 'کارهای سریع', label: 'رفتن به اتاق تمرکز', hint: hasTimer ? 'تمام‌صفحه، با صدای محیطی' : 'اول یک جلسه شروع کن', keywords: 'focus room fullscreen تمرکز اتاق', icon: Maximize2, run: go(hasTimer ? appRoutes.focus : `${appRoutes.home}?start=1`) },
      { id: 'invite', group: 'کارهای سریع', label: 'دعوت یک دوست', keywords: 'invite friend code دعوت دوست', icon: UserPlus, run: go(appRoutes.friends) },
      { id: 'settings', group: 'کارهای سریع', label: 'تنظیمات و هدف روزانه', keywords: 'settings goal konkur تنظیمات هدف کنکور', icon: Settings2, run: go(`${appRoutes.profile}?section=settings`) },
      ...pages.map(({ path, label, icon }) => ({ id: `page-${path}`, group: 'صفحه‌ها', label, keywords: navigationKeywords[path] ?? '', icon, run: go(path) })),
      {
        id: 'mode', group: 'ظاهر', label: theme.mode === 'dark' ? 'حالت روشن' : 'حالت تاریک', keywords: 'dark light mode theme تاریک روشن شب', icon: theme.mode === 'dark' ? Sun : Moon,
        run: () => { theme.setMode(theme.mode === 'dark' ? 'light' : 'dark'); toast(theme.mode === 'dark' ? 'حالت روشن فعال شد' : 'حالت تاریک فعال شد', { icon: theme.mode === 'dark' ? '☀️' : '🌙', duration: 2400 }) },
      },
      ...themePresetOptions.map((option) => ({
        id: `theme-${option.value}`, group: 'ظاهر', label: `پوستۀ ${option.label}`, hint: option.description, keywords: `theme palette color پوسته رنگ ${option.value}`, icon: Palette,
        run: () => { theme.setPreset(option.value); toast(`پوستۀ ${option.label} انتخاب شد`, { icon: '🎨', duration: 2400 }) },
      })),
    ]
  }, [navigate, isAdmin, theme, hasTimer])

  const results = useMemo(() => {
    const needle = normalize(query)
    if (!needle) return commands
    return commands.filter((command) => normalize(`${command.label} ${command.hint ?? ''} ${command.keywords}`).includes(needle))
  }, [commands, query])

  const choose = (command: Command | undefined) => {
    if (!command) return
    haptic(8)
    onOpenChange(false)
    // Let the panel start closing before the route or theme changes.
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
        <DialogPrimitive.Content dir="rtl" className="palette-panel" aria-describedby={undefined}>
          <DialogPrimitive.Title className="sr-only">جست‌وجو و فرمان‌ها</DialogPrimitive.Title>
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search size={18} className="shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(event) => { setQuery(event.target.value); setActive(0) }}
              onKeyDown={onKeyDown}
              placeholder="کجا برویم؟ چه کار کنیم؟"
              aria-label="جست‌وجوی صفحه یا فرمان"
              role="combobox"
              aria-expanded
              aria-controls="palette-results"
              aria-activedescendant={results[active] ? `palette-${results[active].id}` : undefined}
              enterKeyHint="go"
              autoComplete="off"
              spellCheck={false}
              className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            <span className="hidden sm:inline-flex"><span className="kbd">Esc</span></span>
          </div>
          <div ref={listRef} id="palette-results" role="listbox" aria-label="نتیجه‌ها" className="palette-list">
            {results.length === 0 && <p className="px-4 py-10 text-center text-sm text-muted-foreground">چیزی پیدا نشد. واژۀ دیگری امتحان کن.</p>}
            {results.map((command, index) => {
              const header = command.group !== lastGroup ? command.group : null
              lastGroup = command.group
              const Icon = command.icon
              return (
                <div key={command.id}>
                  {header && <p className="px-3 pb-1.5 pt-3 text-[0.68rem] font-bold text-muted-foreground">{header}</p>}
                  <button
                    type="button"
                    id={`palette-${command.id}`}
                    role="option"
                    aria-selected={index === active}
                    className="palette-item"
                    onPointerMove={() => setActive(index)}
                    onClick={() => choose(command)}
                  >
                    <span className="palette-icon"><Icon size={16} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{command.label}</span>
                      {command.hint && <span className="block truncate text-xs text-muted-foreground">{command.hint}</span>}
                    </span>
                    {index === active && <CornerDownLeft size={15} className="hidden shrink-0 opacity-70 sm:block" />}
                  </button>
                </div>
              )
            })}
          </div>
          <div className="hidden items-center justify-between gap-4 border-t border-border px-4 py-2.5 text-[0.7rem] text-muted-foreground sm:flex">
            <span className="flex items-center gap-1.5"><span dir="ltr" className="flex gap-1"><span className="kbd">↑</span><span className="kbd">↓</span></span> جابه‌جایی</span>
            <span className="flex items-center gap-1.5"><span className="kbd">Enter</span> انتخاب</span>
            <span className="flex items-center gap-1.5"><span dir="ltr" className="flex gap-1"><span className="kbd">Ctrl</span><span className="kbd">K</span></span> باز و بسته</span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
