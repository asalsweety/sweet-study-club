import { useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  LogIn,
  Sparkles,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  demoReviewCredentials,
  demoReviewEnabled,
} from '../shared/config/demo-review'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type AuthProps = {
  onDemoLogin?: () => void
}

export default function Auth({ onDemoLogin }: AuthProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [message, setMessage] = useState('')
  const [messageVariant, setMessageVariant] = useState<
    'default' | 'destructive' | 'success'
  >('default')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()

    setLoading(true)
    setMessage('')
    setMessageVariant('destructive')

    if (
      demoReviewEnabled &&
      email === demoReviewCredentials.email &&
      password === demoReviewCredentials.password
    ) {
      onDemoLogin?.()
      setLoading(false)
      return
    }

    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) {
          setMessage(error.message)
        } else {
          setMessage('حساب ساخته شد. حالا وارد شوید.')
          setMessageVariant('success')
          setIsSignup(false)
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          setMessage(error.message)
        }
      }
    } catch {
      setMessage('سرویس ورود در دسترس نیست. کمی بعد دوباره تلاش کنید.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-[1fr_1.05fr]" dir="rtl">
      <section className="flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <Card className="w-full max-w-md border-border/70 shadow-xl">
          <CardHeader className="space-y-4 text-center">
            <Badge variant="secondary" className="mx-auto gap-2">
              <Sparkles />
              Sweet Study Club
            </Badge>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-black sm:text-3xl">
                {isSignup ? 'ساخت حساب تازه' : 'خوش برگشتی'}
              </CardTitle>
              <CardDescription className="leading-6">
                {isSignup
                  ? 'حسابت را بساز و اولین جلسه مطالعه را شروع کن.'
                  : 'وارد شو تا ادامه مسیرت را از همان‌جا برداری.'}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-2">
                <Label htmlFor="auth-email">ایمیل</Label>
                <Input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  dir="ltr"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="auth-password">رمز عبور</Label>
                  {!isSignup && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto px-0 text-xs"
                      onClick={() =>
                        {
                          setMessageVariant('default')
                          setMessage(
                            'بازیابی رمز پس از اتصال سرویس ایمیل امن فعال می‌شود.',
                          )
                        }
                      }
                    >
                      رمز را فراموش کردم
                    </Button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                    placeholder="حداقل ۱۰ نویسه"
                    dir="ltr"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={10}
                    className="pl-11"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute left-1 top-1 text-muted-foreground"
                    aria-label={showPassword ? 'پنهان کردن رمز' : 'نمایش رمز'}
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </div>

              <Button className="w-full" size="lg" disabled={loading}>
                <LogIn />
                {loading
                  ? 'در حال بررسی...'
                  : isSignup
                    ? 'ساخت حساب'
                    : 'ورود به برنامه'}
              </Button>
            </form>

            <Button
              className="w-full"
              variant="outline"
              onClick={() => {
                setIsSignup((signup) => !signup)
                setMessage('')
              }}
            >
              {isSignup ? 'برگشت به ورود' : 'حساب ندارم'}
              <ArrowLeft />
            </Button>

            {demoReviewEnabled && onDemoLogin && !isSignup && (
              <div className="rounded-xl border border-dashed bg-muted/40 p-4 text-center">
                <p className="mb-3 text-xs leading-5 text-muted-foreground">
                  برای بازبینی محلی، بدون ساخت حساب وارد شو.
                </p>
                <Button className="w-full" variant="secondary" onClick={onDemoLogin}>
                  ورود سریع به نسخه نمایشی
                </Button>
                <p className="mt-2 text-[11px] text-muted-foreground" dir="ltr">
                  {demoReviewCredentials.email} / {demoReviewCredentials.password}
                </p>
              </div>
            )}

            {message && (
              <Alert variant={messageVariant}>
                <AlertCircle />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </section>

      <figure className="relative hidden overflow-hidden bg-muted lg:block">
        <img
          src="/images/onboarding-study-room.png"
          alt="اتاق مطالعه آرام در غروب تهران"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/25 to-transparent" />
      </figure>
    </main>
  )
}
