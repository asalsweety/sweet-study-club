import { cn } from '../shared/lib/utils'

/**
 * A study clock in the display face. Each digit sits in a fixed-width slot so
 * the time never jitters as it ticks (the display fonts have proportional
 * digits), and the colon breathes while the session runs.
 */
export default function ClockText({ value, ticking = false, className }: { value: string; ticking?: boolean; className?: string }) {
  return (
    <span dir="ltr" className={cn('clock-text font-display', ticking && 'is-ticking', className)}>
      <span className="sr-only">{value}</span>
      {[...value].map((char, index) => (
        <span key={index} aria-hidden className={char === ':' ? 'clock-sep' : 'clock-digit'}>{char}</span>
      ))}
    </span>
  )
}
