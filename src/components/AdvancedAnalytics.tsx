import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  Clock3,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Timer,
  Trophy,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import StudyHeatmap from './StudyHeatmap'

type DailyAnalytics = {
  study_date: string
  total_seconds: number
  completed_sessions: number
  session_count: number
}

type SubjectAnalytics = {
  subject_name: string
  total_seconds: number
  session_count: number
  average_session_seconds: number
  percentage_of_total: number
}

type AnalyticsSummary = {
  today_seconds: number
  current_week_seconds: number
  previous_week_seconds: number
  week_change_percent: number

  current_month_seconds: number
  previous_month_seconds: number
  month_change_percent: number

  last_30_days_seconds: number
  active_days_last_30: number
  average_active_day_seconds: number
  total_sessions_last_30: number

  best_day_date: string | null
  best_day_seconds: number

  longest_session_seconds: number
  longest_session_subject: string | null

  most_studied_subject: string | null
  most_studied_subject_seconds: number
}

type AnalyticsPeriod = 30 | 90 | 365

function formatDuration(
  value: number | string | null | undefined,
) {
  const totalSeconds = Math.max(0, Number(value) || 0)

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (hours > 0) {
    return `${hours.toLocaleString('fa-IR')} ساعت و ${minutes.toLocaleString(
      'fa-IR',
    )} دقیقه`
  }

  return `${minutes.toLocaleString('fa-IR')} دقیقه`
}

function formatCompactDuration(
  value: number | string | null | undefined,
) {
  const totalSeconds = Math.max(0, Number(value) || 0)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (hours > 0) {
    return `${hours.toLocaleString('fa-IR')}س ${minutes.toLocaleString(
      'fa-IR',
    )}د`
  }

  return `${minutes.toLocaleString('fa-IR')}د`
}

function formatPersianDate(value: string | null) {
  if (!value) return 'هنوز ثبت نشده'

  return new Intl.DateTimeFormat('fa-IR', {
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Tehran',
  }).format(new Date(`${value}T12:00:00+03:30`))
}

function weekDayLabel(value: string) {
  return new Intl.DateTimeFormat('fa-IR', {
    weekday: 'short',
    timeZone: 'Asia/Tehran',
  }).format(new Date(`${value}T12:00:00+03:30`))
}

function shortDateLabel(value: string) {
  return new Intl.DateTimeFormat('fa-IR', {
    month: 'numeric',
    day: 'numeric',
    timeZone: 'Asia/Tehran',
  }).format(new Date(`${value}T12:00:00+03:30`))
}

function safePercentage(value: number | string | null) {
  return Number(value) || 0
}

