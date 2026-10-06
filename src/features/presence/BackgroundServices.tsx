import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { api } from '../../app/api'
import { queryKeys, useSettings } from '../../app/session'
import { fa } from '../../shared/lib/format'
import { pomodoroRemaining, useNow } from '../study/useStudyTimer'

type Toast = { id: string; text: string }

function notify(title: string, body: string, enabled: boolean) {
  if (!enabled || !('Notification' in window) || Notification.permission !== 'granted') return false
  try {
    new Notification(title, { body, icon: '/favicon.svg', lang: 'fa', dir: 'rtl' })
    return true
  } catch {
    return false
  }
}

/** Invisible app-wide services; renders only a small toast stack. */
export default function BackgroundServices() {
  const client = useQueryClient()
  const now = useNow(5_000)
  const settings = useSettings()
  const notificationsOn = settings.data?.notificationsEnabled ?? false
  const [toasts, setToasts] = useState<Toast[]>([])
  const fired = useRef(new Set<string>())
  const push = (text: string) => {
    const id = crypto.randomUUID()
    setToasts((list) => [...list.slice(-2), { id, text }])
    window.setTimeout(() => setToasts((list) => list.filter((toast) => toast.id !== id)), 6000)
  }

  // Presence heartbeat while the tab is visible.
  useEffect(() => {
    const beat = () => document.visibilityState === 'visible' && void api.social.presence().catch(() => undefined)
    beat()
    const id = window.setInterval(beat, 30_000)
    document.addEventListener('visibilitychange', beat)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', beat)
    }
  }, [])

  const cheers = useQuery({ queryKey: queryKeys.cheers, queryFn: api.social.cheers, refetchInterval: 45_000 })
  useEffect(() => {
    const list = cheers.data ?? []
    if (list.length === 0) return
    for (const cheer of list) push(`${cheer.emoji} ${cheer.from.displayName} تشویقت کرد!`)
    void api.social.cheersSeen().then(() => client.setQueryData(queryKeys.cheers, []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cheers.data])

  const reminders = useQuery({ queryKey: ['reminders'], queryFn: api.planner.reminders, refetchInterval: 5 * 60_000 })
  useEffect(() => {
    for (const item of reminders.data ?? []) {
      const due = item.remindAt ? Date.parse(item.remindAt) : null
      const key = `remind-${item.id}-${item.remindAt}`
      if (due === null || due > now || now - due > 10 * 60_000 || fired.current.has(key)) continue
      fired.current.add(key)
      if (!notify('یادآور پلنر', item.title, notificationsOn)) push(`⏰ یادآور: ${item.title}`)
    }
  }, [now, reminders.data, notificationsOn])

  const timer = client.getQueryData<Parameters<typeof pomodoroRemaining>[0]>(queryKeys.timer)
  const pomodoro = pomodoroRemaining(timer, now)
  useEffect(() => {
    if (!pomodoro || pomodoro.remaining > 0) return
    const key = `pomo-${pomodoro.phase}-${pomodoro.round}-${timer?.pomodoro?.phaseStartedAt}`
    if (fired.current.has(key)) return
    fired.current.add(key)
    const text = pomodoro.phase === 'focus' ? `دور ${fa(pomodoro.round)} تمام شد؛ وقت استراحت ☕` : 'استراحت تمام شد؛ برگردیم سراغ درس 🌱'
    if (!notify('پومودورو', text, notificationsOn)) push(text)
    navigator.vibrate?.(200)
  }, [pomodoro, timer, notificationsOn])

  const gamification = useQuery({ queryKey: queryKeys.gamification, queryFn: api.progress.gamification, staleTime: 60_000 })
  useEffect(() => {
    const data = gamification.data
    if (!data) return
    const fresh = data.badges.filter((badge) => badge.earned && !badge.seen)
    if (!data.levelUp && fresh.length === 0) return
    if (data.levelUp) push(`🎉 تبریک! به سطح ${fa(data.levelUp.to)} رسیدی`)
    for (const badge of fresh) push(`${badge.emoji} نشان جدید: ${badge.title}`)
    void api.progress.markSeen(fresh.map((badge) => badge.id), data.level.level).then(() => client.invalidateQueries({ queryKey: queryKeys.gamification }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamification.data])

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4" dir="rtl">
      {toasts.map((toast) => (
        <div key={toast.id} className="glass rise pointer-events-auto rounded-2xl px-5 py-3 text-sm font-bold shadow-2xl">
          {toast.text}
        </div>
      ))}
    </div>
  )
}
