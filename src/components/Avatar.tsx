import { cn } from '../shared/lib/utils'

type AvatarProps = {
  name: string
  url?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  status?: 'studying' | 'break' | 'online' | 'offline' | null
  className?: string
}

const sizes = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
  xl: 'size-20 text-2xl',
}

const statusColors = {
  studying: 'bg-[var(--success)]',
  break: 'bg-[var(--warning)]',
  online: 'bg-[var(--chart-2)]',
  offline: 'bg-[var(--status-offline)]',
}

// Stable hue per name so each friend keeps the same colour everywhere.
function hueFor(name: string) {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 360
  return hash
}

export default function Avatar({ name, url, size = 'md', status = null, className }: AvatarProps) {
  const initial = name.trim().charAt(0) || '؟'
  const hue = hueFor(name)

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {url ? (
        <img src={url} alt="" className={cn('rounded-2xl object-cover', sizes[size])} />
      ) : (
        <span
          aria-hidden
          className={cn('grid place-items-center rounded-2xl font-black text-white shadow-inner', sizes[size])}
          style={{ background: `linear-gradient(135deg, oklch(0.72 0.14 ${hue}), oklch(0.58 0.17 ${(hue + 40) % 360}))` }}
        >
          {initial}
        </span>
      )}
      {status && (
        <span
          className={cn('absolute -bottom-0.5 -left-0.5 size-3.5 rounded-full border-2 border-card', statusColors[status])}
          aria-label={status === 'studying' ? 'در حال مطالعه' : status === 'break' ? 'استراحت' : status === 'online' ? 'آنلاین' : 'آفلاین'}
        />
      )}
      <span className="sr-only">{name}</span>
    </span>
  )
}
