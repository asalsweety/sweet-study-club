import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import { api } from '../../app/api'
import { queryKeys, useSettings } from '../../app/session'
import { celebrate } from '../../shared/lib/confetti'
import { fa } from '../../shared/lib/format'
import { toast } from '../../shared/lib/toast'
import { pomodoroRemaining } from '../study/useStudyTimer'

function notify(title: string, body: string, enabled: boolean) {
  if (!enabled || !('Notification' in window) || Notification.permission !== 'granted') return false
  try {
    new Notification(title, { body, icon: '/icons/icon-192.png', lang: 'fa', dir: 'rtl' })
    return true
  } catch {
    return false
  }
}

/** Invisible app-wide services; their messages go to the global toaster. */
export default function BackgroundServices() {
  const client = useQueryClient()
  const settings = useSettings()
  const notificationsOn = settings.data?.notificationsEnabled ?? false
  const fired = useRef(new Set<string>())
  const push = useCallback((text: string) => {
    // Lead emoji becomes the toast's icon tile.
    const match = text.match(/^(\p{Extended_Pictographic}\uFE0F?)\s*(.*)$/u)
    if (match?.[1] && match[2]) toast(match[2], { icon: match[1], duration: 6000 })
    else toast(text, { duration: 6000 })
  }, [])

  // Presence heartbeat while the tab is visible.
  useEffect(() => {
    let first: number | undefined
    let interval: number | undefined
    const beat = () => void api.social.presence().catch(() => undefined)
    // Deferring the first heartbeat avoids duplicate writes during StrictMode
    // setup/cleanup and keeps it out of the initial dashboard request burst.
    const sync = () => {
      window.clearTimeout(first)
      window.clearInterval(interval)
      if (document.visibilityState !== 'visible') return
      first = window.setTimeout(() => {
        beat()
        interval = window.setInterval(beat, 30_000)
      }, 1000)
    }
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(first)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])

  const cheers = useQuery({ queryKey: queryKeys.cheers, queryFn: api.social.cheers, refetchInterval: 45_000 })
  useEffect(() => {
    const list = cheers.data ?? []
    if (list.length === 0) return
    for (const cheer of list) {
      if (fired.current.has(cheer.id)) continue
      fired.current.add(cheer.id)
      push(`${cheer.emoji} ${cheer.from.displayName} تشویقت کرد!`)
    }
    void api.social.cheersSeen().then(() => client.setQueryData(queryKeys.cheers, [])).catch(() => undefined)
  }, [cheers.data, client, push])

  const reminders = useQuery({ queryKey: queryKeys.reminders, queryFn: api.planner.reminders, refetchInterval: 5 * 60_000 })
  useEffect(() => {
    let timeout: number | undefined
    const check = () => {
      const now = Date.now()
      let next = Infinity
      for (const item of reminders.data ?? []) {
        const due = item.remindAt ? Date.parse(item.remindAt) : null
        const key = `remind-${item.id}-${item.remindAt}`
        if (due === null || now - due > 10 * 60_000 || fired.current.has(key)) continue
        if (due > now) {
          next = Math.min(next, due)
          continue
        }
        fired.current.add(key)
        if (!notify('یادآور پلنر', item.title, notificationsOn)) push(`⏰ یادآور: ${item.title}`)
      }
      if (Number.isFinite(next)) timeout = window.setTimeout(check, next - now)
    }
    // One deadline, rather than waking/rendering the app every five seconds.
    check()
    return () => window.clearTimeout(timeout)
  }, [reminders.data, notificationsOn, push])

  const timer = useQuery({ queryKey: queryKeys.timer, queryFn: api.timer.get, refetchInterval: 60_000 }).data
  useEffect(() => {
    const pomodoro = pomodoroRemaining(timer)
    if (!pomodoro) return
    const key = `pomo-${pomodoro.phase}-${pomodoro.round}-${timer?.pomodoro?.phaseStartedAt}`
    const fire = () => {
      if (fired.current.has(key)) return
      fired.current.add(key)
      const text = pomodoro.phase === 'focus' ? `دور ${fa(pomodoro.round)} تمام شد؛ وقت استراحت ☕` : 'استراحت تمام شد؛ برگردیم سراغ درس 🌱'
      if (!notify('پومودورو', text, notificationsOn)) push(text)
      navigator.vibrate?.(200)
    }
    const due = Date.parse(timer!.pomodoro!.phaseStartedAt) + pomodoro.length * 1000
    const timeout = window.setTimeout(fire, Math.max(0, due - Date.now()))
    return () => window.clearTimeout(timeout)
  }, [timer, notificationsOn, push])

  const gamification = useQuery({ queryKey: queryKeys.gamification, queryFn: api.progress.gamification, staleTime: 60_000 })
  useEffect(() => {
    const data = gamification.data
    if (!data) return
    const fresh = data.badges.filter((badge) => badge.earned && !badge.seen)
    if (!data.levelUp && fresh.length === 0) return
    const key = `awards-${data.level.level}-${fresh.map((badge) => badge.id).join(',')}`
    if (fired.current.has(key)) return
    fired.current.add(key)
    if (data.levelUp) { push(`🎉 تبریک! به سطح ${fa(data.levelUp.to)} رسیدی`); celebrate({ particles: 180 }) }
    for (const badge of fresh) push(`${badge.emoji} نشان جدید: ${badge.title}`)
    void api.progress.markSeen(fresh.map((badge) => badge.id), data.level.level)
      .then(() => client.invalidateQueries({ queryKey: queryKeys.gamification }))
      .catch(() => fired.current.delete(key))
  }, [gamification.data, client, push])

  return null
}
