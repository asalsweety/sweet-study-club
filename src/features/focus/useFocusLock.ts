import { useEffect, useState } from 'react'
import { fa } from '../../shared/lib/format'
import { toast } from '../../shared/lib/toast'

const storageKey = (logId: string) => `sweet-study-distractions-${logId}`

function readCount(logId: string | undefined) {
  if (!logId) return 0
  try { return Number(sessionStorage.getItem(storageKey(logId)) ?? 0) || 0 } catch { return 0 }
}

/**
 * "Full focus" mode for a running session: counts every time the learner
 * leaves the tab or app, welcomes them back with the count, nudges them with
 * a notification after 20 seconds away, and asks before the page is closed.
 */
export function useFocusLock({ enabled, running, logId }: { enabled: boolean; running: boolean; logId: string | undefined }) {
  const [distractions, setDistractions] = useState(() => readCount(logId))

  useEffect(() => { setDistractions(readCount(logId)) }, [logId])

  useEffect(() => {
    if (!enabled || !running || !logId) return
    let nudge: number | undefined
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        const next = readCount(logId) + 1
        try { sessionStorage.setItem(storageKey(logId), String(next)) } catch { /* private mode */ }
        setDistractions(next)
        nudge = window.setTimeout(() => {
          if ('Notification' in window && Notification.permission === 'granted') {
            try { new Notification('برگرد سر درس 🌱', { body: 'حالت تمرکز کامل روشن است؛ عسل منتظرت است.', icon: '/favicon.svg', lang: 'fa', dir: 'rtl' }) } catch { /* unsupported */ }
          }
        }, 20_000)
      } else {
        window.clearTimeout(nudge)
        const count = readCount(logId)
        toast(`خوش برگشتی! حواس‌پرتی‌های این جلسه: ${fa(count)} بار`, { icon: '🔒', duration: 3500 })
      }
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.clearTimeout(nudge)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [enabled, running, logId])

  return { distractions }
}
