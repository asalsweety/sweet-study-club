import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Flame,
  Medal,
  Target,
  Trophy,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import AdvancedAnalytics from './AdvancedAnalytics'
import ExportCenter from './ExportCenter'

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
}

const goalOptions = [120, 240, 360, 480, 600, 720]

function secondsToReadable(
  value: number | string | null | undefined,
) {
  const seconds = Math.max(0, Number(value) || 0)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours.toLocaleString('fa-IR')} ساعت و ${minutes.toLocaleString(
      'fa-IR',
    )} دقیقه`
  }

  return `${minutes.toLocaleString('fa-IR')} دقیقه`
}

function achievementLabel(totalSeconds: number) {
  const hours = totalSeconds / 3600

  if (hours >= 1000) return '👑 اسطوره مطالعه'
  if (hours >= 500) return '💎 مدال الماس'
  if (hours >= 250) return '🥇 مدال طلایی'
  if (hours >= 100) return '🥈 مدال نقره‌ای'
  if (hours >= 50) return '🥉 مدال برنزی'
  if (hours >= 1) return '🌸 اولین ساعت'
  return '🌱 شروع مسیر'
}

export default function ProgressPage({
  userId,
  displayName,
}: ProgressPageProps) {
  const [summary, setSummary] = useState<StudySummary | null>(null)
  const [goalMinutes, setGoalMinutes] = useState(360)
  const [loading, setLoading] = useState(true)
  const [savingGoal, setSavingGoal] = useState(false)
  const [message, setMessage] = useState('')

  const loadProgress = useCallback(async () => {
    setLoading(true)
    setMessage('')

    const [summaryResult, profileResult] = await Promise.all([
      supabase.from('my_study_summary').select('*').maybeSingle(),

      supabase
        .from('profiles')
        .select('daily_goal_minutes')
        .eq('id', userId)
        .single(),
    ])

    const firstError =
      summaryResult.error || profileResult.error

    if (firstError) {
      setMessage(firstError.message)
      setLoading(false)
      return
    }

    setSummary(summaryResult.data as StudySummary | null)
    setGoalMinutes(
      Number(profileResult.data?.daily_goal_minutes ?? 360),
    )
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void loadProgress()
  }, [loadProgress])

  const todaySeconds = Number(summary?.today_seconds ?? 0)
  const goalSeconds = goalMinutes * 60

  const goalPercent = useMemo(() => {
    if (goalSeconds <= 0) return 0

    return Math.min(
      100,
      Math.round((todaySeconds / goalSeconds) * 100),
    )
  }, [goalSeconds, todaySeconds])

  const updateGoal = async (nextGoalMinutes: number) => {
    const previousGoal = goalMinutes

    setGoalMinutes(nextGoalMinutes)
    setSavingGoal(true)
    setMessage('')

    const { error } = await supabase
      .from('profiles')
      .update({ daily_goal_minutes: nextGoalMinutes })
      .eq('id', userId)

    if (error) {
      setGoalMinutes(previousGoal)
      setMessage(error.message)
    } else {
      setMessage('هدف روزانه ذخیره شد 🎀')
      await loadProgress()
    }

    setSavingGoal(false)
  }

  if (loading) {
    return (
      <section className="progress-page-loading">
        در حال بارگذاری پیشرفت...
      </section>
    )
  }

  return (
    <section className="progress-page">
      <header className="progress-page-header">
        <div>
          <p>روند مطالعه من</p>
          <h2>Progress</h2>
        </div>

        <button onClick={() => void loadProgress()}>
          به‌روزرسانی
        </button>
      </header>

      {message && (
        <div className="progress-page-message">{message}</div>
      )}

      <div className="progress-overview-cards">
        <article>
          <span>
            <CalendarDays size={21} />
          </span>

          <div>
            <small>مطالعه امروز</small>
            <strong>
              {secondsToReadable(summary?.today_seconds)}
            </strong>
          </div>
        </article>

        <article>
          <span>
            <CalendarDays size={21} />
          </span>

          <div>
            <small>این هفته</small>
            <strong>
              {secondsToReadable(summary?.week_seconds)}
            </strong>
          </div>
        </article>

        <article>
          <span>
            <CalendarDays size={21} />
          </span>

          <div>
            <small>این ماه</small>
            <strong>
              {secondsToReadable(summary?.month_seconds)}
            </strong>
          </div>
        </article>

        <article>
          <span>
            <Trophy size={21} />
          </span>

          <div>
            <small>مجموع کل</small>
            <strong>
              {secondsToReadable(summary?.total_seconds)}
            </strong>
          </div>
        </article>
      </div>

      <article className="progress-goal-card">
        <div className="progress-goal-heading">
          <div>
            <span>
              <Target size={21} />
              هدف امروز
            </span>

            <strong>
              {goalPercent.toLocaleString('fa-IR')}٪
            </strong>
          </div>

          <select
            value={goalMinutes}
            disabled={savingGoal}
            onChange={(event) =>
              void updateGoal(Number(event.target.value))
            }
          >
            {goalOptions.map((minutes) => (
              <option value={minutes} key={minutes}>
                {(minutes / 60).toLocaleString('fa-IR')} ساعت
              </option>
            ))}
          </select>
        </div>

        <div className="progress-goal-bar">
          <i style={{ width: `${goalPercent}%` }} />
        </div>

        <p>
          {secondsToReadable(todaySeconds)} از{' '}
          {secondsToReadable(goalSeconds)}
        </p>
      </article>

      <div className="progress-details-grid">
        <article className="progress-detail-card">
          <span>
            <Flame size={22} />
          </span>

          <div>
            <small>استریک فعلی</small>
            <strong>
              {Number(summary?.current_streak ?? 0).toLocaleString(
                'fa-IR',
              )}{' '}
              روز
            </strong>
          </div>
        </article>

        <article className="progress-detail-card">
          <span>
            <Flame size={22} />
          </span>

          <div>
            <small>بهترین استریک</small>
            <strong>
              {Number(summary?.longest_streak ?? 0).toLocaleString(
                'fa-IR',
              )}{' '}
              روز
            </strong>
          </div>
        </article>

        <article className="progress-detail-card">
          <span>
            <Medal size={22} />
          </span>

          <div>
            <small>پارت‌های تکمیل‌شده</small>
            <strong>
              {Number(
                summary?.completed_sessions ?? 0,
              ).toLocaleString('fa-IR')}
            </strong>
          </div>
        </article>

        <article className="progress-detail-card">
          <span>
            <Trophy size={22} />
          </span>

          <div>
            <small>دستاورد فعلی</small>
            <strong>
              {achievementLabel(
                Number(summary?.total_seconds ?? 0),
              )}
            </strong>
          </div>
        </article>
      </div>

      <AdvancedAnalytics />

      <ExportCenter displayName={displayName} />
    </section>
  )
}
