import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Eye,
  EyeOff,
  Flame,
  Medal,
  Target,
  Trophy,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

type LeaderboardPeriod = 'today' | 'week' | 'month'

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

type LeaderboardMember = {
  user_id: string
  display_name: string
  avatar_url: string | null
  current_streak: number | null
  today_seconds: number
  week_seconds: number
  month_seconds: number
}

type PrivacySettings = {
  show_study_time: boolean
  show_streak: boolean
  show_total_study: boolean
  daily_goal_minutes: number
}

type StatsSectionProps = {
  userId: string
}

const goalOptions = [120, 240, 360, 480, 600, 720]

function secondsToReadable(value: number | string | null | undefined) {
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

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || '?'
}

function medalForTotal(seconds: number) {
  const hours = seconds / 3600

  if (hours >= 1000) return '👑 اسطوره مطالعه'
  if (hours >= 500) return '💎 مدال الماس'
  if (hours >= 250) return '🥇 مدال طلایی'
  if (hours >= 100) return '🥈 مدال نقره‌ای'
  if (hours >= 50) return '🥉 مدال برنزی'
  if (hours >= 1) return '🌸 اولین ساعت'
  return '🌱 تازه‌کار'
}

export default function StatsSection({ userId }: StatsSectionProps) {
  const [summary, setSummary] = useState<StudySummary | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardMember[]>([])
  const [settings, setSettings] = useState<PrivacySettings | null>(null)
  const [period, setPeriod] = useState<LeaderboardPeriod>('today')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const loadStats = useCallback(async () => {
    setLoading(true)
    setMessage('')

    const [summaryResult, leaderboardResult, settingsResult] =
      await Promise.all([
        supabase.from('my_study_summary').select('*').maybeSingle(),

        supabase.rpc('get_public_leaderboard'),

        supabase
          .from('profiles')
          .select(
            'show_study_time, show_streak, show_total_study, daily_goal_minutes',
          )
          .eq('id', userId)
          .single(),
      ])

    const firstError =
      summaryResult.error ||
      leaderboardResult.error ||
      settingsResult.error

    if (firstError) {
      setMessage(firstError.message)
      setLoading(false)
      return
    }

    setSummary(summaryResult.data as StudySummary | null)
    setLeaderboard(
      (leaderboardResult.data ?? []) as LeaderboardMember[],
    )
    setSettings(settingsResult.data as PrivacySettings)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  const sortedLeaderboard = useMemo(() => {
    const field =
      period === 'today'
        ? 'today_seconds'
        : period === 'week'
          ? 'week_seconds'
          : 'month_seconds'

    return [...leaderboard].sort(
      (first, second) =>
        Number(second[field]) - Number(first[field]),
    )
  }, [leaderboard, period])

  const updateSettings = async (
    changes: Partial<PrivacySettings>,
  ) => {
    if (!settings || saving) return

    const previousSettings = settings
    const nextSettings = { ...settings, ...changes }

    setSettings(nextSettings)
    setSaving(true)
    setMessage('')

    const { error } = await supabase
      .from('profiles')
      .update(changes)
      .eq('id', userId)

    if (error) {
      setSettings(previousSettings)
      setMessage(error.message)
    } else {
      setMessage('تنظیمات با موفقیت ذخیره شد 🎀')
      await loadStats()
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <section className="stats-loading">
        در حال بارگذاری آمار...
      </section>
    )
  }

  const todaySeconds = Number(summary?.today_seconds ?? 0)
  const goalSeconds =
    Number(settings?.daily_goal_minutes ?? 360) * 60

  const goalPercent =
    goalSeconds > 0
      ? Math.min(100, Math.round((todaySeconds / goalSeconds) * 100))
      : 0

  return (
    <section className="stats-section">
      {message && <div className="stats-message">{message}</div>}

      <div className="stats-cards">
        <article className="mini-stat-card">
          <span className="stat-icon">
            <CalendarDays size={21} />
          </span>
          <div>
            <small>مطالعه امروز</small>
            <strong>
              {secondsToReadable(summary?.today_seconds)}
            </strong>
          </div>
        </article>

        <article className="mini-stat-card">
          <span className="stat-icon">
            <Flame size={21} />
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

        <article className="mini-stat-card">
          <span className="stat-icon">
            <Trophy size={21} />
          </span>
          <div>
            <small>مجموع کل مطالعه</small>
            <strong>
              {secondsToReadable(summary?.total_seconds)}
            </strong>
          </div>
        </article>

        <article className="mini-stat-card">
          <span className="stat-icon">
            <Medal size={21} />
          </span>
          <div>
            <small>مدال فعلی</small>
            <strong>
              {medalForTotal(Number(summary?.total_seconds ?? 0))}
            </strong>
          </div>
        </article>
      </div>

      <div className="goal-card">
        <div className="goal-heading">
          <div>
            <span>
              <Target size={21} />
              هدف امروز
            </span>

            <strong>{goalPercent.toLocaleString('fa-IR')}٪</strong>
          </div>

          <select
            value={settings?.daily_goal_minutes ?? 360}
            disabled={saving}
            onChange={(event) =>
              void updateSettings({
                daily_goal_minutes: Number(event.target.value),
              })
            }
          >
            {goalOptions.map((minutes) => (
              <option value={minutes} key={minutes}>
                {minutes / 60} ساعت
              </option>
            ))}
          </select>
        </div>

        <div className="goal-progress">
          <i style={{ width: `${goalPercent}%` }} />
        </div>

        <p>
          {secondsToReadable(todaySeconds)} از{' '}
          {secondsToReadable(goalSeconds)}
        </p>
      </div>

      <div className="stats-main-grid">
        <article className="leaderboard-card">
          <div className="stats-title">
            <div>
              <p>رقابت دوستانه</p>
              <h2>🏆 لیدربرد</h2>
            </div>

            <button
              className="refresh-stats"
              onClick={() => void loadStats()}
            >
              به‌روزرسانی
            </button>
          </div>

          <div className="leaderboard-tabs">
            <button
              className={period === 'today' ? 'selected' : ''}
              onClick={() => setPeriod('today')}
            >
              امروز
            </button>

            <button
              className={period === 'week' ? 'selected' : ''}
              onClick={() => setPeriod('week')}
            >
              این هفته
            </button>

            <button
              className={period === 'month' ? 'selected' : ''}
              onClick={() => setPeriod('month')}
            >
              این ماه
            </button>
          </div>

          <div className="leaderboard-list">
            {sortedLeaderboard.length === 0 ? (
              <div className="empty-stats">
                هنوز زمان مطالعه‌ای برای رتبه‌بندی وجود ندارد.
              </div>
            ) : (
              sortedLeaderboard.slice(0, 20).map((member, index) => {
                const seconds =
                  period === 'today'
                    ? member.today_seconds
                    : period === 'week'
                      ? member.week_seconds
                      : member.month_seconds

                const rankEmoji =
                  index === 0
                    ? '🥇'
                    : index === 1
                      ? '🥈'
                      : index === 2
                        ? '🥉'
                        : `${index + 1}`

                return (
                  <div
                    className={`leaderboard-row ${
                      member.user_id === userId ? 'my-rank' : ''
                    }`}
                    key={member.user_id}
                  >
                    <span className="rank-number">{rankEmoji}</span>

                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.display_name}
                      />
                    ) : (
                      <span className="small-avatar">
                        {initials(member.display_name)}
                      </span>
                    )}

                    <div className="leader-name">
                      <strong>
                        {member.display_name}
                        {member.user_id === userId ? ' • شما' : ''}
                      </strong>

                      {member.current_streak !== null && (
                        <small>
                          🔥{' '}
                          {member.current_streak.toLocaleString(
                            'fa-IR',
                          )}{' '}
                          روز
                        </small>
                      )}
                    </div>

                    <b>{secondsToReadable(seconds)}</b>
                  </div>
                )
              })
            )}
          </div>
        </article>

        <article className="privacy-card">
          <div className="stats-title">
            <div>
              <p>کنترل کامل اطلاعات</p>
              <h2>تنظیمات حریم خصوصی</h2>
            </div>

            {settings?.show_study_time ? (
              <Eye size={25} />
            ) : (
              <EyeOff size={25} />
            )}
          </div>

          <label className="privacy-toggle">
            <span>
              <strong>نمایش زمان مطالعه</strong>
              <small>
                با خاموش‌کردن این گزینه از لیدربرد حذف می‌شوی.
              </small>
            </span>

            <input
              type="checkbox"
              checked={settings?.show_study_time ?? true}
              disabled={saving}
              onChange={(event) =>
                void updateSettings({
                  show_study_time: event.target.checked,
                })
              }
            />
          </label>

          <label className="privacy-toggle">
            <span>
              <strong>نمایش استریک</strong>
              <small>
                تعداد روزهای متوالی مطالعه برای دیگران دیده شود.
              </small>
            </span>

            <input
              type="checkbox"
              checked={settings?.show_streak ?? true}
              disabled={saving}
              onChange={(event) =>
                void updateSettings({
                  show_streak: event.target.checked,
                })
              }
            />
          </label>

          <label className="privacy-toggle">
            <span>
              <strong>نمایش مجموع کل مطالعه</strong>
              <small>
                مجموع کل مطالعه در پروفایل عمومی قابل مشاهده باشد.
              </small>
            </span>

            <input
              type="checkbox"
              checked={settings?.show_total_study ?? true}
              disabled={saving}
              onChange={(event) =>
                void updateSettings({
                  show_total_study: event.target.checked,
                })
              }
            />
          </label>

          <div className="achievement-box">
            <span>بهترین استریک</span>
            <strong>
              🔥{' '}
              {Number(summary?.longest_streak ?? 0).toLocaleString(
                'fa-IR',
              )}{' '}
              روز
            </strong>
          </div>

          <div className="achievement-box">
            <span>پارت‌های تکمیل‌شده</span>
            <strong>
              📚{' '}
              {Number(summary?.completed_sessions ?? 0).toLocaleString(
                'fa-IR',
              )}
            </strong>
          </div>
        </article>
      </div>
    </section>
  )
}
