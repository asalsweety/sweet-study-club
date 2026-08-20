import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  Clock3,
  LoaderCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

type StudyDNAResult = {
  dna_code: string
  dna_title: string
  dna_icon: string
  dna_description: string
  confidence_percent: number
  total_completed_sessions: number
  average_session_minutes: number
  favorite_period: string
}

export default function StudyDNA() {
  const [result, setResult] = useState<StudyDNAResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState('')

  const loadStudyDNA = useCallback(async () => {
    setRefreshing(true)
    setMessage('')

    const { data, error } = await supabase.rpc(
      'get_my_study_dna',
    )

    if (error) {
      setMessage(error.message)
    } else {
      const firstRow = Array.isArray(data) ? data[0] : null
      setResult((firstRow ?? null) as StudyDNAResult | null)
    }

    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    void loadStudyDNA()
  }, [loadStudyDNA])

  if (loading) {
    return (
      <section className="study-dna-loading">
        <LoaderCircle className="spin-icon" size={20} />
        در حال تحلیل Study DNA...
      </section>
    )
  }

  if (!result) {
    return (
      <section className="study-dna-message">
        تحلیل الگوی مطالعه در دسترس نیست.
      </section>
    )
  }

  return (
    <section className="study-dna-card">
      <div className="study-dna-heading">
        <div>
          <p>
            <Sparkles size={17} />
            تحلیل شخصی مطالعه
          </p>

          <h2>Study DNA</h2>
        </div>

        <button
          type="button"
          disabled={refreshing}
          onClick={() => void loadStudyDNA()}
          aria-label="به‌روزرسانی تحلیل"
        >
          {refreshing ? (
            <LoaderCircle className="spin-icon" size={18} />
          ) : (
            <RefreshCw size={18} />
          )}
        </button>
      </div>

      {message && (
        <div className="study-dna-message">{message}</div>
      )}

      <div className="study-dna-main">
        <span className="study-dna-icon">
          {result.dna_icon}
        </span>

        <div>
          <small>الگوی فعلی تو</small>
          <strong>{result.dna_title}</strong>
          <p>{result.dna_description}</p>
        </div>
      </div>

      <div className="study-dna-confidence">
        <div>
          <span>اطمینان تحلیل</span>

          <strong>
            {result.confidence_percent.toLocaleString('fa-IR')}٪
          </strong>
        </div>

        <div className="study-dna-progress">
          <i
            style={{
              width: `${result.confidence_percent}%`,
            }}
          />
        </div>
      </div>

      <div className="study-dna-details">
        <span>
          <Activity size={17} />

          <span>
            <small>جلسات بررسی‌شده</small>
            <strong>
              {result.total_completed_sessions.toLocaleString(
                'fa-IR',
              )}
            </strong>
          </span>
        </span>

        <span>
          <Clock3 size={17} />

          <span>
            <small>میانگین هر جلسه</small>
            <strong>
              {result.average_session_minutes.toLocaleString(
                'fa-IR',
              )}{' '}
              دقیقه
            </strong>
          </span>
        </span>

        <span>
          <Sparkles size={17} />

          <span>
            <small>زمان محبوب</small>
            <strong>{result.favorite_period}</strong>
          </span>
        </span>
      </div>

      {result.confidence_percent < 50 && (
        <p className="study-dna-note">
          با ثبت مطالعه‌های بیشتر، این تحلیل دقیق‌تر می‌شود.
        </p>
      )}
    </section>
  )
}
