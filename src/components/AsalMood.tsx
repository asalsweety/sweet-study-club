import { moodLabels as labels } from '../shared/lib/moods'
import { cn } from '../shared/lib/utils'

/** One of the five supplied mood frames, from drained to energized. */
export default function AsalMood({ rating, className, label = true }: { rating: number; className?: string; label?: boolean }) {
  const index = Math.min(4, Math.max(0, Math.round(rating) - 1))
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label ? `عسل: ${labels[index]}` : undefined}
      aria-hidden={label ? undefined : true}
      className={cn('asal-mood', className)}
      style={{ backgroundPosition: `${index * 25}% 0` }}
    />
  )
}
