import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  CalendarDays,
  Flame,
  Medal,
  RefreshCw,
  Target,
  Trophy,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Alert, AlertDescription } from './ui/alert'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card'
import { NativeSelect } from './ui/native-select'
import { Progress } from './ui/progress'
import { Skeleton } from './ui/skeleton'

const AdvancedAnalytics = lazy(() => import('./AdvancedAnalytics'))
const ExportCenter = lazy(() => import('./ExportCenter'))

type StudySummary = {
  user_id: string
  display_name: string
  avatar_url: string | null
  daily_goal_minutes: number
  current_streak: number
  longest_streak: number
  completed_sessions: number
  today_seconds: number
  week_seconds: number
  month_seconds: number
  total_seconds: number
}

type ProgressPageProps = {
  userId: string
  displayName: string
  demoMode?: boolean
}

const goalOptions = [120, 240, 360, 480, 600, 720]
const demoSummary: StudySummary = {
  user_id: 'demo-user',
  display_name: 'کاربر نمایشی',
  avatar_url: null,
  daily_goal_minutes: 360,
  current_streak: 6,
  longest_streak: 14,
  completed_sessions: 87,
  today_seconds: 8_100,
  week_seconds: 151_200,
  month_seconds: 439_200,
  total_seconds: 1_252_800,
}

