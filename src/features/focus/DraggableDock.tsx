import { GripHorizontal, Scaling } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { cn } from '../../shared/lib/utils'

type Placement = { x: number; y: number; scale: number }
const storageKey = 'sweet-study-focus-dock'
const resting: Placement = { x: 0, y: 0, scale: 1 }

function readPlacement(): Placement {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as Placement | null
    if (value && Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.scale)) return value
  } catch { /* storage unavailable */ }
  return resting
}

/**
 * The focus-room timer dock can be dragged anywhere by its handle and
 * resized from its corner; the placement is remembered on this device.
 * Double-tapping the handle puts it back. Keyboard users get the same
 * controls through the arrow keys and +/- on the handle.
 */
export default function DraggableDock({ enabled, className, children }: { enabled: boolean; className?: string; children: ReactNode }) {
  const [placement, setPlacement] = useState<Placement>(() => (enabled ? readPlacement() : resting))
  const box = useRef<HTMLDivElement>(null)
  const gesture = useRef<{ kind: 'move' | 'resize'; startX: number; startY: number; from: Placement } | null>(null)

  useEffect(() => {
    if (!enabled) return
    try { localStorage.setItem(storageKey, JSON.stringify(placement)) } catch { /* storage unavailable */ }
  }, [enabled, placement])

  // Keep the dock reachable when the window shrinks or rotates.
  useEffect(() => {
    if (!enabled) return
    const clampIntoView = () => {
      const rect = box.current?.getBoundingClientRect()
      if (!rect) return
      const dx = rect.left < 8 ? 8 - rect.left : rect.right > innerWidth - 8 ? innerWidth - 8 - rect.right : 0
      const dy = rect.top < 8 ? 8 - rect.top : rect.bottom > innerHeight - 8 ? innerHeight - 8 - rect.bottom : 0
      if (dx || dy) setPlacement((current) => ({ ...current, x: current.x + dx, y: current.y + dy }))
    }
    clampIntoView()
    window.addEventListener('resize', clampIntoView)
    return () => window.removeEventListener('resize', clampIntoView)
  }, [enabled])

  const start = (kind: 'move' | 'resize') => (event: PointerEvent<HTMLElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    gesture.current = { kind, startX: event.clientX, startY: event.clientY, from: placement }
  }
  const move = (event: PointerEvent<HTMLElement>) => {
    const current = gesture.current
    if (!current) return
    const dx = event.clientX - current.startX
    const dy = event.clientY - current.startY
    if (current.kind === 'move') {
      setPlacement({ ...current.from, x: current.from.x + dx, y: current.from.y + dy })
    } else {
      // Dragging the corner outward (left/down in this layout) grows the dock.
      const delta = (-dx + dy) / 260
      setPlacement({ ...current.from, scale: Math.min(1.7, Math.max(0.65, current.from.scale + delta)) })
    }
  }
  const end = () => { gesture.current = null }
  const nudge = (event: KeyboardEvent) => {
    const step = event.shiftKey ? 40 : 12
    const changes: Record<string, Partial<Placement>> = {
      ArrowLeft: { x: placement.x - step }, ArrowRight: { x: placement.x + step }, ArrowUp: { y: placement.y - step }, ArrowDown: { y: placement.y + step },
      '+': { scale: Math.min(1.7, placement.scale + 0.1) }, '=': { scale: Math.min(1.7, placement.scale + 0.1) }, '-': { scale: Math.max(0.65, placement.scale - 0.1) },
    }
    const change = changes[event.key]
    if (!change) return
    event.preventDefault()
    setPlacement({ ...placement, ...change })
  }

  if (!enabled) return <div className={className}>{children}</div>
  return (
    <div ref={box} className={cn(className, 'draggable-dock')} style={{ translate: `${placement.x}px ${placement.y}px`, scale: String(placement.scale) }}>
      <button
        type="button"
        className="dock-grip"
        aria-label="جابه‌جایی تایمر؛ با کلیدهای جهت جابه‌جا کن، با + و - اندازه را عوض کن، دوبار بزن تا سر جایش برگردد"
        title="بکش تا جابه‌جا شود · دوبار بزن تا برگردد"
        onPointerDown={start('move')}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onDoubleClick={() => setPlacement(resting)}
        onKeyDown={nudge}
      >
        <GripHorizontal size={18} />
      </button>
      {children}
      <span
        aria-hidden
        className="dock-resize"
        title="بکش تا بزرگ یا کوچک شود"
        onPointerDown={start('resize')}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <Scaling size={14} />
      </span>
    </div>
  )
}
