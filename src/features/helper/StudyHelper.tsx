import * as Dialog from '@radix-ui/react-dialog'
import { ArrowLeft, BookOpen, CalendarDays, ChevronLeft, MessageCircle, Minimize2, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { appRoutes } from '../../app/navigation/routes'
import { Button } from '../../components/ui/button'
import { guidanceFor, studyTips } from './guidance'
import HelperCharacter from './HelperCharacter'
import './study-helper.css'

const compactKey = 'sweet-study-helper-compact'

function readCompact() {
  try { return localStorage.getItem(compactKey) === 'true' } catch { return false }
}

export default function StudyHelper({ inline = false }: { inline?: boolean }) {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [compact, setCompact] = useState(readCompact)
  const [tipIndex, setTipIndex] = useState<number | null>(null)
  const [greeting, setGreeting] = useState(0)
  const guidance = guidanceFor(pathname)
  const tip = tipIndex === null ? null : studyTips[tipIndex]

  function changeCompact(value: boolean) {
    setCompact(value)
    try { localStorage.setItem(compactKey, String(value)) } catch { /* Still works when storage is unavailable. */ }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen} modal={false}>
      <Dialog.Trigger asChild>
        {inline ? (
          <Button type="button" variant="outline" className="min-h-11 gap-1.5 rounded-full bg-card px-3 text-xs" aria-label="باز کردن راهنمای عسل">
            <MessageCircle className="size-4 text-primary" aria-hidden="true" />
            راهنمای عسل
          </Button>
        ) : <button
          type="button"
          className={`study-helper-position z-40 flex cursor-pointer flex-col items-center rounded-2xl focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:invisible ${compact ? 'size-12 justify-center border border-border bg-card text-primary shadow-lg' : 'w-20 sm:w-24'} transition-transform active:scale-95`}
          aria-label="باز کردن راهنمای عسل"
          title="راهنمای عسل"
        >
          {compact ? <MessageCircle size={22} aria-hidden="true" /> : (
            <>
              <HelperCharacter className="size-20 sm:size-28 lg:size-32" />
              <span className="rounded-full border border-border bg-card px-2 py-1 text-[10px] font-bold text-foreground shadow-sm">راهنمای عسل</span>
            </>
          )}
        </button>}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Content dir="rtl" className="study-helper-panel study-helper-position overflow-y-auto overscroll-contain rounded-3xl border border-border bg-card text-card-foreground shadow-xl outline-none">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="text-xs font-bold text-muted-foreground">همراه کوچیکِ مطالعه‌ات</span>
            <div className="flex items-center">
              {!inline && !compact && (
                <button type="button" className="grid size-11 place-items-center rounded-xl text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring" aria-label="کوچک کردن راهنما" title="کوچک کردن راهنما" onClick={() => { changeCompact(true); setOpen(false) }}>
                  <Minimize2 size={17} aria-hidden="true" />
                </button>
              )}
              <Dialog.Close className="grid size-11 place-items-center rounded-xl text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring" aria-label="بستن راهنمای عسل">
                <X size={19} aria-hidden="true" />
              </Dialog.Close>
            </div>
          </div>

          <div className="p-5">
            <div className="mb-5 flex items-center gap-3">
              <button
                type="button"
                className="grid size-24 shrink-0 cursor-pointer place-items-center rounded-3xl bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="عسل؛ پخش دوباره‌ی دست تکان دادن و چشمک"
                title="بزن تا عسل بهت سلام کنه"
                onClick={() => setGreeting((current) => current + 1)}
              >
                <HelperCharacter key={greeting} className="size-24" play />
              </button>
              <div>
                <Dialog.Title className="text-xl font-bold">سلام، من عسلم!</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm leading-7 text-muted-foreground">برای پیدا کردن قدم بعدی، کنارت هستم.</Dialog.Description>
              </div>
            </div>

            <div className="rounded-2xl bg-secondary/60 p-4" aria-live="polite" aria-atomic="true">
              <h2 className="text-sm font-bold">{tip?.title ?? guidance.title}</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{tip?.body ?? guidance.body}</p>
            </div>

            {tip ? (
              <button type="button" className="mt-3 min-h-11 text-sm font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setTipIndex(null)}>راهنمای همین صفحه</button>
            ) : (
              <Button asChild className="mt-4 min-h-11 w-full rounded-xl">
                <Link to={guidance.to} onClick={() => setOpen(false)}>{guidance.label}<ArrowLeft size={16} aria-hidden="true" /></Link>
              </Button>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button asChild variant="outline" className="min-h-11 rounded-xl">
                <Link to={appRoutes.planner} onClick={() => setOpen(false)}><CalendarDays aria-hidden="true" />پلنر من</Link>
              </Button>
              <Button asChild variant="outline" className="min-h-11 rounded-xl">
                <Link to={appRoutes.learning} onClick={() => setOpen(false)}><BookOpen aria-hidden="true" />تمرین و یادگیری</Link>
              </Button>
            </div>

            <button type="button" className="mt-3 flex min-h-11 w-full items-center justify-between rounded-xl px-2 text-sm text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setTipIndex((current) => current === null ? 0 : (current + 1) % studyTips.length)}>
              {tip ? 'یک نکته‌ی دیگه' : 'یک نکته برای بهتر درس خوندن'}<ChevronLeft size={16} aria-hidden="true" />
            </button>
            {!inline && compact && <button type="button" className="mt-1 min-h-11 w-full text-xs text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring" onClick={() => { changeCompact(false); setOpen(false) }}>نمایش دوباره‌ی شخصیت عسل</button>}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
