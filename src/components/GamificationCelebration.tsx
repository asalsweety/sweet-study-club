import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Award,
  Check,
  Crown,
  LoaderCircle,
  Sparkles,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

type GamificationEvent = {
  event_type: 'level_up' | 'achievement'
  event_key: string
  title: string
  description: string
  icon: string
  level_value: number | null
  event_created_at: string
}

type GamificationCelebrationProps = {
  userId: string
  refreshKey?: number
}

const confettiPieces = Array.from(
  { length: 22 },
  (_, index) => index,
)

export default function GamificationCelebration({
  userId,
  refreshKey = 0,
}: GamificationCelebrationProps) {
  const [events, setEvents] = useState<GamificationEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [closing, setClosing] = useState(false)

  const currentEvent = events[0] ?? null

  const loadEvents = useCallback(async () => {
    if (!userId) return

    setLoading(true)

    const { data, error } = await supabase.rpc(
      'get_pending_gamification_events',
    )

    if (!error) {
      setEvents((data ?? []) as GamificationEvent[])
    }

    setLoading(false)
  }, [userId])

  useEffect(() => {
    void loadEvents()
  }, [loadEvents, refreshKey])

  const orderedConfetti = useMemo(() => {
    return confettiPieces.map((piece) => ({
      piece,
      left: `${(piece * 37) % 100}%`,
      delay: `${(piece % 7) * 0.08}s`,
      duration: `${1.8 + (piece % 5) * 0.18}s`,
      rotation: `${(piece * 47) % 360}deg`,
    }))
  }, [])

  const closeCurrentEvent = async () => {
    if (!currentEvent || closing) return

    setClosing(true)

    await supabase.rpc('mark_gamification_event_seen', {
      requested_event_type: currentEvent.event_type,
      requested_event_key: currentEvent.event_key,
    })

    setEvents((currentEvents) => currentEvents.slice(1))
    setClosing(false)
  }

  if (loading && events.length === 0) {
    return null
  }

  if (!currentEvent) {
    return null
  }

  const isLevelUp = currentEvent.event_type === 'level_up'

  return (
    <div className="celebration-layer">
      <div className="celebration-confetti" aria-hidden="true">
        {orderedConfetti.map((item) => (
          <i
            key={item.piece}
            style={{
              left: item.left,
              animationDelay: item.delay,
              animationDuration: item.duration,
              rotate: item.rotation,
            }}
          />
        ))}
      </div>

      <button
        type="button"
        className="celebration-backdrop"
        aria-label="بستن اعلان"
        onClick={() => void closeCurrentEvent()}
      />

      <article
        className={`celebration-card ${
          isLevelUp
            ? 'level-up-celebration'
            : 'achievement-celebration'
        }`}
      >
        <div className="celebration-glow" />

        <span className="celebration-main-icon">
          {isLevelUp ? (
            <Crown size={42} />
          ) : (
            currentEvent.icon
          )}
        </span>

        <div className="celebration-label">
          {isLevelUp ? (
            <>
              <Sparkles size={17} />
              Sweet Level Up
            </>
          ) : (
            <>
              <Award size={17} />
              Achievement جدید
            </>
          )}
        </div>

        <h2>
          {isLevelUp
            ? `Level ${currentEvent.level_value?.toLocaleString(
                'fa-IR',
              )}`
            : currentEvent.title}
        </h2>

        <p>{currentEvent.description}</p>

        {events.length > 1 && (
          <small className="celebration-remaining">
            بعد از این،{' '}
            {(events.length - 1).toLocaleString('fa-IR')}{' '}
            دستاورد دیگر هم داری.
          </small>
        )}

        <button
          type="button"
          className="celebration-confirm-button"
          disabled={closing}
          onClick={() => void closeCurrentEvent()}
        >
          {closing ? (
            <LoaderCircle className="spin-icon" size={18} />
          ) : (
            <Check size={18} />
          )}

          عالیه، ادامه می‌دم
        </button>
      </article>
    </div>
  )
}