export default function AdvancedAnalytics() {
  const [dailyAnalytics, setDailyAnalytics] = useState<
    DailyAnalytics[]
  >([])

  const [subjectAnalytics, setSubjectAnalytics] = useState<
    SubjectAnalytics[]
  >([])

  const [summary, setSummary] =
    useState<AnalyticsSummary | null>(null)

  const [period, setPeriod] = useState<AnalyticsPeriod>(30)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState('')

  const loadAnalytics = useCallback(
    async (silent = false) => {
      if (!silent) {
        setRefreshing(true)
      }

      setMessage('')

      const [
        dailyResult,
        subjectResult,
        summaryResult,
      ] = await Promise.all([
        supabase.rpc('get_my_daily_analytics', {
          requested_days: period,
        }),

        supabase.rpc('get_my_subject_analytics', {
          requested_days: period,
        }),

        supabase.rpc('get_my_analytics_summary'),
      ])

      const firstError =
        dailyResult.error ||
        subjectResult.error ||
        summaryResult.error

      if (firstError) {
        setMessage(firstError.message)
      } else {
        setDailyAnalytics(
          (dailyResult.data ?? []) as DailyAnalytics[],
        )

        setSubjectAnalytics(
          (subjectResult.data ?? []) as SubjectAnalytics[],
        )

        const firstSummary = Array.isArray(summaryResult.data)
          ? summaryResult.data[0]
          : null

        setSummary(
          (firstSummary ?? null) as AnalyticsSummary | null,
        )
      }

      setLoading(false)
      setRefreshing(false)
    },
    [period],
  )

  useEffect(() => {
    void loadAnalytics()
  }, [loadAnalytics])

  const lastSevenDays = useMemo(() => {
    return dailyAnalytics.slice(-7)
  }, [dailyAnalytics])

  const visibleThirtyDays = useMemo(() => {
    return dailyAnalytics.slice(-30)
  }, [dailyAnalytics])

  const weeklyMaximum = useMemo(() => {
    return Math.max(
      1,
      ...lastSevenDays.map((item) =>
        Number(item.total_seconds),
      ),
    )
  }, [lastSevenDays])

  const thirtyDayMaximum = useMemo(() => {
    return Math.max(
      1,
      ...visibleThirtyDays.map((item) =>
        Number(item.total_seconds),
      ),
    )
  }, [visibleThirtyDays])

  const maximumSubjectSeconds = useMemo(() => {
    return Math.max(
      1,
      ...subjectAnalytics.map((item) =>
        Number(item.total_seconds),
      ),
    )
  }, [subjectAnalytics])

  const studiedDaysCount = useMemo(() => {
    return dailyAnalytics.filter(
      (item) => Number(item.total_seconds) > 0,
    ).length
  }, [dailyAnalytics])

  const periodTotalSeconds = useMemo(() => {
    return dailyAnalytics.reduce(
      (total, item) =>
        total + Number(item.total_seconds || 0),
      0,
    )
  }, [dailyAnalytics])

  const weekChange = Number(
    summary?.week_change_percent ?? 0,
  )

  const monthChange = Number(
    summary?.month_change_percent ?? 0,
  )

  if (loading) {
    return (
      <section className="advanced-analytics-loading">
        <LoaderCircle className="spin-icon" size={22} />
        در حال آماده‌سازی نمودارها...
      </section>
    )
  }

  return (
    <section className="advanced-analytics">
      <header className="analytics-header">
        <div>
          <p>
            <Sparkles size={17} />
            تحلیل دقیق مطالعه
          </p>

          <h2>Study Analytics</h2>
        </div>

        <button
          type="button"
          disabled={refreshing}
          onClick={() => void loadAnalytics()}
        >
          {refreshing ? (
            <LoaderCircle className="spin-icon" size={18} />
          ) : (
            <RefreshCw size={18} />
          )}
        </button>
      </header>

      <div className="analytics-period-tabs">
        <button
          type="button"
          className={period === 30 ? 'selected' : ''}
          onClick={() => setPeriod(30)}
        >
          ۳۰ روز
        </button>

        <button
          type="button"
          className={period === 90 ? 'selected' : ''}
          onClick={() => setPeriod(90)}
        >
          ۳ ماه
        </button>

        <button
          type="button"
          className={period === 365 ? 'selected' : ''}
          onClick={() => setPeriod(365)}
        >
          یک سال
        </button>
      </div>

      {message && (
        <div className="analytics-message">{message}</div>
      )}

      <div className="analytics-comparison-grid">
        <article className="analytics-comparison-card">
          <div className="analytics-comparison-heading">
            <span>
              <CalendarDays size={20} />
              این هفته
            </span>

            <strong>
              {formatDuration(summary?.current_week_seconds)}
            </strong>
          </div>

          <div
            className={`analytics-change ${
              weekChange > 0
                ? 'positive'
                : weekChange < 0
                  ? 'negative'
                  : 'neutral'
            }`}
          >
            {weekChange > 0 ? (
              <ArrowUpRight size={17} />
            ) : weekChange < 0 ? (
              <ArrowDownRight size={17} />
            ) : (
              <Activity size={17} />
            )}

            <span>
              {Math.abs(weekChange).toLocaleString('fa-IR')}٪
              {weekChange > 0
                ? ' بیشتر از هفته قبل'
                : weekChange < 0
                  ? ' کمتر از هفته قبل'
                  : ' بدون تغییر'}
            </span>
          </div>

          <small>
            هفته قبل:{' '}
            {formatDuration(summary?.previous_week_seconds)}
          </small>
        </article>

        <article className="analytics-comparison-card">
          <div className="analytics-comparison-heading">
            <span>
              <BarChart3 size={20} />
              این ماه
            </span>

            <strong>
              {formatDuration(summary?.current_month_seconds)}
            </strong>
          </div>

          <div
            className={`analytics-change ${
              monthChange > 0
                ? 'positive'
                : monthChange < 0
                  ? 'negative'
                  : 'neutral'
            }`}
          >
            {monthChange > 0 ? (
              <ArrowUpRight size={17} />
            ) : monthChange < 0 ? (
              <ArrowDownRight size={17} />
            ) : (
              <Activity size={17} />
            )}

            <span>
              {Math.abs(monthChange).toLocaleString('fa-IR')}٪
              {monthChange > 0
                ? ' بیشتر از ماه قبل'
                : monthChange < 0
                  ? ' کمتر از ماه قبل'
                  : ' بدون تغییر'}
            </span>
          </div>

          <small>
            ماه قبل:{' '}
            {formatDuration(summary?.previous_month_seconds)}
          </small>
        </article>
      </div>

      <article className="weekly-chart-card">
        <div className="analytics-card-title">
          <div>
            <p>هفت روز اخیر</p>
            <h3>نمودار هفتگی</h3>
          </div>

          <span>
            {formatDuration(
              lastSevenDays.reduce(
                (total, item) =>
                  total + Number(item.total_seconds),
                0,
              ),
            )}
          </span>
        </div>

        <div className="weekly-bar-chart">
          {lastSevenDays.map((item) => {
            const totalSeconds = Number(item.total_seconds)
            const heightPercentage =
              totalSeconds <= 0
                ? 3
                : Math.max(
                    8,
                    Math.round(
                      (totalSeconds / weeklyMaximum) * 100,
                    ),
                  )

            return (
              <div
                className="weekly-bar-column"
                key={item.study_date}
              >
                <div className="weekly-bar-value">
                  {totalSeconds > 0
                    ? formatCompactDuration(totalSeconds)
                    : '—'}
                </div>

                <div className="weekly-bar-track">
                  <i
                    style={{
                      height: `${heightPercentage}%`,
                    }}
                    title={formatDuration(totalSeconds)}
                  />
                </div>

                <strong>
                  {weekDayLabel(item.study_date)}
                </strong>

                <small>
                  {item.session_count.toLocaleString('fa-IR')}{' '}
                  جلسه
                </small>
              </div>
            )
          })}
        </div>
      </article>

      <article className="monthly-chart-card">
        <div className="analytics-card-title">
          <div>
            <p>نمای کلی ماه</p>
            <h3>۳۰ روز اخیر</h3>
          </div>

          <span>
            {studiedDaysCount.toLocaleString('fa-IR')} روز فعال
          </span>
        </div>

        <div className="monthly-mini-chart">
          {visibleThirtyDays.map((item) => {
            const totalSeconds = Number(item.total_seconds)

            const heightPercentage =
              totalSeconds <= 0
                ? 4
                : Math.max(
                    10,
                    Math.round(
                      (totalSeconds / thirtyDayMaximum) * 100,
                    ),
                  )

            return (
              <span
                className={
                  totalSeconds > 0
                    ? 'monthly-mini-bar studied'
                    : 'monthly-mini-bar empty'
                }
                key={item.study_date}
                title={`${shortDateLabel(
                  item.study_date,
                )}: ${formatDuration(totalSeconds)}`}
              >
                <i
                  style={{
                    height: `${heightPercentage}%`,
                  }}
                />
              </span>
            )
          })}
        </div>

        <div className="monthly-chart-footer">
          <span>
            مجموع این بازه:
            <strong>
              {formatDuration(periodTotalSeconds)}
            </strong>
          </span>

          <span>
            روزهای فعال:
            <strong>
              {studiedDaysCount.toLocaleString('fa-IR')}
            </strong>
          </span>
        </div>
      </article>

      <StudyHeatmap />

      <div className="analytics-record-grid">
        <article>
          <span className="analytics-record-icon">
            <Trophy size={21} />
          </span>

          <div>
            <small>بهترین روز</small>
            <strong>
              {formatPersianDate(summary?.best_day_date ?? null)}
            </strong>
            <p>
              {formatDuration(summary?.best_day_seconds)}
            </p>
          </div>
        </article>

        <article>
          <span className="analytics-record-icon">
            <Activity size={21} />
          </span>

          <div>
            <small>میانگین روز فعال</small>
            <strong>
              {formatDuration(
                summary?.average_active_day_seconds,
              )}
            </strong>
            <p>
              {Number(
                summary?.active_days_last_30 ?? 0,
              ).toLocaleString('fa-IR')}{' '}
              روز فعال
            </p>
          </div>
        </article>

        <article>
          <span className="analytics-record-icon">
            <Timer size={21} />
          </span>

          <div>
            <small>طولانی‌ترین جلسه</small>
            <strong>
              {formatDuration(
                summary?.longest_session_seconds,
              )}
            </strong>
            <p>
              {summary?.longest_session_subject ??
                'بدون درس مشخص'}
            </p>
          </div>
        </article>

        <article>
          <span className="analytics-record-icon">
            <BookOpen size={21} />
          </span>

          <div>
            <small>درس محبوب</small>
            <strong>
              {summary?.most_studied_subject ??
                'هنوز مشخص نشده'}
            </strong>
            <p>
              {formatDuration(
                summary?.most_studied_subject_seconds,
              )}
            </p>
          </div>
        </article>
      </div>

      <article className="subject-analytics-card">
        <div className="analytics-card-title">
          <div>
            <p>تقسیم زمان مطالعه</p>
            <h3>تحلیل درس‌ها</h3>
          </div>

          <span>
            {subjectAnalytics.length.toLocaleString('fa-IR')}{' '}
            درس
          </span>
        </div>

        {subjectAnalytics.length === 0 ? (
          <div className="analytics-empty-state">
            <BookOpen size={25} />

            <div>
              <strong>هنوز داده‌ای وجود ندارد</strong>
              <p>
                بعد از ثبت چند مطالعه، زمان هر درس اینجا
                تحلیل می‌شود.
              </p>
            </div>
          </div>
        ) : (
          <div className="subject-analytics-list">
            {subjectAnalytics.map((subject, index) => {
              const percentage = safePercentage(
                subject.percentage_of_total,
              )

              const relativeWidth = Math.max(
                4,
                Math.round(
                  (Number(subject.total_seconds) /
                    maximumSubjectSeconds) *
                    100,
                ),
              )

              return (
                <article
                  className="subject-analytics-row"
                  key={`${subject.subject_name}-${index}`}
                >
                  <div className="subject-ranking-number">
                    {(index + 1).toLocaleString('fa-IR')}
                  </div>

                  <div className="subject-analytics-info">
                    <div>
                      <strong>{subject.subject_name}</strong>

                      <span>
                        {percentage.toLocaleString('fa-IR')}٪
                      </span>
                    </div>

                    <div className="subject-progress-track">
                      <i
                        style={{
                          width: `${relativeWidth}%`,
                        }}
                      />
                    </div>

                    <small>
                      {formatDuration(subject.total_seconds)}
                      {' • '}
                      {Number(subject.session_count).toLocaleString(
                        'fa-IR',
                      )}{' '}
                      جلسه
                      {' • '}
                      میانگین{' '}
                      {formatCompactDuration(
                        subject.average_session_seconds,
                      )}
                    </small>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </article>

      <div className="analytics-small-summary">
        <span>
          <Clock3 size={18} />
          مجموع ۳۰ روز اخیر:
          <strong>
            {formatDuration(summary?.last_30_days_seconds)}
          </strong>
        </span>

        <span>
          <Activity size={18} />
          تعداد جلسات:
          <strong>
            {Number(
              summary?.total_sessions_last_30 ?? 0,
            ).toLocaleString('fa-IR')}
          </strong>
        </span>
      </div>
    </section>
  )
}
