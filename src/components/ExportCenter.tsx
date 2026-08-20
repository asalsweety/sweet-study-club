import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Image,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Share2,
  Sparkles,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

type ReportPeriod = 'weekly' | 'monthly'

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

type StudyDNA = {
  dna_code: string
  dna_title: string
  dna_icon: string
  dna_description: string
  confidence_percent: number
  total_completed_sessions: number
  average_session_minutes: number
  favorite_period: string
}

type UserProgress = {
  total_xp: number
  current_level: number
  unlocked_achievements: number
}

type StudyLogExport = {
  started_at: string
  subject_name: string | null
  duration_seconds: number
  status: string
  session_id: string | null
}

type ExportCenterProps = {
  displayName: string
}

function formatDuration(
  value: number | string | null | undefined,
) {
  const seconds = Math.max(0, Number(value) || 0)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours.toLocaleString(
      'fa-IR',
    )} ساعت و ${minutes.toLocaleString('fa-IR')} دقیقه`
  }

  return `${minutes.toLocaleString('fa-IR')} دقیقه`
}

function formatCompactDuration(
  value: number | string | null | undefined,
) {
  const seconds = Math.max(0, Number(value) || 0)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours.toLocaleString(
      'fa-IR',
    )}س ${minutes.toLocaleString('fa-IR')}د`
  }

  return `${minutes.toLocaleString('fa-IR')}د`
}

