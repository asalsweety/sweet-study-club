import { GripHorizontal, Scaling } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { cn } from '../../shared/lib/utils'

type Placement = { x: number; y: number; scale: number }
const storageKey = 'sweet-study-focus-dock'
const resting: Placement = { x: 0, y: 0, scale: 1 }
const interactiveDock = '(min-width: 1101px) and (min-height: 560px) and (pointer: fine)'

function readPlacement(): Placement {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as Placement | null
    if (value && Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.scale) && value.scale > 0) return value
  } catch { /* storage unavailable */ }
  return resting
}

function keepInStage(box: HTMLDivElement | null, placement: Placement): Placement {
  const stage = box?.offsetParent
  if (!box || !(stage instanceof HTMLElement) || !box.offsetWidth || !box.offsetHeight) return placement
  const inset = 8
  const width = box.offsetWidth
  const height = box.offsetHeight
  const centerX = box.offsetLeft + width / 2
  const centerY = box.offsetTop + height / 2
  const scale = Math.min(placement.scale, (stage.clientWidth - inset * 2) / width, (stage.clientHeight - inset * 2) / height)
  const halfWidth = width * scale / 2
  const halfHeight = height * scale / 2
  return {
    x: Math.max(inset + halfWidth - centerX, Math.min(placement.x, stage.clientWidth - inset - halfWidth - centerX)),
    y: Math.max(inset + halfHeight - centerY, Math.min(placement.y, stage.clientHeight - inset - halfHeight - centerY)),
    scale,
  }
}

/**
 * The desktop timer dock can be moved and resized within the stage.
 * Compact screens keep the controls in the page flow.
 * Double-tapping the handle puts it back. Keyboard users get the same
 * controls through the arrow keys and +/- on the handle.
 */
export default function DraggableDock({ enabled, className, children }: { enabled: boolean; className?: string; children: ReactNode }) {
  const [supportsDragging, setSupportsDragging] = useState(() => matchMedia(interactiveDock).matches)
  const [placement, setPlacement] = useState(readPlacement)
  const canDrag = enabled && supportsDragging
  const box = useRef<HTMLDivElement>(null)
  const gesture = useRef<{ kind: 'move' | 'resize'; startX: number; startY: number; from: Placement } | null>(null)

  useEffect(() => {
    const query = matchMedia(interactiveDock)
    const sync = () => setSupportsDragging(query.matches)
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!canDrag) return
    try { localStorage.setItem(storageKey, JSON.stringify(placement)) } catch { /* storage unavailable */ }
  }, [canDrag, placement])

  useLayoutEffect(() => {
    const dock = box.current
    if (!canDrag || !dock || !dock.parentElement) return
    const clampIntoView = () => setPlacement((current) => {
      const next = keepInStage(dock, current)
      return next.x === current.x && next.y === current.y && next.scale === current.scale ? current : next
    })
    clampIntoView()
    const observer = new ResizeObserver(clampIntoView)
    observer.observe(dock)
    observer.observe(dock.parentElement)
    return () => { observer.disconnect(); gesture.current = null }
  }, [canDrag])

  const start = (kind: 'move' | 'resize') => (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || !event.isPrimary) return
    event.currentTarget.setPointerCapture(event.pointerId)
    gesture.current = { kind, startX: event.clientX, startY: event.clientY, from: placement }
  }
  const move = (event: PointerEvent<HTMLElement>) => {
    const current = gesture.current
    if (!current) return
    const dx = event.clientX - current.startX
    const dy = event.clientY - current.startY
    if (current.kind === 'move') {
      setPlacement(keepInStage(box.current, { ...current.from, x: current.from.x + dx, y: current.from.y + dy }))
    } else {
      // Dragging the corner outward (left/down in this layout) grows the dock.
      const delta = (-dx + dy) / 260
      setPlacement(keepInStage(box.current, { ...current.from, scale: Math.min(1.7, Math.max(0.65, current.from.scale + delta)) }))
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
    setPlacement(keepInStage(box.current, { ...placement, ...change }))
  }

  if (!canDrag) return <div className={className}>{children}</div>
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
        onLostPointerCapture={end}
        onDoubleClick={() => setPlacement(keepInStage(box.current, resting))}
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
        onLostPointerCapture={end}
      >
        <Scaling size={14} />
      </span>
    </div>
  )
}
