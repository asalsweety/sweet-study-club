import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RefreshCw,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

type HeatmapDay = {
  study_date: string
  total_seconds: number
  completed_sessions: number
  session_count: number
}

type HeatmapPeriod = 90 | 180 | 365

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

function formatFullDate(value: string) {
  return new Intl.DateTimeFormat('fa-IR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Tehran',
  }).format(new Date(`${value}T12:00:00+03:30`))
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat('fa-IR', {
    month: 'short',
    timeZone: 'Asia/Tehran',
  }).format(new Date(`${value}T12:00:00+03:30`))
}

function getIntensity(
  totalSeconds: number,
  maximumSeconds: number,
) {
  if (totalSeconds <= 0) return 0
  if (maximumSeconds <= 0) return 1

  const ratio = totalSeconds / maximumSeconds

  if (ratio <= 0.2) return 1
  if (ratio <= 0.4) return 2
  if (ratio <= 0.65) return 3
  if (ratio <= 0.85) return 4

  return 5
}

export default function StudyHeatmap() {
  const [days, setDays] = useState<HeatmapDay[]>([])
  const [period, setPeriod] = useState<HeatmapPeriod>(365)
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(
    null,
  )

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState('')

  const loadHeatmap = useCallback(async () => {
    setRefreshing(true)
    setMessage('')

    const { data, error } = await supabase.rpc(
      'get_my_daily_analytics',
      {
        requested_days: period,
      },
    )

    if (error) {
      setMessage(error.message)
    } else {
      setDays((data ?? []) as HeatmapDay[])
    }

    setLoading(false)
    setRefreshing(false)
  }, [period])

  useEffect(() => {
    void loadHeatmap()
  }, [loadHeatmap])

  const maximumSeconds = useMemo(() => {
    return Math.max(
      1,
      ...days.map((day) => Number(day.total_seconds) || 0),
    )
  }, [days])

  const totalStudiedDays = useMemo(() => {
    return days.filter(
      (day) => Number(day.total_seconds) > 0,
    ).length
  }, [days])

  const totalSeconds = useMemo(() => {
    return days.reduce(
      (sum, day) => sum + Number(day.total_seconds || 0),
      0,
    )
  }, [days])

  const monthMarkers = useMemo(() => {
    const markers: Array<{
      index: number
      label: string
    }> = []

    let previousMonth = ''

    days.forEach((day, index) => {
      const currentMonth = day.study_date.slice(0, 7)

      if (currentMonth !== previousMonth) {
        markers.push({
          index,
          label: formatMonth(day.study_date),
        })

        previousMonth = currentMonth
      }
    })

    return markers
  }, [days])

  if (loading) {
    return (
      <section className="study-heatmap-loading">
        <LoaderCircle className="spin-icon" size={21} />
        در حال آماده‌سازی تقویم مطالعه...
      </section>
    )
  }

  return (
    <section className="study-heatmap-card">
      <header className="study-heatmap-heading">
        <div>
          <p>
            <CalendarDays size={18} />
            تقویم استمرار
          </p>

          <h2>Study Heatmap</h2>
        </div>

        <button
          type="button"
          disabled={refreshing}
          onClick={() => void loadHeatmap()}
          aria-label="به‌روزرسانی تقویم"
        >
          {refreshing ? (
            <LoaderCircle className="spin-icon" size={18} />
          ) : (
            <RefreshCw size={18} />
          )}
        </button>
      </header>

      <div className="heatmap-period-tabs">
        <button
          type="button"
          className={period === 90 ? 'selected' : ''}
          onClick={() => setPeriod(90)}
        >
          ۳ ماه
        </button>

        <button
          type="button"
          className={period === 180 ? 'selected' : ''}
          onClick={() => setPeriod(180)}
        >
          ۶ ماه
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
        <div className="study-heatmap-message">{message}</div>
      )}

      <div className="heatmap-summary">
        <span>
          <strong>
            {totalStudiedDays.toLocaleString('fa-IR')}
          </strong>
          روز فعال
        </span>

        <span>
          <strong>{formatDuration(totalSeconds)}</strong>
          مجموع مطالعه
        </span>

        <span>
          <strong>
            {Math.round(
              (totalStudiedDays / Math.max(days.length, 1)) * 100,
            ).toLocaleString('fa-IR')}
            ٪
          </strong>
          استمرار این بازه
        </span>
      </div>

      <div className="heatmap-scroll-area">
        <div className="heatmap-month-labels">
          {monthMarkers.map((marker) => (
            <span
              key={`${marker.index}-${marker.label}`}
              style={{
                gridColumnStart:
                  Math.floor(marker.index / 7) + 1,
              }}
            >
              {marker.label}
            </span>
          ))}
        </div>

        <div className="heatmap-layout">
          <div className="heatmap-weekdays">
            <span>ش</span>
            <span>ی</span>
            <span>د</span>
            <span>س</span>
            <span>چ</span>
            <span>پ</span>
            <span>ج</span>
          </div>

          <div className="heatmap-grid">
            {days.map((day) => {
              const intensity = getIntensity(
                Number(day.total_seconds),
                maximumSeconds,
              )

              return (
                <button
                  type="button"
                  key={day.study_date}
                  className={`heatmap-cell heatmap-level-${intensity}`}
                  title={`${formatFullDate(
                    day.study_date,
                  )} — ${formatDuration(day.total_seconds)}`}
                  aria-label={`${formatFullDate(
                    day.study_date,
                  )}، ${formatDuration(day.total_seconds)}`}
                  onClick={() => setSelectedDay(day)}
                />
              )
            })}
          </div>
        </div>
      </div>

      <div className="heatmap-legend">
        <span>کمتر</span>

        <i className="heatmap-level-0" />
        <i className="heatmap-level-1" />
        <i className="heatmap-level-2" />
        <i className="heatmap-level-3" />
        <i className="heatmap-level-4" />
        <i className="heatmap-level-5" />

        <span>بیشتر</span>
      </div>

      {selectedDay && (
        <div className="heatmap-detail-layer">
          <button
            type="button"
            className="heatmap-detail-backdrop"
            aria-label="بستن جزئیات روز"
            onClick={() => setSelectedDay(null)}
          />

          <article className="heatmap-detail-sheet">
            <button
              type="button"
              className="heatmap-detail-close"
              aria-label="بستن"
              onClick={() => setSelectedDay(null)}
            >
              <X size={18} />
            </button>

            <span className="heatmap-detail-icon">
              <CalendarDays size={29} />
            </span>

            <small>جزئیات مطالعه</small>

            <h2>{formatFullDate(selectedDay.study_date)}</h2>

            <div className="heatmap-detail-stats">
              <span>
                <Clock3 size={19} />

                <span>
                  <small>زمان مطالعه</small>
                  <strong>
                    {formatDuration(selectedDay.total_seconds)}
                  </strong>
                </span>
              </span>

              <span>
                <CalendarDays size={19} />

                <span>
                  <small>تعداد جلسات</small>
                  <strong>
                    {Number(
                      selectedDay.session_count,
                    ).toLocaleString('fa-IR')}
                  </strong>
                </span>
              </span>

              <span>
                <CheckCircle2 size={19} />

                <span>
                  <small>پارت تکمیل‌شده</small>
                  <strong>
                    {Number(
                      selectedDay.completed_sessions,
                    ).toLocaleString('fa-IR')}
                  </strong>
                </span>
              </span>
            </div>

            {Number(selectedDay.total_seconds) <= 0 && (
              <p className="heatmap-no-study">
                در این روز مطالعه‌ای ثبت نشده است.
              </p>
            )}

            <button
              type="button"
              className="heatmap-detail-confirm"
              onClick={() => setSelectedDay(null)}
            >
              بستن
            </button>
          </article>
        </div>
      )}
    </section>
  )
}
