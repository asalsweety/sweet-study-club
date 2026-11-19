import * as Dialog from '@radix-ui/react-dialog'
import { BookOpen, CalendarDays, ChevronLeft, Maximize2, MessageCircle, Minimize2, Sparkles, Timer, UsersRound, X } from 'lucide-react'
import { useId, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { appRoutes } from '../../app/navigation/routes'
import { Button } from '../../components/ui/button'
import { guidanceFor, studyTips } from './guidance'
import HelperCharacter from './HelperCharacter'
import './study-helper.css'

const compactKey = 'sweet-study-helper-compact'

const topics = [
  { title: 'چطور پومودورو و اتاق پیکسلی را روشن کنم؟', icon: Timer,
    body: 'پومودورو را انتخاب کن، درس و ریتم تمرکز و استراحتت را مشخص کن و شروع را بزن. اگر دوست داری چیبی‌ات همراهت درس بخواند، وارد اتاق پیکسلی شو.',
    links: [['شروع پومودورو', '/?start=pomodoro'], ['اتاق پیکسلی', '/focus?room=pixel']] },
  { title: 'تغییر تم، حالت تمرکز کامل و صدای باران', icon: Sparkles,
    body: 'از تنظیمات پروفایل می‌توانی رنگ و پوستۀ باشگاه را عوض کنی. پیش از شروع جلسه، «حالت تمرکز کامل» را روشن کن. در اتاق تمرکز هم از «صدای محیط» باران را انتخاب کن.',
    links: [['تنظیمات پروفایل', appRoutes.profile + '?section=settings'], ['تنظیمات جلسه', '/?start=1']] },
  { title: 'دعوت از دوستان و رقابت در لیگ هفتگی', icon: UsersRound,
    body: 'در صفحۀ دوستان می‌توانی کد دوستی‌ات را بفرستی یا دوستت را اضافه کنی. در جدول رتبه‌بندی، بازۀ هفتگی را انتخاب کن تا زمان مطالعه‌ات را با دوستانت مقایسه کنی.',
    links: [['دوستان من', appRoutes.friends], ['رتبه‌بندی هفتگی', appRoutes.ranking]] },
] as const

function readCompact() {
  try { return localStorage.getItem(compactKey) === 'true' } catch { return false }
}

export default function StudyHelper({ open, onOpenChange }: { open: boolean; onOpenChange: (value: boolean) => void }) {
  const { pathname } = useLocation()
  const [compact, setCompact] = useState(readCompact)
  const [selected, setSelected] = useState<number | null>(null)
  const panelId = useId()
  const [tipIndex, setTipIndex] = useState<number | null>(null)
  const [greeting, setGreeting] = useState<number | null>(0)
  const guidance = guidanceFor(pathname)
  const tip = tipIndex === null ? null : studyTips[tipIndex]

  function changeOpen(value: boolean) {
    if (!value) { setSelected(null); setTipIndex(null); setGreeting(0) }
    onOpenChange(value)
  }

  function changeCompact(value: boolean) {
    setCompact(value)
    try { localStorage.setItem(compactKey, String(value)) } catch { /* Still works when storage is unavailable. */ }
  }

  return (
    <Dialog.Root open={open} onOpenChange={changeOpen} modal={false}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={`study-helper-position z-40 flex cursor-pointer flex-col items-center rounded-2xl focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:invisible ${!compact && pathname === appRoutes.friends ? 'friends-helper' : ''} ${compact ? 'size-12 justify-center border border-border bg-card text-primary shadow-lg' : 'w-20 sm:w-24'} transition-transform active:scale-95`}
          aria-label="باز کردن راهنمای عسل"
          title="راهنمای عسل"
        >
          {compact ? <>
            <img src="/images/figma/today-helper-light.webp" alt="" className="size-7 object-contain dark:hidden" />
            <img src="/images/figma/today-helper-dark.webp" alt="" className="hidden size-7 object-contain dark:block" />
          </> : (
            <>
              <HelperCharacter className="size-20 sm:size-28 lg:size-32" />
              <span className="rounded-full border border-border bg-card px-2 py-1 text-[10px] font-bold text-foreground shadow-sm">راهنمای عسل</span>
            </>
          )}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Content dir="rtl" className="study-helper-panel study-helper-position overflow-y-auto overscroll-contain rounded-3xl border border-border bg-card text-card-foreground shadow-xl outline-none">
          <div className="p-5 sm:p-6">
            <div className="mb-2.5 flex items-center gap-3">
              <button
                type="button"
                className="grid h-16 w-[60px] shrink-0 place-items-center rounded-xl focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="عسل؛ پخش دوباره‌ی دست تکان دادن و چشمک"
                onClick={() => setGreeting(current => (current ?? 0) + 1)}
                onAnimationEnd={event => { if (event.animationName === 'asal-greeting') setGreeting(null) }}
              >
                <img src="/images/figma/helper-asal.webp" alt="" width={60} height={64} className={greeting === null ? undefined : 'hidden motion-reduce:block'} />
                {greeting !== null && <span className="motion-reduce:hidden"><HelperCharacter key={greeting} className="h-16 w-[60px]" play /></span>}
              </button>
              <div className="min-w-0 flex-1">
                <Dialog.Title className="text-base font-bold"><span className="font-sans">سلام، من عسلم!</span></Dialog.Title>
                <Dialog.Description className="mt-1 text-[11px] font-semibold text-[var(--primary-ink)]">دستیار و راهنمای باشگاه مطالعه</Dialog.Description>
              </div>
              <button
                type="button" className="grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
                aria-label={compact ? 'نمایش دوباره‌ی شخصیت عسل' : 'کوچک کردن راهنما'}
                title={compact ? 'نمایش دوباره‌ی شخصیت عسل' : 'کوچک کردن راهنما'}
                onClick={() => { changeCompact(!compact); changeOpen(false) }}
              >{compact ? <Maximize2 size={16} /> : <Minimize2 size={16} />}</button>
              <Dialog.Close className="-me-2 grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted" aria-label="بستن راهنمای عسل"><X size={16} /></Dialog.Close>
            </div>

            <div className="grid gap-3">
              <section className="rounded-2xl bg-secondary/60 p-4">
                <div aria-live="polite" aria-atomic="true">
                  <h2 className="text-sm font-bold">{tip?.title ?? guidance.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{tip?.body ?? guidance.body}</p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-bold">
                  {tip ? <button className="min-h-11 underline" onClick={() => setTipIndex(null)}>راهنمای همین صفحه</button>
                    : <Link className="inline-flex min-h-11 items-center underline" to={guidance.to} onClick={() => changeOpen(false)}>{guidance.label}</Link>}
                  <button className="min-h-11 underline" onClick={() => setTipIndex(current => current === null ? 0 : (current + 1) % studyTips.length)}>{tip ? 'یک نکته‌ی دیگه' : 'یک نکته برای بهتر درس خوندن'}</button>
                </div>
              </section>
              <Button asChild className="min-h-11"><Link to={appRoutes.learning + '?tab=assistant'} onClick={() => changeOpen(false)}><MessageCircle size={16} />پرسش از دستیار مطالعه</Link></Button>
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline" className="min-h-11"><Link to={appRoutes.planner} onClick={() => changeOpen(false)}><CalendarDays size={16} />پلنر من</Link></Button>
                <Button asChild variant="outline" className="min-h-11"><Link to={appRoutes.learning} onClick={() => changeOpen(false)}><BookOpen size={16} />تمرین و یادگیری</Link></Button>
              </div>
              {topics.map(({ title, icon: Icon, body, links }, index) => <div key={title}>
                <button className="flex min-h-11 w-full items-center gap-2 rounded-xl bg-muted px-3 text-start sm:min-h-[43px]" type="button" aria-expanded={selected === index} aria-controls={`${panelId}-${index}`} onClick={() => setSelected(selected === index ? null : index)}>
                  <Icon size={16} className="shrink-0 text-[var(--primary-ink)]" />
                  <span className="flex-1 text-xs font-bold">{title}</span><ChevronLeft size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
                <div id={`${panelId}-${index}`} hidden={selected !== index} className="px-2 pt-3 text-sm leading-7">
                  <p>{body}</p>
                  <div className="flex flex-wrap gap-3">{links.map(([label, to]) => <Link className="font-bold underline" key={to} to={to} onClick={() => changeOpen(false)}>{label}</Link>)}</div>
                </div>
              </div>)}
              <Button asChild variant="secondary" className="min-h-11 rounded-xl text-xs font-bold shadow-none"><Link to="/welcome?tour=1" onClick={() => changeOpen(false)}><Sparkles size={16} />شروع تور آشنایی دوباره</Link></Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
