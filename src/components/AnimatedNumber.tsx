import { useEffect, useRef, useState } from 'react'
import { fa } from '../shared/lib/format'

const easeOut = (t: number) => 1 - Math.pow(1 - t, 4)

/** Counts from the previous value (0 on mount) to `value` with an ease-out curve. */
export default function AnimatedNumber({ value, duration = 1100, format = (n: number) => fa(n), className }: {
  value: number
  duration?: number
  format?: (value: number) => string
  className?: string
}) {
  const [display, setDisplay] = useState(0)
  // What is on screen right now; a changed value animates from here.
  const shown = useRef(0)

  useEffect(() => {
    const start = shown.current
    if (start === value) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shown.current = value
      setDisplay(value)
      return
    }
    let raf = 0
    const began = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - began) / duration)
      const next = Math.round(start + (value - start) * easeOut(progress))
      shown.current = next
      setDisplay(next)
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>{format(display)}</span>
}
