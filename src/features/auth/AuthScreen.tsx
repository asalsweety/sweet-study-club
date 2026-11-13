import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BookOpen, CalendarDays, Eye, EyeOff, Flower2, LoaderCircle, Sparkles, Timer, UsersRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { auth } from '../../app/auth'
import { replaceSession } from '../../app/session'
import { ApiClientError } from '../../shared/api/api-client-error'
import { errorMessage } from '../../shared/api/http'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { cn } from '../../shared/lib/utils'

type Mode = 'sign-in' | 'sign-up'

/** 0–4: length, mixed case, digits, and symbols each add a step. */
function passwordStrength(password: string) {
  if (!password) return 0
  let score = password.length >= 10 ? 1 : 0
  if (password.length >= 14) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 0.5
  if (/[^\w\s]/.test(password)) score += 0.5
  return Math.min(4, Math.floor(score))
}
const strengthLabels = ['خیلی کوتاه', 'قابل قبول', 'خوب', 'قوی', 'عالی']

const features = [
  { icon: Timer, title: 'تمرکز، با ریتم خودت', detail: 'مطالعهٔ آزاد، پومودورو و اتاق تمرکز' },
  { icon: CalendarDays, title: 'یک روز قابل انجام', detail: 'برنامه‌ریزی و یادآوری کارها' },
  { icon: BookOpen, title: 'یادگیری ماندگار', detail: 'بانک سؤال، مرور و دیدن پیشرفت' },
  { icon: UsersRound, title: 'کنار هم، بهتر', detail: 'مطالعهٔ زنده و لیگ هفتگی دوستان' },
]