function secondsToReadable(value: number | string | null | undefined) {
  const seconds = Math.max(0, Number(value) || 0)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours.toLocaleString('fa-IR')} ساعت و ${minutes.toLocaleString('fa-IR')} دقیقه`
  }

  return `${minutes.toLocaleString('fa-IR')} دقیقه`
}

function achievementLabel(totalSeconds: number) {
  const hours = totalSeconds / 3600

  if (hours >= 1000) return 'اسطوره مطالعه'
  if (hours >= 500) return 'مدال الماس'
  if (hours >= 250) return 'مدال طلایی'
  if (hours >= 100) return 'مدال نقره‌ای'
  if (hours >= 50) return 'مدال برنزی'
  if (hours >= 1) return 'اولین ساعت'
  return 'شروع مسیر'
}

export default function ProgressPage({
  userId,
  displayName,
  demoMode = false,
}: ProgressPageProps) {
  const [summary, setSummary] = useState<StudySummary | null>(null)
  const [goalMinutes, setGoalMinutes] = useState(360)
  const [loading, setLoading] = useState(true)
  const [savingGoal, setSavingGoal] = useState(false)
  const [message, setMessage] = useState('')

  const loadProgress = useCallback(async () => {
    setLoading(true)
    setMessage('')

    if (demoMode) {
      setSummary(demoSummary)
      setGoalMinutes(demoSummary.daily_goal_minutes)
      setLoading(false)
      return
    }

    const [summaryResult, profileResult] = await Promise.all([
      supabase.from('my_study_summary').select('*').maybeSingle(),
      supabase
        .from('profiles')
        .select('daily_goal_minutes')
        .eq('id', userId)
        .single(),
    ])

    const firstError = summaryResult.error || profileResult.error

    if (firstError) {
      setMessage(firstError.message)
    } else {
      setSummary(summaryResult.data as StudySummary | null)
      setGoalMinutes(Number(profileResult.data?.daily_goal_minutes ?? 360))
    }

    setLoading(false)
  }, [demoMode, userId])

  useEffect(() => {
    void loadProgress()
  }, [loadProgress])

  const todaySeconds = Number(summary?.today_seconds ?? 0)
  const goalSeconds = goalMinutes * 60
  const goalPercent = useMemo(() => {
    if (goalSeconds <= 0) return 0
    return Math.min(100, Math.round((todaySeconds / goalSeconds) * 100))
  }, [goalSeconds, todaySeconds])

  const updateGoal = async (nextGoalMinutes: number) => {
    const previousGoal = goalMinutes
    setGoalMinutes(nextGoalMinutes)
    setSavingGoal(true)
    setMessage('')

    if (demoMode) {
      setMessage('هدف نمایشی تغییر کرد؛ در این حالت چیزی ذخیره نمی‌شود.')
      setSavingGoal(false)
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ daily_goal_minutes: nextGoalMinutes })
      .eq('id', userId)

    if (error) {
      setGoalMinutes(previousGoal)
      setMessage(error.message)
    } else {
      setMessage('هدف روزانه ذخیره شد.')
      await loadProgress()
    }
    setSavingGoal(false)
  }

  if (loading) {
    return (
      <div className="grid gap-5" aria-label="در حال بارگذاری پیشرفت">
        <Skeleton className="h-20" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton className="h-28" key={index} />
          ))}
        </div>
        <Skeleton className="h-48" />
      </div>
    )
  }

  const overviewCards = [
    ['مطالعه امروز', summary?.today_seconds, CalendarDays],
    ['این هفته', summary?.week_seconds, CalendarDays],
    ['این ماه', summary?.month_seconds, CalendarDays],
    ['مجموع کل', summary?.total_seconds, Trophy],
  ] as const
  const detailCards: Array<[string, string, LucideIcon]> = [
    [
      'استریک فعلی',
      `${Number(summary?.current_streak ?? 0).toLocaleString('fa-IR')} روز`,
      Flame,
    ],
    [
      'بهترین استریک',
      `${Number(summary?.longest_streak ?? 0).toLocaleString('fa-IR')} روز`,
      Flame,
    ],
    [
      'پارت‌های کامل',
      Number(summary?.completed_sessions ?? 0).toLocaleString('fa-IR'),
      Medal,
    ],
    [
      'دستاورد فعلی',
      achievementLabel(Number(summary?.total_seconds ?? 0)),
      Trophy,
    ],
  ]

  return (
    <section className="grid gap-5">
      <header className="flex items-center justify-between gap-4">
        <div>
          <Badge variant="secondary">آمار مطالعه من</Badge>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">پیشرفت</h2>
        </div>
        <Button
          size="icon"
          variant="outline"
          aria-label="به‌روزرسانی آمار"
          onClick={() => void loadProgress()}
        >
          <RefreshCw />
        </Button>
      </header>

      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {overviewCards.map(([label, value, Icon]) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 pt-6">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon size={20} />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <strong className="mt-1 block text-sm">
                  {secondsToReadable(value)}
                </strong>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-primary/20">
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="text-primary" size={21} /> هدف امروز
            </CardTitle>
            <CardDescription className="mt-2">
              {secondsToReadable(todaySeconds)} از {secondsToReadable(goalSeconds)}
            </CardDescription>
          </div>
          <div className="w-full sm:w-40">
            <NativeSelect
              value={goalMinutes}
              disabled={savingGoal}
              aria-label="هدف روزانه"
              onChange={(event) =>
                void updateGoal(Number(event.target.value))
              }
            >
              {goalOptions.map((minutes) => (
                <option value={minutes} key={minutes}>
                  {(minutes / 60).toLocaleString('fa-IR')} ساعت
                </option>
              ))}
            </NativeSelect>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-center justify-between text-sm font-bold">
            <span>میزان انجام هدف</span>
            <span>{goalPercent.toLocaleString('fa-IR')}٪</span>
          </div>
          <Progress value={goalPercent} className="h-3" />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {detailCards.map(([label, value, Icon]) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 pt-6">
              <Icon className="shrink-0 text-primary" size={22} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <strong className="mt-1 block text-sm">{value}</strong>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {demoMode ? (
        <Card className="bg-muted/35">
          <CardHeader>
            <CardTitle>نمایش نمونه گزارش‌ها</CardTitle>
            <CardDescription>
              نمودارهای کامل و خروجی فایل پس از ورود به حساب واقعی، از داده‌های خودت ساخته می‌شوند.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Suspense fallback={<Skeleton className="h-64" />}>
          <AdvancedAnalytics />
          <ExportCenter userId={userId} displayName={displayName} />
        </Suspense>
      )}
    </section>
  )
}
