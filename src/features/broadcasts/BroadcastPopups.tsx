import { useQuery } from '@tanstack/react-query'
import { useEffect, useReducer, useRef } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../app/api'
import { appRoutes } from '../../app/navigation/routes'
import { queryKeys } from '../../app/session'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { acknowledgeNotice, hasSeenNotice, noticeKey } from './acknowledgement'
import { broadcastDestinations, broadcastTones } from './labels'

export default function BroadcastPopups({ userId }: { userId: string }) {
  const [, refresh] = useReducer((tick: number) => tick + 1, 0)
  const previousFocus = useRef<HTMLElement | null>(null)
  const notices = useQuery({ queryKey: queryKeys.broadcasts, queryFn: api.shop.broadcasts, refetchInterval: 60_000, refetchOnWindowFocus: 'always' })
  const message = notices.data?.find(item => item.popup && (!item.expiresAt || Date.parse(item.expiresAt) > Date.now())
    && !hasSeenNotice(userId, item.id, item.revision))

  useEffect(() => {
    const prefix = noticeKey(userId, '')
    const storageChanged = (event: StorageEvent) => { if (!event.key || event.key.startsWith(prefix)) refresh() }
    window.addEventListener('storage', storageChanged)
    return () => window.removeEventListener('storage', storageChanged)
  }, [userId])

  useEffect(() => {
    if (!message?.expiresAt) return
    const delay = Date.parse(message.expiresAt) - Date.now()
    if (delay > 2_147_483_647) return // Polling will reschedule when the deadline is closer.
    const timer = window.setTimeout(refresh, Math.max(0, delay))
    return () => window.clearTimeout(timer)
  }, [message?.expiresAt, notices.dataUpdatedAt])

  if (!message) return null
  function dismiss() {
    if (!message) return
    acknowledgeNotice(userId, message.id, message.revision)
    refresh()
  }

  return <Dialog key={`${message.id}:${message.revision}`} open onOpenChange={open => { if (!open) dismiss() }}>
    <DialogContent dir="rtl" className="max-h-[85dvh] overflow-y-auto rounded-2xl text-right"
      onOpenAutoFocus={() => { previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null }}
      onCloseAutoFocus={event => { event.preventDefault(); if (previousFocus.current?.isConnected) previousFocus.current.focus() }}>
      <DialogHeader className="text-right">
        <span className="text-xs font-bold text-primary">{broadcastTones[message.tone]}</span>
        <DialogTitle className="break-words pe-6">{message.title}</DialogTitle>
        <DialogDescription className="whitespace-pre-wrap break-words text-start leading-7">{message.body}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={dismiss}>متوجه شدم</Button>
        {message.destination && <Button asChild variant="outline"><Link to={appRoutes[message.destination]} onClick={dismiss}>{broadcastDestinations[message.destination]}</Link></Button>}
      </div>
    </DialogContent>
  </Dialog>
}