function formatPersianDate(value: string | null) {
  if (!value) return 'هنوز ثبت نشده'

  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Tehran',
  }).format(new Date(`${value}T12:00:00+03:30`))
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('fa-IR', {
    month: 'numeric',
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

function escapeCsvValue(value: string | number | null) {
  const text = value === null ? '' : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1000)
}

function currentFileDate() {
  return new Date().toISOString().slice(0, 10)
}

export default function ExportCenter({
  displayName,
}: ExportCenterProps) {
  const reportRef = useRef<HTMLDivElement | null>(null)
  const shareCardRef = useRef<HTMLDivElement | null>(null)

  const [period, setPeriod] =
    useState<ReportPeriod>('weekly')

  const [dailyData, setDailyData] = useState<DailyAnalytics[]>(
    [],
  )

  const [subjectData, setSubjectData] = useState<
    SubjectAnalytics[]
  >([])

  const [summary, setSummary] =
    useState<AnalyticsSummary | null>(null)

  const [studyDNA, setStudyDNA] =
    useState<StudyDNA | null>(null)

  const [progress, setProgress] =
    useState<UserProgress | null>(null)

  const [loading, setLoading] = useState(true)
  const [workingAction, setWorkingAction] =
    useState<string | null>(null)

  const [message, setMessage] = useState('')

  const requestedDays = period === 'weekly' ? 7 : 30

  const loadExportData = useCallback(async () => {
    setLoading(true)
    setMessage('')

    const [
      dailyResult,
      subjectResult,
      summaryResult,
      dnaResult,
      progressResult,
    ] = await Promise.all([
      supabase.rpc('get_my_daily_analytics', {
        requested_days: requestedDays,
      }),

      supabase.rpc('get_my_subject_analytics', {
        requested_days: requestedDays,
      }),

      supabase.rpc('get_my_analytics_summary'),

      supabase.rpc('get_my_study_dna'),

      supabase
        .from('user_progress')
        .select(
          'total_xp, current_level, unlocked_achievements',
        )
        .maybeSingle(),
    ])

    const firstError =
      dailyResult.error ||
      subjectResult.error ||
      summaryResult.error ||
      dnaResult.error ||
      progressResult.error

    if (firstError) {
      setMessage(firstError.message)
      setLoading(false)
      return
    }

    setDailyData(
      (dailyResult.data ?? []) as DailyAnalytics[],
    )

    setSubjectData(
      (subjectResult.data ?? []) as SubjectAnalytics[],
    )

    setSummary(
      (Array.isArray(summaryResult.data)
        ? summaryResult.data[0]
        : null) as AnalyticsSummary | null,
    )

    setStudyDNA(
      (Array.isArray(dnaResult.data)
        ? dnaResult.data[0]
        : null) as StudyDNA | null,
    )

    setProgress(
      progressResult.data as UserProgress | null,
    )

    setLoading(false)
  }, [requestedDays])

  useEffect(() => {
    void loadExportData()
  }, [loadExportData])

  const reportTotalSeconds = useMemo(() => {
    return dailyData.reduce(
      (sum, item) =>
        sum + Number(item.total_seconds || 0),
      0,
    )
  }, [dailyData])

  const reportSessionCount = useMemo(() => {
    return dailyData.reduce(
      (sum, item) =>
        sum + Number(item.session_count || 0),
      0,
    )
  }, [dailyData])

  const activeDays = useMemo(() => {
    return dailyData.filter(
      (item) => Number(item.total_seconds) > 0,
    ).length
  }, [dailyData])

  const maximumDaySeconds = useMemo(() => {
    return Math.max(
      1,
      ...dailyData.map((item) =>
        Number(item.total_seconds),
      ),
    )
  }, [dailyData])

  const topSubjects = useMemo(() => {
    return subjectData.slice(0, 5)
  }, [subjectData])

  const comparisonPercent =
    period === 'weekly'
      ? Number(summary?.week_change_percent ?? 0)
      : Number(summary?.month_change_percent ?? 0)

  const reportTitle =
    period === 'weekly'
      ? 'گزارش هفتگی مطالعه'
      : 'گزارش ماهانه مطالعه'

  const reportEnglishTitle =
    period === 'weekly'
      ? 'Weekly Study Report'
      : 'Monthly Study Report'

  const createCanvas = async (
    element: HTMLElement,
    scale = 2,
  ) => {
    await document.fonts.ready

    return html2canvas(element, {
      scale,
      backgroundColor: '#fff8fb',
      useCORS: true,
      logging: false,
      imageTimeout: 15000,
      scrollX: 0,
      scrollY: 0,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    })
  }

  const downloadPdf = async () => {
    if (!reportRef.current || workingAction) return

    setWorkingAction('pdf')
    setMessage('در حال ساخت گزارش PDF...')

    try {
      const canvas = await createCanvas(
        reportRef.current,
        2,
      )

      const imageData = canvas.toDataURL(
        'image/jpeg',
        0.96,
      )

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      })

      const pageWidth =
        pdf.internal.pageSize.getWidth()

      const pageHeight =
        pdf.internal.pageSize.getHeight()

      const margin = 8
      const usableWidth = pageWidth - margin * 2
      const usableHeight = pageHeight - margin * 2

      const imageHeight =
        (canvas.height * usableWidth) / canvas.width

      let remainingHeight = imageHeight
      let imagePosition = margin

      pdf.addImage(
        imageData,
        'JPEG',
        margin,
        imagePosition,
        usableWidth,
        imageHeight,
        undefined,
        'FAST',
      )

      remainingHeight -= usableHeight

      while (remainingHeight > 0) {
        pdf.addPage()

        imagePosition =
          margin - (imageHeight - remainingHeight)

        pdf.addImage(
          imageData,
          'JPEG',
          margin,
          imagePosition,
          usableWidth,
          imageHeight,
          undefined,
          'FAST',
        )

        remainingHeight -= usableHeight
      }

      const filePrefix =
        period === 'weekly'
          ? 'sweet-study-weekly-report'
          : 'sweet-study-monthly-report'

      pdf.save(
        `${filePrefix}-${currentFileDate()}.pdf`,
      )

      setMessage('گزارش PDF با موفقیت ساخته شد 🎀')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'ساخت گزارش PDF ناموفق بود.',
      )
    }

    setWorkingAction(null)
  }

  const downloadShareCard = async () => {
    if (!shareCardRef.current || workingAction) return

    setWorkingAction('share')
    setMessage('در حال ساخت کارت اشتراک‌گذاری...')

    try {
      const canvas = await createCanvas(
        shareCardRef.current,
        1,
      )

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setMessage('ساخت تصویر ناموفق بود.')
            setWorkingAction(null)
            return
          }

          downloadBlob(
            blob,
            `sweet-study-card-${currentFileDate()}.png`,
          )

          setMessage(
            'کارت اشتراک‌گذاری ذخیره شد 🌸',
          )

          setWorkingAction(null)
        },
        'image/png',
        1,
      )
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'ساخت کارت اشتراک‌گذاری ناموفق بود.',
      )

      setWorkingAction(null)
    }
  }

  const shareCard = async () => {
    if (!shareCardRef.current || workingAction) return

    setWorkingAction('native-share')
    setMessage('در حال آماده‌سازی اشتراک‌گذاری...')

    try {
      const canvas = await createCanvas(
        shareCardRef.current,
        1,
      )

      const blob = await new Promise<Blob | null>(
        (resolve) => {
          canvas.toBlob(resolve, 'image/png', 1)
        },
      )

      if (!blob) {
        throw new Error('فایل تصویر ساخته نشد.')
      }

      const file = new File(
        [blob],
        `sweet-study-card-${currentFileDate()}.png`,
        {
          type: 'image/png',
        },
      )

      if (
        navigator.share &&
        navigator.canShare?.({
          files: [file],
        })
      ) {
        await navigator.share({
          title: 'Sweet Study Club',
          text: 'گزارش پیشرفت مطالعه من',
          files: [file],
        })

        setMessage('کارت آماده اشتراک‌گذاری شد 🎀')
      } else {
        downloadBlob(blob, file.name)

        setMessage(
          'اشتراک مستقیم پشتیبانی نشد؛ تصویر دانلود شد.',
        )
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === 'AbortError'
      ) {
        setMessage('')
      } else {
        setMessage(
          error instanceof Error
            ? error.message
            : 'اشتراک‌گذاری ناموفق بود.',
        )
      }
    }

    setWorkingAction(null)
  }

  const downloadCsv = async () => {
    if (workingAction) return

    setWorkingAction('csv')
    setMessage('در حال آماده‌سازی فایل CSV...')

    const { data, error } = await supabase
      .from('study_logs')
      .select(
        'started_at, subject_name, duration_seconds, status, session_id',
      )
      .order('started_at', { ascending: false })

    if (error) {
      setMessage(error.message)
      setWorkingAction(null)
      return
    }

    const logs = (data ?? []) as StudyLogExport[]

    const header = [
      'تاریخ',
      'ساعت شروع',
      'نام درس',
      'مدت مطالعه به دقیقه',
      'وضعیت',
      'نوع مطالعه',
    ]

    const rows = logs.map((log) => {
      const startedAt = new Date(log.started_at)

      const date = new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Tehran',
      }).format(startedAt)

      const time = new Intl.DateTimeFormat('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Tehran',
      }).format(startedAt)

      return [
        date,
        time,
        log.subject_name ?? 'بدون نام درس',
        Math.round(
          Number(log.duration_seconds || 0) / 60,
        ),
        log.status,
        log.session_id ? 'پارت درسی' : 'مطالعه آزاد',
      ]
    })

    const csv = [
      header.map(escapeCsvValue).join(','),
      ...rows.map((row) =>
        row.map(escapeCsvValue).join(','),
      ),
    ].join('\n')

    const blob = new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8',
    })

    downloadBlob(
      blob,
      `sweet-study-data-${currentFileDate()}.csv`,
    )

    setMessage('فایل CSV ذخیره شد 📊')
    setWorkingAction(null)
  }

  if (loading) {
    return (
      <section className="export-center-loading">
        <LoaderCircle className="spin-icon" size={21} />
        در حال آماده‌سازی مرکز خروجی...
      </section>
    )
  }

  return (
    <section className="export-center">
      <header className="export-center-heading">
        <div>
          <p>
            <Sparkles size={18} />
            گزارش و اشتراک‌گذاری
          </p>

          <h2>Export Center</h2>
        </div>

        <button
          type="button"
          aria-label="به‌روزرسانی اطلاعات"
          onClick={() => void loadExportData()}
        >
          <RefreshCw size={18} />
        </button>
      </header>

      <div className="export-period-selector">
        <button
          type="button"
          className={
            period === 'weekly' ? 'selected' : ''
          }
          onClick={() => setPeriod('weekly')}
        >
          گزارش هفتگی
        </button>

        <button
          type="button"
          className={
            period === 'monthly' ? 'selected' : ''
          }
          onClick={() => setPeriod('monthly')}
        >
          گزارش ماهانه
        </button>
      </div>

      {message && (
        <div className="export-center-message">
          {message}
        </div>
      )}

      <div className="export-options-grid">
        <article>
          <span className="export-option-icon">
            <FileText size={24} />
          </span>

          <div>
            <strong>{reportTitle}</strong>
            <p>
              گزارش کامل آمار، نمودارها، درس‌ها،
              Level و Study DNA
            </p>
          </div>

          <button
            type="button"
            disabled={workingAction !== null}
            onClick={() => void downloadPdf()}
          >
            {workingAction === 'pdf' ? (
              <LoaderCircle
                className="spin-icon"
                size={18}
              />
            ) : (
              <Download size={18} />
            )}
            PDF
          </button>
        </article>

        <article>
          <span className="export-option-icon">
            <Image size={24} />
          </span>

          <div>
            <strong>کارت اشتراک‌گذاری</strong>
            <p>
              کارت عمودی مناسب پست و اشتراک در
              شبکه‌های اجتماعی
            </p>
          </div>

          <div className="export-double-actions">
            <button
              type="button"
              disabled={workingAction !== null}
              onClick={() =>
                void downloadShareCard()
              }
            >
              {workingAction === 'share' ? (
                <LoaderCircle
                  className="spin-icon"
                  size={17}
                />
              ) : (
                <Download size={17} />
              )}
            </button>

            <button
              type="button"
              disabled={workingAction !== null}
              onClick={() => void shareCard()}
            >
              {workingAction === 'native-share' ? (
                <LoaderCircle
                  className="spin-icon"
                  size={17}
                />
              ) : (
                <Share2 size={17} />
              )}
            </button>
          </div>
        </article>

        <article>
          <span className="export-option-icon">
            <FileSpreadsheet size={24} />
          </span>

          <div>
            <strong>خروجی CSV</strong>
            <p>
              تاریخچه مطالعه برای Excel و Google
              Sheets
            </p>
          </div>

          <button
            type="button"
            disabled={workingAction !== null}
            onClick={() => void downloadCsv()}
          >
            {workingAction === 'csv' ? (
              <LoaderCircle
                className="spin-icon"
                size={18}
              />
            ) : (
              <Download size={18} />
            )}
            CSV
          </button>
        </article>

        <article className="export-premium-note">
          <span className="export-option-icon">
            <LockKeyhole size={24} />
          </span>

          <div>
            <strong>Sweet Plus</strong>
            <p>
              بعداً گزارش‌های Premium و قالب‌های
              اختصاصی از همین بخش کنترل می‌شوند.
            </p>
          </div>
        </article>
      </div>

      <div className="export-preview-card">
        <div>
          <BarChart3 size={22} />
          <span>
            <small>مجموع این گزارش</small>
            <strong>
              {formatDuration(reportTotalSeconds)}
            </strong>
          </span>
        </div>

        <div>
          <CalendarDays size={22} />
          <span>
            <small>روزهای فعال</small>
            <strong>
              {activeDays.toLocaleString('fa-IR')}
            </strong>
          </span>
        </div>

        <div>
          <CheckCircle2 size={22} />
          <span>
            <small>تعداد جلسات</small>
            <strong>
              {reportSessionCount.toLocaleString(
                'fa-IR',
              )}
            </strong>
          </span>
        </div>
      </div>

      {/* PDF report - hidden outside viewport */}
      <div
        className="export-render-root"
        aria-hidden="true"
      >
        <div
          className="sweet-pdf-report"
          ref={reportRef}
          dir="rtl"
        >
          <header className="pdf-report-header">
            <div>
              <span>Sweet Study Club</span>
              <h1>{reportTitle}</h1>
              <p>{reportEnglishTitle}</p>
            </div>

            <div className="pdf-brand-mark">
              SSC
            </div>
          </header>

          <section className="pdf-user-banner">
            <div>
              <small>گزارش مطالعه</small>
              <strong>{displayName}</strong>
            </div>

            <span>
              {new Intl.DateTimeFormat('fa-IR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'Asia/Tehran',
              }).format(new Date())}
            </span>
          </section>

          <section className="pdf-summary-grid">
            <article>
              <small>مجموع مطالعه</small>
              <strong>
                {formatDuration(reportTotalSeconds)}
              </strong>
            </article>

            <article>
              <small>روزهای فعال</small>
              <strong>
                {activeDays.toLocaleString('fa-IR')}
              </strong>
            </article>

            <article>
              <small>تعداد جلسات</small>
              <strong>
                {reportSessionCount.toLocaleString(
                  'fa-IR',
                )}
              </strong>
            </article>

            <article>
              <small>رشد نسبت به قبل</small>
              <strong>
                {comparisonPercent > 0 ? '+' : ''}
                {comparisonPercent.toLocaleString(
                  'fa-IR',
                )}
                ٪
              </strong>
            </article>
          </section>

          <section className="pdf-section">
            <div className="pdf-section-title">
              <span>01</span>
              <div>
                <small>Daily Performance</small>
                <h2>عملکرد روزانه</h2>
              </div>
            </div>

            <div className="pdf-daily-chart">
              {dailyData.map((day) => {
                const seconds = Number(
                  day.total_seconds,
                )

                const height =
                  seconds <= 0
                    ? 4
                    : Math.max(
                        10,
                        Math.round(
                          (seconds /
                            maximumDaySeconds) *
                            100,
                        ),
                      )

                return (
                  <div key={day.study_date}>
                    <span>
                      {formatCompactDuration(
                        seconds,
                      )}
                    </span>

                    <i>
                      <b
                        style={{
                          height: `${height}%`,
                        }}
                      />
                    </i>

                    <small>
                      {period === 'weekly'
                        ? weekDayLabel(
                            day.study_date,
                          )
                        : formatShortDate(
                            day.study_date,
                          )}
                    </small>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="pdf-section">
            <div className="pdf-section-title">
              <span>02</span>

              <div>
                <small>Study Highlights</small>
                <h2>رکوردهای این دوره</h2>
              </div>
            </div>

            <div className="pdf-highlight-grid">
              <article>
                <small>بهترین روز</small>
                <strong>
                  {formatPersianDate(
                    summary?.best_day_date ?? null,
                  )}
                </strong>
                <p>
                  {formatDuration(
                    summary?.best_day_seconds,
                  )}
                </p>
              </article>

              <article>
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
              </article>

              <article>
                <small>طولانی‌ترین جلسه</small>
                <strong>
                  {formatDuration(
                    summary?.longest_session_seconds,
                  )}
                </strong>
                <p>
                  {summary?.longest_session_subject ??
                    'بدون نام درس'}
                </p>
              </article>

              <article>
                <small>میانگین روز فعال</small>
                <strong>
                  {formatDuration(
                    summary?.average_active_day_seconds,
                  )}
                </strong>
                <p>
                  {Number(
                    summary?.active_days_last_30 ??
                      0,
                  ).toLocaleString('fa-IR')}{' '}
                  روز فعال
                </p>
              </article>
            </div>
          </section>

          <section className="pdf-section">
            <div className="pdf-section-title">
              <span>03</span>

              <div>
                <small>Subjects</small>
                <h2>تقسیم زمان درس‌ها</h2>
              </div>
            </div>

            <div className="pdf-subject-list">
              {topSubjects.length === 0 ? (
                <p>هنوز درس مشخصی ثبت نشده است.</p>
              ) : (
                topSubjects.map((subject) => (
                  <article
                    key={subject.subject_name}
                  >
                    <div>
                      <strong>
                        {subject.subject_name}
                      </strong>

                      <span>
                        {Number(
                          subject.percentage_of_total,
                        ).toLocaleString(
                          'fa-IR',
                        )}
                        ٪
                      </span>
                    </div>

                    <i>
                      <b
                        style={{
                          width: `${Math.max(
                            4,
                            Number(
                              subject.percentage_of_total,
                            ),
                          )}%`,
                        }}
                      />
                    </i>

                    <small>
                      {formatDuration(
                        subject.total_seconds,
                      )}
                      {' - '}
                      {Number(
                        subject.session_count,
                      ).toLocaleString(
                        'fa-IR',
                      )}{' '}
                      جلسه
                    </small>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="pdf-profile-summary">
            <article>
              <span>
                {studyDNA?.dna_icon ?? '🌱'}
              </span>

              <div>
                <small>Study DNA</small>
                <strong>
                  {studyDNA?.dna_title ??
                    'در حال کشف'}
                </strong>
                <p>
                  {studyDNA?.dna_description ??
                    'با مطالعه بیشتر، تحلیل دقیق‌تر می‌شود.'}
                </p>
              </div>
            </article>

            <article>
              <span>✦</span>

              <div>
                <small>Level & XP</small>
                <strong>
                  Level{' '}
                  {Number(
                    progress?.current_level ?? 1,
                  ).toLocaleString('fa-IR')}
                </strong>
                <p>
                  {Number(
                    progress?.total_xp ?? 0,
                  ).toLocaleString('fa-IR')}{' '}
                  XP -{' '}
                  {Number(
                    progress?.unlocked_achievements ??
                      0,
                  ).toLocaleString('fa-IR')}{' '}
                  دستاورد
                </p>
              </div>
            </article>
          </section>

          <footer className="pdf-report-footer">
            <span>
              Generated by Sweet Study Club
            </span>

            <span>
              Focus more. Scroll less.
            </span>
          </footer>
        </div>

        {/* Social share card */}
        <div
          className="sweet-share-card"
          ref={shareCardRef}
          dir="rtl"
        >
          <div className="share-card-decoration share-decoration-one" />
          <div className="share-card-decoration share-decoration-two" />

          <header>
            <span>Sweet Study Club</span>
            <b>SSC</b>
          </header>

          <main>
            <small>پیشرفت مطالعه من</small>

            <h1>{displayName}</h1>

            <div className="share-main-number">
              <strong>
                {formatCompactDuration(
                  reportTotalSeconds,
                )}
              </strong>

              <span>
                {period === 'weekly'
                  ? 'مطالعه در این هفته'
                  : 'مطالعه در این ماه'}
              </span>
            </div>

            <div className="share-card-stats">
              <article>
                <strong>
                  {activeDays.toLocaleString('fa-IR')}
                </strong>
                <span>روز فعال</span>
              </article>

              <article>
                <strong>
                  {reportSessionCount.toLocaleString(
                    'fa-IR',
                  )}
                </strong>
                <span>جلسه</span>
              </article>

              <article>
                <strong>
                  Level{' '}
                  {Number(
                    progress?.current_level ?? 1,
                  ).toLocaleString('fa-IR')}
                </strong>
                <span>
                  {Number(
                    progress?.total_xp ?? 0,
                  ).toLocaleString('fa-IR')}{' '}
                  XP
                </span>
              </article>
            </div>

            <div className="share-study-dna">
              <span>
                {studyDNA?.dna_icon ?? '🌱'}
              </span>

              <div>
                <small>Study DNA</small>
                <strong>
                  {studyDNA?.dna_title ??
                    'Discovering'}
                </strong>
              </div>
            </div>

            <div className="share-top-subject">
              <small>درس با بیشترین مطالعه</small>

              <strong>
                {summary?.most_studied_subject ??
                  'در حال ثبت مسیر'}
              </strong>
            </div>
          </main>

          <footer>
            <span>Focus more. Scroll less.</span>
            <strong>Sweet Study Club</strong>
          </footer>
        </div>
      </div>
    </section>
  )
}