export default function AuthScreen() {
  const client = useQueryClient()
  const [mode, setMode] = useState<Mode>('sign-in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [created, setCreated] = useState(false)
  const [shake, setShake] = useState(0)
  const submit = useMutation({
    mutationFn: async () => {
      if (mode === 'sign-in') await auth.signIn(email.trim(), password)
      else {
        await auth.createAccount(name.trim(), email.trim(), password)
        setCreated(true)
        // If sign-in fails after creation, retry sign-in without creating again.
        setMode('sign-in')
        await auth.signIn(email.trim(), password)
      }
      const session = await auth.session()
      if (!session) throw new ApiClientError('ورود تأیید نشد. اجازهٔ ذخیرهٔ کوکی را بررسی کن و دوباره وارد شو.', { code: 'SESSION_MISSING' })
      return session
    },
    onSuccess: (session) => replaceSession(client, session),
    onError: () => setShake((count) => count + 1),
  })
  const changeMode = (next: Mode) => {
    if (next === mode) return
    setMode(next)
    setPassword('')
    setShowPassword(false)
    setCreated(false)
    submit.reset()
  }
  const onSubmit = (event: FormEvent) => { event.preventDefault(); if (!submit.isPending) submit.mutate() }
  const strength = passwordStrength(password)

  return <main dir="rtl" className="auth-layout">
    <section className="auth-form-side">
      <a href="/" className="brand-lockup [animation:fade-in_600ms_ease-out_backwards]" aria-label="Sweet Study Club">
        <span className="brand-mark shadow-[var(--glow-primary)]"><Flower2 size={24} /></span>
        <span dir="ltr">sweet study<span className="block text-[10px] font-medium tracking-[0.24em] text-muted-foreground">A LITTLE EVERY DAY</span></span>
      </a>
      <div className="auth-mobile-art" aria-hidden>
        <img src="/images/onboarding-study-room.webp" alt="" fetchPriority="high" />
      </div>
      <div className="auth-form-wrap stagger">
        <p className="eyebrow flex items-center gap-2"><Sparkles size={13} />فضای کوچک تو برای پیشرفت‌های بزرگ</p>
        <h1 key={mode} className="mt-4 text-3xl font-extrabold leading-relaxed tracking-tight [animation:rise-in_520ms_var(--ease-spring)_backwards] sm:text-4xl">{mode === 'sign-in' ? 'خوش برگشتی.' : 'از همین‌جا شروع کن.'}</h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">{mode === 'sign-in' ? 'وارد حسابت شو؛ یک قدم دیگر به هدفت نزدیک‌تر.' : 'یک حساب برای مطالعه، برنامه‌ریزی و یادگیری.'}</p>

        <div role="tablist" aria-label="نوع ورود" className="segmented mt-7" data-active={mode === 'sign-in' ? 0 : 1}>
          <span aria-hidden className="segmented-thumb" />
          <button type="button" role="tab" aria-selected={mode === 'sign-in'} disabled={submit.isPending} onClick={() => changeMode('sign-in')}>ورود</button>
          <button type="button" role="tab" aria-selected={mode === 'sign-up'} disabled={submit.isPending} onClick={() => changeMode('sign-up')}>ساخت حساب</button>
        </div>

        <form key={`${mode}-${shake}`} onSubmit={onSubmit} className={cn('mt-6 grid gap-5', shake > 0 && 'shake')} aria-label={mode === 'sign-in' ? 'ورود به حساب' : 'ساخت حساب'} aria-busy={submit.isPending}>
          <fieldset disabled={submit.isPending} className="grid min-w-0 gap-5">
            {mode === 'sign-up' && <div className="grid gap-2 [animation:rise-in_420ms_var(--ease-spring)_backwards]"><Label htmlFor="auth-name">نام نمایشی</Label><Input id="auth-name" required minLength={2} maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="دوست داری چه صدایت کنیم؟" autoComplete="nickname" enterKeyHint="next" /></div>}
            <div className="grid gap-2"><Label htmlFor="auth-email">ایمیل</Label><Input id="auth-email" required type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" /></div>
            <div className="grid gap-2">
              <Label htmlFor="auth-password">رمز عبور</Label>
              <div className="relative"><Input id="auth-password" required minLength={mode === 'sign-up' ? 10 : undefined} maxLength={128} type={showPassword ? 'text' : 'password'} dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} aria-describedby={mode === 'sign-up' ? 'password-hint' : undefined} enterKeyHint="go" className="pl-12" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'پنهان کردن رمز' : 'نمایش رمز'} aria-pressed={showPassword} className="absolute inset-y-0 left-0 grid w-12 place-items-center rounded-xl text-muted-foreground transition-transform active:scale-90">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
              {mode === 'sign-up' && <div id="password-hint" className="grid gap-2">
                <div className="strength-meter" data-strength={strength} aria-hidden>{[1, 2, 3, 4].map((step) => <span key={step} data-on={strength >= step ? '' : undefined} />)}</div>
                <p className="flex justify-between text-xs leading-6 text-muted-foreground"><span>بین ۱۰ تا ۱۲۸ کاراکتر؛ ترکیب حرف، عدد و نماد بهتر است.</span>{password && <span className="font-bold text-foreground">{strengthLabels[strength]}</span>}</p>
              </div>}
            </div>
          </fieldset>
          {created && submit.isError && <p role="status" className="rounded-xl bg-secondary p-3 text-sm leading-7">حسابت ساخته شد. برای ادامه، با همین ایمیل و رمز وارد شو.</p>}
          {submit.isError && <p role="alert" className="rounded-xl bg-[var(--destructive-soft)] p-3 text-sm leading-7 text-[var(--destructive-text)] [animation:rise-in_360ms_var(--ease-spring)_backwards]">{errorMessage(submit.error)}</p>}
          <Button size="lg" disabled={submit.isPending || (mode === 'sign-up' && name.trim().length < 2)} type="submit" className="h-13 w-full rounded-2xl text-base">{submit.isPending ? <LoaderCircle className="animate-spin" /> : null}{submit.isPending ? (mode === 'sign-in' ? 'در حال ورود…' : 'در حال ساخت حساب…') : mode === 'sign-in' ? 'ورود به فضای مطالعه' : 'ساخت حساب و شروع'}{!submit.isPending && <ArrowLeft />}</Button>
        </form>
      </div>
      <p className="mt-10 text-xs text-muted-foreground">هر روز، کمی بهتر از دیروز.</p>
    </section>
    <aside className="auth-story" aria-label="دربارهٔ فضای مطالعه">
      <div className="auth-art-frame"><img src="/images/onboarding-study-room.webp" alt="یک میز مطالعهٔ آرام کنار پنجره" className="auth-art" fetchPriority="high" /></div>
      <div className="auth-story-content">
        <span className="eyebrow">SWEET STUDY CLUB</span>
        <h2 className="mt-4 text-3xl font-extrabold leading-relaxed tracking-tight xl:text-4xl">برای رؤیاهات،<br />هر روز جا باز کن.</h2>
        <p className="mt-4 max-w-sm text-sm leading-8 text-muted-foreground">یک گوشهٔ آرام برای تمرکز. یک برنامهٔ روشن برای امروز. و همراه‌هایی برای ادامهٔ راه.</p>
        <div className="stagger mt-8 grid gap-3 xl:grid-cols-2">{features.map(({ icon: Icon, title, detail }) => <div key={title} className="auth-feature"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--glow-primary)]"><Icon size={19} /></span><div><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></div></div>)}</div>
      </div>
    </aside>
  </main>
}
