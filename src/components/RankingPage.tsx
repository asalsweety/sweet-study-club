import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowUp,
  Crown,
  LoaderCircle,
  RefreshCw,
  Trophy,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

type RankingPeriod = 'today' | 'week' | 'month'

type LeaderboardMember = {
  user_id: string
  display_name: string
  avatar_url: string | null
  current_streak: number | null
  today_seconds: number
  week_seconds: number
  month_seconds: number
}

type RankingPageProps = {
  currentUserId: string
}

function firstLetter(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || '?'
}

function secondsToReadable(value: number | null | undefined) {
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

export default function RankingPage({
  currentUserId,
}: RankingPageProps) {
  const [members, setMembers] = useState<LeaderboardMember[]>([])
  const [period, setPeriod] = useState<RankingPeriod>('today')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState('')

  const loadRanking = useCallback(async () => {
    setRefreshing(true)
    setMessage('')

    const { data, error } = await supabase.rpc(
      'get_public_leaderboard',
    )

    if (error) {
      setMessage(error.message)
    } else {
      setMembers((data ?? []) as LeaderboardMember[])
    }

    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    void loadRanking()
  }, [loadRanking])

  const rankedMembers = useMemo(() => {
    const field =
      period === 'today'
        ? 'today_seconds'
        : period === 'week'
          ? 'week_seconds'
          : 'month_seconds'

    return [...members]
      .sort(
        (first, second) =>
          Number(second[field]) - Number(first[field]),
      )
      .map((member, index) => ({
        ...member,
        rank: index + 1,
        visibleSeconds: Number(member[field]),
      }))
  }, [members, period])

  const currentUserPosition = rankedMembers.findIndex(
    (member) => member.user_id === currentUserId,
  )

  const currentUser =
    currentUserPosition >= 0
      ? rankedMembers[currentUserPosition]
      : null

  const nextMember =
    currentUserPosition > 0
      ? rankedMembers[currentUserPosition - 1]
      : null

  const distanceToNextRank =
    currentUser && nextMember
      ? Math.max(
          0,
          nextMember.visibleSeconds -
            currentUser.visibleSeconds,
        )
      : null

  if (loading) {
    return (
      <section className="ranking-page-loading">
        <LoaderCircle className="spin-icon" size={22} />
        در حال بارگذاری رتبه‌ها...
      </section>
    )
  }

  return (
    <section className="ranking-page">
      <header className="ranking-page-header">
        <div>
          <p>رقابت دوستانه</p>
          <h2>Ranking</h2>
        </div>

        <button
          disabled={refreshing}
          onClick={() => void loadRanking()}
        >
          {refreshing ? (
            <LoaderCircle className="spin-icon" size={18} />
          ) : (
            <RefreshCw size={18} />
          )}
        </button>
      </header>

      {message && (
        <div className="ranking-page-message">{message}</div>
      )}

      <div className="ranking-period-tabs">
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

      {currentUser && (
        <article className="my-ranking-card">
          <div>
            <span>رتبه فعلی شما</span>

            <strong>
              #{currentUser.rank.toLocaleString('fa-IR')}
            </strong>
          </div>

          <div>
            <span>زمان مطالعه</span>

            <strong>
              {secondsToReadable(
                currentUser.visibleSeconds,
              )}
            </strong>
          </div>

          {distanceToNextRank !== null &&
            distanceToNextRank > 0 && (
              <p>
                <ArrowUp size={17} />
                فقط {secondsToReadable(distanceToNextRank)} تا رتبه
                بالاتر فاصله داری.
              </p>
            )}

          {currentUser.rank === 1 && (
            <p>
              <Crown size={17} />
              الان نفر اول این بازه هستی 👑
            </p>
          )}
        </article>
      )}

      <article className="ranking-list-card">
        <div className="ranking-list-title">
          <div>
            <Trophy size={23} />
            <strong>لیدربرد</strong>
          </div>

          <span>
            {rankedMembers.length.toLocaleString('fa-IR')} عضو
          </span>
        </div>

        {rankedMembers.length === 0 ? (
          <div className="ranking-empty">
            هنوز زمان مطالعه‌ای برای رتبه‌بندی وجود ندارد.
          </div>
        ) : (
          <div className="ranking-members-list">
            {rankedMembers.slice(0, 50).map((member) => {
              const rankDisplay =
                member.rank === 1
                  ? '🥇'
                  : member.rank === 2
                    ? '🥈'
                    : member.rank === 3
                      ? '🥉'
                      : member.rank.toLocaleString('fa-IR')

              return (
                <div
                  className={`ranking-member-row ${
                    member.user_id === currentUserId
                      ? 'my-ranking-row'
                      : ''
                  }`}
                  key={member.user_id}
                >
                  <span className="ranking-number">
                    {rankDisplay}
                  </span>

                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.display_name}
                    />
                  ) : (
                    <span className="ranking-avatar">
                      {firstLetter(member.display_name)}
                    </span>
                  )}

                  <div className="ranking-member-info">
                    <strong>
                      {member.display_name}
                      {member.user_id === currentUserId
                        ? ' • شما'
                        : ''}
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

                  <b>
                    {secondsToReadable(
                      member.visibleSeconds,
                    )}
                  </b>
                </div>
              )
            })}
          </div>
        )}
      </article>

      <article className="ranking-future-card">
        <span>به‌زودی در Ranking</span>

        <h3>Hall of Fame و Badgeها</h3>

        <p>
          رکوردهای ماه، بیشترین رشد، مدال‌ها و افتخارات
          دائمی در Sprintهای بعد به این صفحه اضافه می‌شوند.
        </p>
      </article>
    </section>
  )
}
