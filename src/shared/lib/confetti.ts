/**
 * Dependency-free confetti burst on a temporary full-screen canvas. Colors
 * come from the active theme so celebrations match every palette. Does
 * nothing when the person prefers reduced motion.
 */
export function celebrate({ particles = 140, origin = { x: 0.5, y: 0.35 } } = {}) {
  if (typeof window === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const canvas = document.createElement('canvas')
  canvas.className = 'confetti-canvas'
  canvas.setAttribute('aria-hidden', 'true')
  document.body.appendChild(canvas)
  const context = canvas.getContext('2d')
  if (!context) { canvas.remove(); return }

  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  const resize = () => {
    canvas.width = window.innerWidth * ratio
    canvas.height = window.innerHeight * ratio
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
  }
  resize()

  const style = getComputedStyle(document.documentElement)
  const palette = ['--primary', '--chart-2', '--chart-3', '--chart-4', '--chart-5']
    .map((name) => style.getPropertyValue(name).trim())
    .filter(Boolean)
  const colors = palette.length ? palette : ['#28624e', '#3b6ab4', '#a56c19', '#7860a6', '#bd5555']

  const width = window.innerWidth
  const height = window.innerHeight
  const pieces = Array.from({ length: particles }, (_, index) => {
    const angle = (Math.random() * Math.PI) + Math.PI // upward half-circle
    const speed = 7 + Math.random() * 9
    return {
      x: origin.x * width + (Math.random() - 0.5) * 60,
      y: origin.y * height,
      vx: Math.cos(angle) * speed * (0.6 + Math.random() * 0.8),
      vy: Math.sin(angle) * speed - 3,
      size: 5 + Math.random() * 7,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.35,
      tilt: Math.random() * 10,
      color: colors[index % colors.length] ?? '#28624e',
      shape: index % 3,
    }
  })

  const started = performance.now()
  const duration = 3200
  const frame = (now: number) => {
    const elapsed = now - started
    context.clearRect(0, 0, width, height)
    const fade = Math.max(0, 1 - Math.max(0, elapsed - duration * 0.6) / (duration * 0.4))
    for (const piece of pieces) {
      piece.vy += 0.28
      piece.vx *= 0.985
      piece.vy *= 0.985
      piece.x += piece.vx + Math.sin((elapsed / 300) + piece.tilt) * 0.6
      piece.y += piece.vy
      piece.rotation += piece.spin
      context.save()
      context.globalAlpha = fade
      context.translate(piece.x, piece.y)
      context.rotate(piece.rotation)
      context.fillStyle = piece.color
      if (piece.shape === 0) context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2)
      else if (piece.shape === 1) { context.beginPath(); context.arc(0, 0, piece.size / 2.6, 0, Math.PI * 2); context.fill() }
      else { context.beginPath(); context.moveTo(0, -piece.size / 2); context.lineTo(piece.size / 2, piece.size / 2); context.lineTo(-piece.size / 2, piece.size / 2); context.closePath(); context.fill() }
      context.restore()
    }
    if (elapsed < duration) requestAnimationFrame(frame)
    else canvas.remove()
  }
  requestAnimationFrame(frame)
}

/** A short, light vibration where supported; silent elsewhere. */
export function haptic(pattern: number | number[] = 12) {
  try { navigator.vibrate?.(pattern) } catch { /* unsupported */ }
}
