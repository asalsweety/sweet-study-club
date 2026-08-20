import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Award,
  Crown,
  LoaderCircle,
  LockKeyhole,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

type UserProgress = {
  total_xp: number
  current_level: number
  xp_for_current_level: number
  xp_for_next_level: number | null
  unlocked_achievements: number
}

type Achievement = {
  id: string
  code: string
  title: string
  description: string
  icon: string
  category: 'study_time' | 'streak' | 'sessions' | 'special'
  condition_type:
    | 'total_seconds'
    | 'current_streak'
    | 'completed_sessions'
    | 'admin_role'
  condition_value: number
  sort_order: number
}

type UserAchievementRow = {
  achievement_id: string
  unlocked_at: string
  seen_at: string | null
}

type GamificationProfileProps = {
  userId: string
  role: 'member' | 'admin'
}

function categoryLabel(category: Achievement['category']) {
  if (category === 'study_time') return 'زمان مطالعه'
  if (category === 'streak') return 'استریک'
  if (category === 'sessions') return 'پارت‌ها'
  return 'ویژه'
}

function requirementLabel(achievement: Achievement) {
  if (achievement.condition_type === 'total_seconds') {
    const hours = achievement.condition_value / 3600

    if (hours < 1) return 'تکمیل اولین مطالعه'

    return `${hours.toLocaleString('fa-IR')} ساعت مطالعه`
  }

  if (achievement.condition_type === 'current_streak') {
    return `${achievement.condition_value.toLocaleString(
      'fa-IR',
    )} روز استریک`
  }

  if (achievement.condition_type === 'completed_sessions') {
    return `${achievement.condition_value.toLocaleString(
      'fa-IR',
    )} پارت تکمیل‌شده`
  }

  return 'نشان ویژه مدیر'
}

