import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BellRing,
  ShieldCheck,
  TimerReset,
  UsersRound,
} from 'lucide-react'
import IntroSlide from './IntroSlide'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

type Props = {
  onFinish: () => void
}

const slides = [
  {
    eyebrow: '۱ از ۵ · تمرکز',
    title: 'هر دقیقه مطالعه، قابل اعتماد ثبت می‌شود',
    text: 'زمان مطالعه‌ات را ثبت کن، جلسه‌هایت را ببین و مسیر پیشرفتت را بساز.',
    icon: TimerReset,
  },
  {
    eyebrow: '۲ از ۵ · بینش',
    title: 'پیشرفتت را ساده و بدون شلوغی ببین',
    text: 'گزارش‌های روزانه و هفتگی کمک می‌کنند بفهمی کجا خوب پیش رفتی و قدم بعدی چیست.',
    icon: BarChart3,
  },
  {
    eyebrow: '۳ از ۵ · همراهی',
    title: 'تنها درس نخوان؛ هم‌مسیرهایت را پیدا کن',
    text: 'با کنترل کامل حریم خصوصی، دوستانت را اضافه کن و از حضورشان برای ادامه مسیر انرژی بگیر.',
    icon: UsersRound,
  },
  {
    eyebrow: '۴ از ۵ · یادآوری',
    title: 'ریتمت را با یادآوری‌های محترمانه حفظ کن',
    text: 'اعلان‌ها فقط وقتی فعال می‌شوند که خودت بخواهی؛ هیچ مجوزی بدون توضیح درخواست نمی‌شود.',
    icon: BellRing,
  },
  {
    eyebrow: '۵ از ۵ · اختیار',
    title: 'داده‌های تو، با انتخاب‌های روشن و امن',
    text: 'هر بخش خصوصی فقط با اجازه تو نمایش داده می‌شود و همیشه می‌توانی تنظیماتت را تغییر بدهی.',
    icon: ShieldCheck,
  },
] as const

export default function IntroSlider({ onFinish }: Props) {
  const [index, setIndex] = useState(0)

  const slide = slides[index] ?? slides[0]

  const next = () => {
    if (index === slides.length - 1) {
      onFinish()
      return
    }

    setIndex(index + 1)
  }

  const previous = () => {
    setIndex((currentIndex) => Math.max(0, currentIndex - 1))
  }

  const progress = ((index + 1) / slides.length) * 100

  return (
    <main className="min-h-svh bg-background p-3 sm:p-6 lg:p-8" dir="rtl">
      <Card className="mx-auto min-h-[calc(100svh-1.5rem)] max-w-7xl overflow-hidden py-0 shadow-xl sm:min-h-[calc(100svh-3rem)] lg:min-h-[calc(100svh-4rem)]">
        <CardContent className="grid flex-1 p-0 lg:grid-cols-[1fr_1.08fr]">
          <section className="flex flex-col justify-between gap-10 px-6 py-8 sm:px-10 lg:px-14 lg:py-12">
            <header className="space-y-3">
              <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
                <span>آشنایی با Sweet Study</span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto px-0"
                  onClick={onFinish}
                >
                  رد کردن
                </Button>
              </div>
              <Progress value={progress} aria-label={`مرحله ${index + 1} از ${slides.length}`} />
            </header>

            <IntroSlide
              title={slide.title}
              text={slide.text}
              icon={slide.icon}
              eyebrow={slide.eyebrow}
            />

            <footer className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={previous}
                disabled={index === 0}
              >
                <ArrowRight />
                قبلی
              </Button>
              <Button size="lg" onClick={next}>
                {index === slides.length - 1 ? 'ورود به برنامه' : 'بعدی'}
                <ArrowLeft />
              </Button>
            </footer>
          </section>

          <figure className="relative hidden min-h-full overflow-hidden bg-muted lg:block">
            <img
              src="/images/onboarding-study-room.png"
              alt="فضای گرم و آرام مطالعه"
              className="absolute inset-0 size-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-background/15" />
          </figure>
        </CardContent>
      </Card>
    </main>
  )
}
