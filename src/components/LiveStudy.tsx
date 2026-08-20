import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Coffee,
  Eye,
  LoaderCircle,
  RefreshCw,
  Timer,
  UsersRound,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

type LiveStudyMember = {
  user_id: string
  display_name: string
  avatar_url: string | null
  presence_status: 'online' | 'studying' | 'break'
  study_mode: 'free' | 'scheduled' | 'pomodoro' | null
  subject_name: string | null
  current_duration_seconds: number | null
  current_streak: number | null
  last_seen_at: string
}

type LiveStudyProps = {
  currentUserId: string
}

function firstLetter(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || '?'
}

function formatDuration(seconds: number | null) {
  if (seconds === null) return null

  const safeSeconds = Math.max(0, Math.floor(seconds))
  const hours = String(Math.floor(safeSeconds / 3600)).padStart(2, '0')
  const minutes = String(
    Math.floor((safeSeconds % 3600) / 60),
  ).padStart(2, '0')
  const remainingSeconds = String(safeSeconds % 60).padStart(2, '0')

  return `${hours}:${minutes}:${remainingSeconds}`
}

function modeLabel(mode: LiveStudyMember['study_mode']) {
  if (mode === 'free') return 'مطالعه آزاد'
  if (mode === 'scheduled') return 'پارت درسی'
  if (mode === 'pomodoro') return 'پومودورو'
  return null
}

export default function LiveStudy({
  currentUserId,
}: LiveStudyProps) {
  const [members, setMembers] = useState<LiveStudyMember[]>([])
  const [onlyStudying, setOnlyStudying] = useState(true)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState('')
  const [fetchedAt, setFetchedAt] = useState(Date.now())
  const [clock, setClock] = useState(Date.now())

  const loadMembers = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    setMessage('')

    const { data, error } = await supabase.rpc(
      'get_live_study_members',
    )

    if (error) {
      setMessage(error.message)
    } else {
      setMembers((data ?? []) as LiveStudyMember[])
      setFetchedAt(Date.now())
    }

    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    void loadMembers()

    const refreshInterval = window.setInterval(() => {
      void loadMembers(true)
    }, 30_000)

    return () => window.clearInterval(refreshInterval)
  }, [loadMembers])

  useEffect(() => {
    const timerInterval = window.setInterval(() => {
      setClock(Date.now())
    }, 1000)

    return () => window.clearInterval(timerInterval)
  }, [])

  const visibleMembers = useMemo(() => {
    const filteredMembers = onlyStudying
      ? members.filter(
          (member) =>
            member.presence_status === 'studying' ||
            member.presence_status === 'break',
        )
      : members

    return [...filteredMembers].sort((first, second) => {
      if (first.user_id === currentUserId) return -1
      if (second.user_id === currentUserId) return 1

      const statusOrder = {
        studying: 1,
        break: 2,
        online: 3,
      }

      const statusDifference =
        statusOrder[first.presence_status] -
        statusOrder[second.presence_status]

      if (statusDifference !== 0) return statusDifference

      return first.display_name.localeCompare(
        second.display_name,
        'fa',
      )
    })
  }, [currentUserId, members, onlyStudying])

  const studyingCount = members.filter(
    (member) => member.presence_status === 'studying',
  ).length

  const onlineCount = members.length

  const elapsedSinceFetch = Math.max(
    0,
    Math.floor((clock - fetchedAt) / 1000),
  )

  return (
    <section className="live-study-card">
      <div className="live-study-heading">
        <div>
          <p>
            <span className="live-pulse" />
            اتاق مطالعه زنده
          </p>

          <h2>Live Study</h2>
        </div>

        <button
          type="button"
          className="live-refresh-button"
          disabled={refreshing}
          onClick={() => void loadMembers()}
        >
          {refreshing ? (
            <LoaderCircle className="spin-icon" size={18} />
          ) : (
            <RefreshCw size={18} />
          )}
        </button>
      </div>

      <div className="live-study-summary">
        <span>
          <BookOpen size={18} />
          {studyingCount.toLocaleString('fa-IR')} نفر در حال مطالعه
        </span>

        <span>
          <UsersRound size={18} />
          {onlineCount.toLocaleString('fa-IR')} نفر آنلاین
        </span>
      </div>

      <button
        type="button"
        className={`studying-filter ${
          onlyStudying ? 'selected' : ''
        }`}
        onClick={() => setOnlyStudying((current) => !current)}
      >
        <Eye size={17} />
        {onlyStudying
          ? 'فقط افراد در حال مطالعه'
          : 'نمایش همه افراد آنلاین'}
      </button>

      {message && <div className="live-study-message">{message}</div>}

      {loading ? (
        <div className="live-study-empty">
          <LoaderCircle className="spin-icon" size={23} />
          در حال بارگذاری اعضا...
        </div>
      ) : visibleMembers.length === 0 ? (
        <div className="live-study-empty">
          فعلاً کسی در حال مطالعه نیست؛ تو شروع‌کننده باش 🌸
        </div>
      ) : (
        <div className="live-study-list">
          {visibleMembers.map((member) => {
            const isCurrentUser =
              member.user_id === currentUserId

            const visibleDuration =
              member.current_duration_seconds === null
                ? null
                : member.current_duration_seconds +
                  (member.presence_status === 'studying'
                    ? elapsedSinceFetch
                    : 0)

            return (
              <article
                className={`live-study-member ${
                  member.presence_status === 'studying'
                    ? 'is-studying'
                    : member.presence_status === 'break'
                      ? 'is-on-break'
                      : 'is-online'
                }`}
                key={member.user_id}
              >
                <div className="live-avatar-wrapper">
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.display_name}
                    />
                  ) : (
                    <span>
                      {firstLetter(member.display_name)}
                    </span>
                  )}

                  <i />
                </div>

                <div className="live-member-information">
                  <div className="live-member-name">
                    <strong>
                      {member.display_name}
                      {isCurrentUser ? ' • شما' : ''}
                    </strong>

                    {member.current_streak !== null && (
                      <span>
                        🔥{' '}
                        {member.current_streak.toLocaleString(
                          'fa-IR',
                        )}
                      </span>
                    )}
                  </div>

                  {member.presence_status === 'studying' && (
                    <>
                      <small>
                        <BookOpen size={15} />
                        {member.subject_name ??
                          'در حال مطالعه'}
                      </small>

                      {modeLabel(member.study_mode) && (
                        <small>
                          {modeLabel(member.study_mode)}
                        </small>
                      )}
                    </>
                  )}

                  {member.presence_status === 'break' && (
                    <small>
                      <Coffee size={15} />
                      در حال استراحت
                      {member.subject_name
                        ? ` • ${member.subject_name}`
                        : ''}
                    </small>
                  )}

                  {member.presence_status === 'online' && (
                    <small>آنلاین</small>
                  )}
                </div>

                {visibleDuration !== null && (
                  <div className="live-duration">
                    <Timer size={16} />
                    <strong>
                      {formatDuration(visibleDuration)}
                    </strong>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
