import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, Flower2, LoaderCircle, Sparkles } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { auth } from '../../app/auth'
import { queryKeys } from '../../app/session'
import { errorMessage } from '../../shared/api/http'
import { cn } from '../../shared/lib/utils'
import { AmbientBackground } from '../../components/AppShell'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'

type Mode = 'sign-in' | 'sign-up'

export default function AuthScreen({ onShowIntro }: { onShowIntro: () => void }) {
  const client = useQueryClient()
  const [mode, setMode] = useState<Mode>('sign-in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const submit = useMutation({
    mutationFn: () => (mode === 'sign-in' ? auth.signIn(email.trim(), password) : auth.signUp(name.trim(), email.trim(), password)),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.session }),
  })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    submit.mutate()
  }

  return (
    <main dir="rtl" className="relative grid min-h-dvh place-items-center px-4 py-10 text-foreground">
      <AmbientBackground />
      <div className="rise w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="grid size-16 place-items-center rounded-3xl bg-[image:var(--primary-gradient)] text-primary-foreground shadow-2xl shadow-primary/40 motion-safe:animate-[breathe_5s_ease-in-out_infinite]">
            <Flower2 size={30} />
          </span>
          <h1 className="text-3xl font-black tracking-tight">
            <span className="text-gradient">Sweet</span> Study Club
          </h1>
          <p className="max-w-xs text-sm leading-7 text-muted-foreground">
            اتاق مطالعه‌ی آرام تو؛ با تایمر، پلنر و دوست‌هایی که کنارت درس می‌خوانند.
          </p>
        </div>

        <form onSubmit={onSubmit} className="glass rounded-[2rem] p-6 sm:p-8">
          <div className="mb-6 grid grid-cols-2 rounded-2xl bg-muted/70 p-1 text-sm font-bold">
            {(['sign-in', 'sign-up'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={cn(
                  'rounded-xl py-2.5 transition-all',
                  mode === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {value === 'sign-in' ? 'ورود' : 'ساخت حساب'}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            {mode === 'sign-up' && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="auth-name">اسمت</Label>
                <Input id="auth-name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً سارا" autoComplete="nickname" />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="auth-email">ایمیل</Label>
              <Input id="auth-email" required type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="auth-password">رمز عبور</Label>
              <div className="relative">
                <Input
                  id="auth-password"
                  required
                  minLength={10}
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                  className="pl-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'پنهان کردن رمز' : 'نمایش رمز'}
                  className="absolute inset-y-0 left-2 grid w-8 place-items-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {mode === 'sign-up' && <p className="text-xs text-muted-foreground">حداقل ۱۰ کاراکتر.</p>}
            </div>

            {submit.isError && (
              <p role="alert" className="rounded-2xl bg-[var(--destructive-soft)] px-4 py-3 text-sm text-[var(--destructive-text)]">
                {errorMessage(submit.error)}
              </p>
            )}

            <Button type="submit" size="lg" disabled={submit.isPending} className="mt-2 h-12 rounded-2xl bg-[image:var(--primary-gradient)] text-base font-black shadow-lg shadow-primary/30">
              {submit.isPending ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
              {mode === 'sign-in' ? 'ورود به اتاق مطالعه' : 'ساخت حساب و شروع'}
            </Button>
          </div>
        </form>

        <button type="button" onClick={onShowIntro} className="mx-auto mt-6 block text-sm font-bold text-muted-foreground hover:text-primary">
          Sweet Study Club چیست؟
        </button>
      </div>
    </main>
  )
}