export default function GamificationProfile({
  userId,
  role,
}: GamificationProfileProps) {
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [unlockedRows, setUnlockedRows] = useState<
    UserAchievementRow[]
  >([])

  const [selectedAchievement, setSelectedAchievement] =
    useState<Achievement | null>(null)

  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const loadGamification = useCallback(async () => {
    setLoading(true)
    setMessage('')

    const [
      progressResult,
      achievementsResult,
      unlockedResult,
    ] = await Promise.all([
      supabase
        .from('user_progress')
        .select(
          'total_xp, current_level, xp_for_current_level, xp_for_next_level, unlocked_achievements',
        )
        .eq('user_id', userId)
        .maybeSingle(),

      supabase
        .from('achievements')
        .select(
          'id, code, title, description, icon, category, condition_type, condition_value, sort_order',
        )
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),

      supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at, seen_at')
        .eq('user_id', userId),
    ])

    const firstError =
      progressResult.error ||
      achievementsResult.error ||
      unlockedResult.error

    if (firstError) {
      setMessage(firstError.message)
      setLoading(false)
      return
    }

    setProgress(progressResult.data as UserProgress | null)

    setAchievements(
      (achievementsResult.data ?? []) as Achievement[],
    )

    setUnlockedRows(
      (unlockedResult.data ?? []) as UserAchievementRow[],
    )

    setLoading(false)
  }, [userId])

  useEffect(() => {
    void loadGamification()
  }, [loadGamification])

  const unlockedIds = useMemo(
    () =>
      new Set(
        unlockedRows.map((item) => item.achievement_id),
      ),
    [unlockedRows],
  )

  const visibleAchievements = useMemo(() => {
    return achievements.filter((achievement) => {
      if (
        achievement.condition_type === 'admin_role' &&
        role !== 'admin' &&
        !unlockedIds.has(achievement.id)
      ) {
        return false
      }

      return true
    })
  }, [achievements, role, unlockedIds])

  const levelProgressPercent = useMemo(() => {
    if (!progress) return 0

    if (
      progress.current_level >= 100 ||
      progress.xp_for_next_level === null
    ) {
      return 100
    }

    if (progress.xp_for_next_level <= 0) return 0

    return Math.min(
      100,
      Math.round(
        (progress.xp_for_current_level /
          progress.xp_for_next_level) *
          100,
      ),
    )
  }, [progress])

  if (loading) {
    return (
      <section className="gamification-loading">
        <LoaderCircle className="spin-icon" size={21} />
        در حال بارگذاری Level و Badgeها...
      </section>
    )
  }

  if (!progress) {
    return (
      <section className="gamification-message">
        اطلاعات Level هنوز ساخته نشده است.
      </section>
    )
  }

  return (
    <section className="gamification-profile">
      {message && (
        <div className="gamification-message">{message}</div>
      )}

      <article className="level-card">
        <div className="level-card-decoration level-decoration-one" />
        <div className="level-card-decoration level-decoration-two" />

        <div className="level-main-information">
          <span className="level-icon">
            {role === 'admin' ? (
              <Crown size={29} />
            ) : (
              <Star size={29} />
            )}
          </span>

          <div>
            <small>
              {role === 'admin'
                ? 'Founder Profile'
                : 'Sweet Study Profile'}
            </small>

            <h2>
              Level{' '}
              {progress.current_level.toLocaleString('fa-IR')}
            </h2>

            <p>
              {progress.total_xp.toLocaleString('fa-IR')} XP کل
            </p>
          </div>
        </div>

        <div className="level-achievement-count">
          <Award size={20} />

          <span>
            <strong>
              {progress.unlocked_achievements.toLocaleString(
                'fa-IR',
              )}
            </strong>
            Achievement
          </span>
        </div>

        <div className="level-progress-information">
          <div>
            <span>پیشرفت Level فعلی</span>

            <strong>
              {levelProgressPercent.toLocaleString('fa-IR')}٪
            </strong>
          </div>

          <div className="level-progress-bar">
            <i style={{ width: `${levelProgressPercent}%` }} />
          </div>

          <p>
            {progress.current_level >= 100 ||
            progress.xp_for_next_level === null
              ? 'به بالاترین Level نسخه فعلی رسیده‌ای 👑'
              : `${progress.xp_for_current_level.toLocaleString(
                  'fa-IR',
                )} از ${progress.xp_for_next_level.toLocaleString(
                  'fa-IR',
                )} XP`}
          </p>
        </div>
      </article>

      <article className="achievements-card">
        <div className="achievements-heading">
          <div>
            <p>
              <Sparkles size={18} />
              مسیر پیشرفت
            </p>

            <h2>Badges & Achievements</h2>
          </div>

          <span>
            {progress.unlocked_achievements.toLocaleString(
              'fa-IR',
            )}{' '}
            از{' '}
            {visibleAchievements.length.toLocaleString('fa-IR')}
          </span>
        </div>

        <div className="achievement-grid">
          {visibleAchievements.map((achievement) => {
            const isUnlocked = unlockedIds.has(achievement.id)

            return (
              <button
                type="button"
                className={`achievement-item ${
                  isUnlocked
                    ? 'achievement-unlocked'
                    : 'achievement-locked'
                }`}
                key={achievement.id}
                onClick={() =>
                  setSelectedAchievement(achievement)
                }
              >
                <span className="achievement-icon">
                  {isUnlocked ? (
                    achievement.icon
                  ) : (
                    <LockKeyhole size={22} />
                  )}
                </span>

                <strong>{achievement.title}</strong>

                <small>
                  {isUnlocked
                    ? categoryLabel(achievement.category)
                    : requirementLabel(achievement)}
                </small>

                {isUnlocked && (
                  <i className="achievement-check">✓</i>
                )}
              </button>
            )
          })}
        </div>
      </article>

      {selectedAchievement && (
        <div className="achievement-detail-layer">
          <button
            className="achievement-detail-backdrop"
            aria-label="بستن جزئیات نشان"
            onClick={() => setSelectedAchievement(null)}
          />

          <article className="achievement-detail-sheet">
            <div
              className={`achievement-large-icon ${
                unlockedIds.has(selectedAchievement.id)
                  ? 'is-unlocked'
                  : 'is-locked'
              }`}
            >
              {unlockedIds.has(selectedAchievement.id) ? (
                selectedAchievement.icon
              ) : (
                <LockKeyhole size={34} />
              )}
            </div>

            <span>
              {categoryLabel(selectedAchievement.category)}
            </span>

            <h2>{selectedAchievement.title}</h2>

            <p>{selectedAchievement.description}</p>

            <div className="achievement-requirement">
              <Trophy size={18} />

              {unlockedIds.has(selectedAchievement.id)
                ? 'این Achievement باز شده است.'
                : requirementLabel(selectedAchievement)}
            </div>

            <button
              type="button"
              onClick={() => setSelectedAchievement(null)}
            >
              بستن
            </button>
          </article>
        </div>
      )}
    </section>
  )
}
