import type { ReactNode } from 'react'
import type { PresenceStatus } from '../../shared/api/social'
import { formatDuration } from '../../shared/lib/format'
import Avatar from '../../components/Avatar'

const statusText: Record<PresenceStatus, string> = {
  studying: 'در حال مطالعه',
  break: 'در استراحت',
  online: 'آنلاین',
  offline: 'آفلاین',
}

type PersonRowProps = {
  name: string
  avatarUrl: string | null
  status: PresenceStatus
  subjectName: string | null
  todaySeconds: number
  liveSeconds?: number | null
  actions?: ReactNode
}

export default function PersonRow({ name, avatarUrl, status, subjectName, todaySeconds, liveSeconds, actions }: PersonRowProps) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-muted/40 p-3 transition hover:bg-muted/70">
      <Avatar name={name} url={avatarUrl} status={status} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {statusText[status]}
          {subjectName && status !== 'offline' && ` · ${subjectName}`}
          {liveSeconds ? ` · ${formatDuration(liveSeconds)}` : ''}
        </p>
      </div>
      <span className="hidden shrink-0 text-xs font-bold text-muted-foreground sm:block">امروز {formatDuration(todaySeconds)}</span>
      {actions}
    </li>
  )
}
