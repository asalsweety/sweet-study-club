import { ArrowLeft, Megaphone, Pin, TriangleAlert, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'
import { appRoutes } from '../../app/navigation/routes'
import type { BroadcastInput } from '../../shared/api/shop'
import { broadcastDestinations, broadcastTones } from './labels'

const tones = {
  notice: { icon: Megaphone, style: 'border-border bg-card', label: 'text-primary' },
  maintenance: { icon: Wrench, style: 'border-[var(--warning)]/40 bg-[var(--warning-soft)]', label: 'text-[var(--warning-text)]' },
  important: { icon: TriangleAlert, style: 'border-destructive/35 bg-[var(--destructive-soft)]', label: 'text-[var(--destructive-text)]' },
}

export default function BroadcastCard({ message, preview = false }: {
  message: Pick<BroadcastInput, 'title' | 'body' | 'tone' | 'pinned' | 'destination'>
  preview?: boolean
}) {
  const { icon: Icon, style, label } = tones[message.tone]
  const destination = message.destination
  const linkStyle = 'mt-1 inline-flex w-fit items-center gap-1 text-sm font-bold underline underline-offset-4'
  return <article className={`grid min-w-0 gap-2 rounded-2xl border px-4 py-3 sm:px-5 ${style}`}>
    <div className={`flex items-center gap-2 text-xs font-bold ${label}`}>
      <Icon size={16} aria-hidden="true" />{broadcastTones[message.tone]}
      {message.pinned && <span className="ms-auto inline-flex items-center gap-1"><Pin size={13} aria-hidden="true" /> سنجاق‌شده</span>}
    </div>
    <h2 className="break-words font-bold">{message.title}</h2>
    <p className="whitespace-pre-wrap break-words text-sm leading-7">{message.body}</p>
    {destination && (preview
      ? <span className={linkStyle}>{broadcastDestinations[destination]} <ArrowLeft size={14} /></span>
      : <Link className={linkStyle} to={appRoutes[destination]}>{broadcastDestinations[destination]} <ArrowLeft size={14} /></Link>)}
  </article>
}
