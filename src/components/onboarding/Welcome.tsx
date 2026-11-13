import {
  ArrowLeft,
  BarChart3,
  ShieldCheck,
  Sparkles,
  TimerReset,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type Props = {
  onStart: () => void
  onLogin: () => void
}

const welcomeFeatures = [
  { icon: TimerReset, label: 'تایمر دقیق' },
  { icon: BarChart3, label: 'گزارش روشن' },
  { icon: ShieldCheck, label: 'حریم خصوصی' },
] as const

export default function Welcome({
  onStart,
  onLogin,
}: Props) {
  return (
    <main
      className="soft-enter min-h-svh bg-background p-3 sm:p-6 lg:p-8"
      dir="rtl"
    >
      <Card className="mx-auto min-h-[calc(100svh-1.5rem)] max-w-7xl overflow-hidden border-border/70 py-0 shadow-xl sm:min-h-[calc(100svh-3rem)] lg:min-h-[calc(100svh-4rem)]">
        <CardContent className="grid min-h-full flex-1 gap-0 p-0 lg:grid-cols-[0.92fr_1.08fr]">
          <section className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14 lg:py-16">
            <Badge variant="secondary" className="mb-6 gap-2 self-start">
              <Sparkles />
              مطالعه آرام، پیشرفت واقعی
            </Badge>

            <div className="max-w-xl space-y-5">
              <p className="text-sm font-semibold tracking-[0.18em] text-primary uppercase">
                Sweet Study Club
              </p>
              <h1 className="text-4xl font-black leading-[1.25] tracking-tight text-balance sm:text-5xl lg:text-6xl">
                هر روز، یک قدم شیرین‌تر به هدف نزدیک شو
              </h1>
              <p className="text-base leading-8 text-muted-foreground sm:text-lg">
                زمان مطالعه‌ات را ثبت کن، روندت را ببین و کنار آدم‌های
                هم‌مسیر با تمرکز بیشتری ادامه بده.
              </p>
            </div>

            <div className="mt-8 grid gap-3 text-sm sm:grid-cols-3">
              {welcomeFeatures.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-3 font-medium"
                >
                  <Icon className="size-4 text-primary" />
                  {label}
                </div>
              ))}
            </div>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={onStart} className="group">
                آشنایی با برنامه
                <ArrowLeft className="transition-transform group-hover:-translate-x-1" />
              </Button>
              <Button size="lg" variant="ghost" onClick={onLogin}>
                قبلاً حساب دارم
              </Button>
            </div>
          </section>

          <figure className="relative min-h-80 overflow-hidden bg-muted lg:min-h-full">
            <img
              src="/images/onboarding-study-room.webp"
              width={1536}
              height={1024}
              decoding="async"
              alt="دانش‌آموزی در اتاق مطالعه گرم و آرام کنار میز و گربه"
              className="absolute inset-0 size-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/25 via-transparent to-transparent lg:bg-gradient-to-l" />
            <figcaption className="absolute inset-x-5 bottom-5 rounded-xl border border-white/20 bg-black/30 p-4 text-sm leading-6 text-white backdrop-blur-md sm:inset-x-8 sm:bottom-8">
              لازم نیست هر روز عالی باشی؛ فقط کافی است دوباره شروع کنی.
            </figcaption>
          </figure>
        </CardContent>
      </Card>
    </main>
  )
}
