import { memo, useEffect, useRef } from 'react'
import { chibiItems, defaultChibi, type ChibiAppearance } from '../../shared/api/chibi'
import { chibiSkin, drawCustomChibi, drawDeskDecor } from './customChibi'
import { sceneThemes, type ChibiScene as SceneId } from './scenes'

/**
 * A lo-fi pixel-art study room starring Asal (sprite generated from her
 * illustration by scripts/pixelate-asal.py). While a session runs she writes
 * and nods along; paused, she dozes; on a pomodoro break she sips her tea.
 * Drawn on a 256×144 canvas scaled with crisp pixels at ~12 fps; drawing
 * stops off-screen and in hidden tabs, and reduced-motion users get a still.
 */
export type PixelSceneState = 'studying' | 'break' | 'paused'

type Props = {
  scene: SceneId
  isNight: boolean
  state: PixelSceneState
  appearance?: ChibiAppearance | undefined
  className?: string
}

const W = 256
const H = 144
const FRAME_MS = 1000 / 12
const DESK_Y = 112
const SPRITE_URL = '/images/pixel/asal-desk.png?v=2'
// Display size of each frame. Measure the loaded sheet independently in case
// an older asset is cached. The sheet always has three equal frames.
const SPRITE_W = 86
const SPRITE_H = 80
const SPRITE_X = 128 - SPRITE_W / 2
const SPRITE_Y = DESK_Y - Math.round(SPRITE_H * 0.89)

type Rect = (x: number, y: number, w: number, h: number, color: string) => void
type Palette = { skin: string; skinShade: string; sleeve: string; sleeveShade: string; sleeveLight: string }

const fallbackPalette: Palette = { skin: '#f6c7a3', skinShade: '#e4a987', sleeve: '#557a6b', sleeveShade: '#41625a', sleeveLight: '#6c9483' }

function rng(seed: number) {
  let value = seed
  return () => {
    value = (value + 0x6d2b79f5) | 0
    let t = Math.imul(value ^ (value >>> 15), 1 | value)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function mix(hex: string, amount: number) {
  const value = Number.parseInt(hex.slice(1), 16)
  const channel = (shift: number) => {
    const c = (value >> shift) & 255
    return Math.max(0, Math.min(255, Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount))))
  }
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`
}

function createLayout(scene: SceneId) {
  const random = rng(scene.length * 7919 + scene.charCodeAt(0) * 31)
  const bookColors = ['#d4776a', '#e9bd63', '#7398c4', '#9a7cc2', '#6aa889', '#e295b3', '#efdcb4']
  const books: Array<{ x: number; w: number; h: number; color: string; tilt: boolean }> = []
  for (let x = 14; x < 58;) {
    const w = 3 + Math.floor(random() * 3)
    books.push({ x, w, h: 9 + Math.floor(random() * 7), color: bookColors[Math.floor(random() * bookColors.length)] ?? '#d4776a', tilt: random() < 0.12 })
    x += w + (random() < 0.15 ? 2 : 0)
  }
  const stars = Array.from({ length: 22 }, () => ({ x: 170 + Math.floor(random() * 64), y: 16 + Math.floor(random() * 34), phase: random() * 6, big: random() < 0.15 }))
  const buildings: Array<{ x: number; w: number; h: number; lights: Array<{ x: number; y: number; phase: number }> }> = []
  for (let x = 168; x < 238;) {
    const w = 7 + Math.floor(random() * 8)
    const h = 12 + Math.floor(random() * 24)
    const lights: Array<{ x: number; y: number; phase: number }> = []
    for (let ly = 3; ly < h - 2; ly += 4) for (let lx = 2; lx < w - 1; lx += 3) if (random() < 0.45) lights.push({ x: x + lx, y: 86 - h + ly, phase: random() * 40 })
    buildings.push({ x, w, h, lights })
    x += w + 1
  }
  const drops = Array.from({ length: 34 }, () => ({ x: 166 + random() * 76, y: random() * 74, speed: 90 + random() * 50 }))
  const flakes = Array.from({ length: 40 }, () => ({ x: 166 + random() * 72, y: random() * 74, speed: 7 + random() * 7, sway: random() * 6 }))
  const bulbs = Array.from({ length: 13 }, (_, index) => ({ x: 10 + index * 12, phase: random() * 6, color: ['#ffd36e', '#ff9fb4', '#9fe2ff', '#c7f59a'][index % 4] ?? '#ffd36e' }))
  return { books, stars, buildings, drops, flakes, bulbs }
}
type Layout = ReturnType<typeof createLayout>

function drawRoom(ctx: CanvasRenderingContext2D, t: number, scene: SceneId, isNight: boolean, layout: Layout, r: Rect) {
  const theme = sceneThemes[scene]
  const wall = isNight ? mix(theme.wall, -0.35) : theme.wall
  // Wall: soft vertical banding plus a wainscot line.
  r(0, 0, W, H, wall)
  for (let x = 0; x < W; x += 6) r(x, 0, 2, DESK_Y, mix(theme.wall, isNight ? -0.4 : -0.05))
  r(0, 92, W, 1, mix(theme.wall, isNight ? -0.5 : -0.15))

  // Window with sky, weather and the city.
  const win = { x: 168, y: 14, w: 72, h: 74 }
  ctx.save()
  ctx.beginPath()
  ctx.rect(win.x, win.y, win.w, win.h)
  ctx.clip()
  const sky = isNight
    ? ['#151838', '#1b2048', '#232a58', '#2d3567', '#3a3f74', '#4a4880']
    : theme.weather === 'clear' ? ['#78b6f2', '#8cc3f5', '#a0cff7', '#b5dbf8', '#c9e5f9', '#ffe4c8'] : ['#8796ad', '#93a2b7', '#a0adc0', '#acb8c9', '#b9c3d2', '#c5cdd9']
  sky.forEach((color, index) => r(win.x, win.y + index * 13, win.w, 13, color))
  if (isNight && theme.weather !== 'rain') {
    for (const star of layout.stars) {
      const glow = Math.sin(t * 1.7 + star.phase)
      if (glow < -0.4) continue
      r(star.x, star.y, 1, 1, '#fff7dc')
      if (star.big && glow > 0.5) { r(star.x - 1, star.y, 3, 1, '#c9c3ff'); r(star.x, star.y - 1, 1, 3, '#c9c3ff'); r(star.x, star.y, 1, 1, '#ffffff') }
    }
  }
  if (isNight) {
    ctx.globalAlpha = 0.16; r(213, 19, 17, 17, '#fff4cf'); ctx.globalAlpha = 0.28; r(215, 21, 13, 13, '#fff4cf'); ctx.globalAlpha = 1
    r(217, 22, 9, 11, '#fbf0c4'); r(216, 23, 11, 9, '#fbf0c4'); r(219, 25, 2, 2, '#e8dba6'); r(222, 28, 2, 1, '#e8dba6')
  } else if (theme.weather === 'clear') {
    ctx.globalAlpha = 0.35; r(212, 18, 18, 18, '#fff3b0'); ctx.globalAlpha = 1
    r(216, 21, 10, 12, '#ffe17a'); r(215, 22, 12, 10, '#ffe17a')
    const drift = ((t * 2.5) % 110) - 20
    for (const [cx, cy] of [[drift + 160, 30], [drift + 196, 44]] as const) { r(cx, cy, 14, 4, '#ffffff'); r(cx + 3, cy - 3, 8, 3, '#ffffff'); r(cx + 2, cy + 3, 11, 1, '#e4eefa') }
  }
  for (const building of layout.buildings) {
    r(building.x, 88 - building.h, building.w, building.h, isNight ? '#10132b' : '#7d8ba3')
    r(building.x, 88 - building.h, building.w, 1, isNight ? '#1d2245' : '#93a1b8')
    if (isNight) for (const light of building.lights) if (Math.sin(t * 0.12 + light.phase) > -0.55) r(light.x, light.y, 2, 2, light.phase > 20 ? '#ffd77a' : '#ffb86b')
  }
  if (theme.weather === 'rain') {
    ctx.fillStyle = isNight ? 'rgba(160, 180, 235, 0.75)' : 'rgba(240, 246, 255, 0.85)'
    for (const drop of layout.drops) {
      const y = (drop.y + t * drop.speed) % 80
      ctx.fillRect(Math.round(drop.x - y * 0.18), Math.round(win.y + y), 1, 4)
    }
  } else if (theme.weather === 'snow') {
    ctx.fillStyle = '#ffffff'
    for (const flake of layout.flakes) {
      const y = (flake.y + t * flake.speed) % 78
      ctx.fillRect(Math.round(flake.x + Math.sin(t + flake.sway) * 2), Math.round(win.y + y), flake.sway > 4 ? 2 : 1, flake.sway > 4 ? 2 : 1)
    }
  }
  ctx.restore()
  const frame = theme.frame
  r(win.x - 3, win.y - 3, win.w + 6, 3, frame); r(win.x - 3, win.y + win.h, win.w + 6, 3, frame)
  r(win.x - 3, win.y, 3, win.h, frame); r(win.x + win.w, win.y, 3, win.h, frame)
  r(win.x + win.w / 2 - 1, win.y, 2, win.h, frame); r(win.x, win.y + 36, win.w, 2, frame)
  r(win.x - 6, win.y + win.h + 3, win.w + 12, 3, theme.woodLight); r(win.x - 6, win.y + win.h + 6, win.w + 12, 1, mix(theme.wood, -0.3))
  if (theme.weather === 'snow') r(win.x, win.y + win.h - 2, win.w, 2, '#f4f8ff')
  // Curtains with soft folds, gathered at the bottom.
  for (const [side, dir] of [[win.x - 13, 1], [win.x + win.w + 3, -1]] as const) {
    const curtain = mix(theme.accent, isNight ? -0.45 : -0.15)
    for (let y = win.y - 6; y < win.y + win.h + 2; y++) {
      const pinch = y > win.y + 44 ? Math.min(4, Math.floor((y - win.y - 44) / 6)) : 0
      const x = dir === 1 ? side + pinch : side
      r(x, y, 10 - pinch, 1, curtain)
      r(x + 3, y, 1, 1, mix(theme.accent, isNight ? -0.6 : -0.32))
      r(x + 7 - pinch, y, 1, 1, mix(theme.accent, isNight ? -0.3 : 0.05))
    }
  }
  r(win.x - 16, win.y - 8, win.w + 32, 2, '#4a3a33')
  r(win.x - 17, win.y - 9, 3, 4, '#6b5649'); r(win.x + win.w + 14, win.y - 9, 3, 4, '#6b5649')

  // Shelf with books, a photo frame and a trailing plant.
  for (const book of layout.books) {
    if (book.tilt) { for (let i = 0; i < book.h; i++) r(book.x + Math.floor(i / 4), 44 - i - 1, book.w, 1, book.color) ; continue }
    r(book.x, 44 - book.h, book.w, book.h, book.color)
    r(book.x, 44 - book.h + 2, book.w, 1, mix(book.color, -0.25))
    r(book.x, 44 - book.h + book.h - 3, book.w, 1, mix(book.color, 0.3))
  }
  r(60, 32, 10, 12, '#e8d6b6'); r(61, 33, 8, 9, '#9fc7e8'); r(61, 38, 8, 4, '#79a86f'); r(63, 35, 2, 2, '#fff2a8')
  r(8, 44, 72, 3, theme.woodLight); r(8, 47, 72, 1, mix(theme.wood, -0.3))
  r(72, 38, 8, 6, '#c97c5d'); r(72, 38, 8, 1, '#e5a083')
  const sway = Math.sin(t * 1.1)
  for (let i = 0; i < 18; i++) {
    const vx = 75 + Math.round(Math.sin(i / 3 + sway * 0.6) * 2) + (i > 9 ? 1 : 0)
    r(vx, 44 + i, 1, 1, '#4f8a55')
    if (i % 3 === 0) r(vx + (i % 2 ? 1 : -2), 44 + i, 2, 2, i % 6 === 0 ? '#79b878' : '#5f9d62')
  }
  for (const [dx, dy] of [[-1, -5], [2, -7], [5, -4], [0, -3]] as const) r(74 + dx, 38 + dy, 2, 3 - (dy > -4 ? 1 : 0), '#6bae6c')

  // String lights draped across the wall.
  for (let x = 6; x < 160; x++) {
    const y = 8 + Math.round(Math.sin(((x - 6) / 154) * Math.PI * 3) * 3 + 3)
    r(x, y, 1, 1, '#3d3247')
  }
  for (const bulb of layout.bulbs) {
    const y = 8 + Math.round(Math.sin(((bulb.x - 6) / 154) * Math.PI * 3) * 3 + 3) + 1
    const on = Math.sin(t * 2.2 + bulb.phase) > -0.5
    if (on) { ctx.globalAlpha = isNight ? 0.35 : 0.18; r(bulb.x - 2, y - 1, 5, 5, bulb.color); ctx.globalAlpha = 1 }
    r(bulb.x, y, 2, 3, on ? bulb.color : mix(bulb.color, -0.45))
  }
}

function drawLight(ctx: CanvasRenderingContext2D, t: number, isNight: boolean) {
  // Night dims the room, then warm lamp light is added back with 'lighter'.
  if (isNight) {
    ctx.globalAlpha = 0.3
    ctx.fillStyle = '#0a0b20'
    ctx.fillRect(0, 0, W, H)
  }
  const flicker = 1 + Math.sin(t * 6) * 0.03 + (Math.sin(t * 19) > 0.985 ? -0.12 : 0)
  const strength = (isNight ? 0.75 : 0.32) * flicker
  ctx.globalCompositeOperation = 'lighter'
  // A pool of warm light on the desk under the shade...
  ctx.save()
  ctx.translate(53, 104)
  ctx.scale(1.7, 0.55)
  const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, 46)
  pool.addColorStop(0, `rgba(255, 176, 92, ${strength})`)
  pool.addColorStop(0.5, `rgba(255, 140, 60, ${strength * 0.4})`)
  pool.addColorStop(1, 'rgba(255, 120, 50, 0)')
  ctx.fillStyle = pool
  ctx.fillRect(-46, -46, 92, 92)
  ctx.restore()
  // ...and a soft halo around the bulb that reaches Asal's side of the room.
  const halo = ctx.createRadialGradient(53, 92, 0, 53, 92, 60)
  halo.addColorStop(0, `rgba(255, 200, 120, ${strength * 0.9})`)
  halo.addColorStop(0.35, `rgba(255, 160, 80, ${strength * 0.25})`)
  halo.addColorStop(1, 'rgba(255, 140, 60, 0)')
  ctx.fillStyle = halo
  ctx.fillRect(0, 30, 120, 114)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
}

function drawLamp(r: Rect) {
  r(30, DESK_Y - 3, 16, 3, '#3f4f60'); r(30, DESK_Y - 3, 16, 1, '#5b6e82')
  for (let i = 0; i < 22; i++) r(37 + Math.floor(i / 4), DESK_Y - 4 - i, 2, 1, '#566a7f')
  for (let i = 0; i < 9; i++) r(42 + i, 86 + Math.floor(i / 3), 2, 1, '#566a7f')
  // Shade.
  for (let row = 0; row < 7; row++) r(46 - row, 84 + row, 14 + row * 2, 1, row === 0 ? '#8fa6bd' : '#6f87a0')
  r(48, 91, 10, 1, '#fff1bf'); r(50, 92, 6, 1, '#ffe08a')
}

function drawDesk(ctx: CanvasRenderingContext2D, scene: SceneId, isNight: boolean, r: Rect) {
  const theme = sceneThemes[scene]
  r(0, DESK_Y, W, 8, theme.woodLight)
  r(0, DESK_Y, W, 1, mix(theme.woodLight, 0.2))
  for (let x = 8; x < W; x += 23) r(x, DESK_Y + 3, 9, 1, mix(theme.woodLight, -0.08))
  r(0, DESK_Y + 8, W, H - DESK_Y - 8, theme.wood)
  r(0, DESK_Y + 8, W, 1, mix(theme.wood, -0.35))
  for (const dx of [26, 166]) { r(dx, DESK_Y + 16, 64, 1, mix(theme.wood, -0.3)); r(dx + 28, DESK_Y + 20, 8, 2, theme.woodLight) }
  if (isNight) { ctx.globalAlpha = 0.2; r(0, DESK_Y + 8, W, H, '#0a0b20'); ctx.globalAlpha = 1 }
}

function drawNotebook(t: number, state: PixelSceneState, r: Rect) {
  const x = 106
  const y = DESK_Y + 1
  r(x - 1, y + 1, 46, 7, 'rgba(60, 40, 30, 0.25)')
  r(x, y, 22, 6, '#fffaf0'); r(x + 23, y, 22, 6, '#fffaf0'); r(x + 22, y, 1, 6, '#d9cdb5')
  for (let line = 0; line < 3; line++) r(x + 3, y + 1 + line * 2, 15, 1, '#d6dff0')
  r(x + 3, y + 1, 9, 1, '#7d8bad'); r(x + 3, y + 3, 13, 1, '#7d8bad')
  const cycle = 16
  const local = state === 'studying' ? t % cycle : 7
  const done = Math.min(3, Math.floor(local / 4.6))
  for (let line = 0; line < done; line++) r(x + 26, y + 1 + line * 2, 15, 1, '#7d8bad')
  const progress = state === 'studying' ? (local % 4.6) / 4.6 : 0
  if (state === 'studying' && done < 3) r(x + 26, y + 1 + done * 2, Math.max(1, Math.round(15 * progress)), 1, '#7d8bad')
  if (state === 'studying' && local > cycle - 0.7) {
    const flip = (local - (cycle - 0.7)) / 0.7
    const lift = Math.round(Math.sin(flip * Math.PI) * 6)
    r(x + 23 - Math.round(22 * flip), y - lift, Math.max(2, 22 - Math.round(16 * Math.sin(flip * Math.PI))), 6, '#ffffff')
  }
  return progress
}

function drawArms(t: number, state: PixelSceneState, progress: number, palette: Palette, r: Rect) {
  // Left forearm rests on the notebook.
  for (let i = 0; i < 9; i++) r(100 + i, DESK_Y - 6 + Math.floor(i / 2), 8, 1, i < 2 ? palette.sleeveShade : palette.sleeve)
  r(102, DESK_Y - 3, 6, 1, palette.sleeveLight)
  r(108, DESK_Y - 1, 6, 4, palette.skin); r(108, DESK_Y + 2, 6, 1, palette.skinShade)
  if (state === 'break') return
  // Right forearm and the writing hand.
  const writing = state === 'studying'
  const dx = writing ? Math.round(progress * 12) - 2 : 0
  const dy = writing && Math.floor(t * 8) % 2 === 0 ? -1 : 0
  for (let i = 0; i < 9; i++) r(150 - i + Math.round(dx * (i / 9)), DESK_Y - 6 + Math.floor(i / 2), 8, 1, i < 2 ? palette.sleeveShade : palette.sleeve)
  const hx = 135 + dx
  const hy = DESK_Y - 1 + dy
  r(hx, hy, 6, 4, palette.skin); r(hx, hy + 3, 6, 1, palette.skinShade)
  // Pencil.
  r(hx - 1, hy + 2, 1, 2, '#3a2a20')
  for (let i = 0; i < 7; i++) r(hx + i, hy + 1 - i, 1, 1, i < 5 ? '#f2c94c' : '#f09aac')
}

function drawMug(t: number, state: PixelSceneState, palette: Palette, ctx: CanvasRenderingContext2D, r: Rect) {
  const sipping = state === 'break'
  const tilt = sipping && (t % 3.2) < 1.3 ? 1 : 0
  const mx = sipping ? 126 : 166
  const my = sipping ? SPRITE_Y + Math.round(SPRITE_H * 0.64) - tilt : DESK_Y - 9
  if (sipping) {
    r(mx - 4, my + 4, 5, 5, palette.skin); r(mx + 9, my + 4, 4, 5, palette.skin)
  }
  r(mx, my, 9, 10, '#fbf4ea'); r(mx, my, 9, 1, '#ffffff'); r(mx, my + 3, 9, 2, '#ef9fb6'); r(mx + 8, my, 1, 10, '#e3d8c8')
  r(mx + 9, my + 2, 2, 1, '#fbf4ea'); r(mx + 11, my + 3, 1, 4, '#fbf4ea'); r(mx + 9, my + 7, 2, 1, '#fbf4ea')
  for (let i = 0; i < 3; i++) {
    const phase = ((t * 0.5) + i / 3) % 1
    ctx.globalAlpha = 0.5 * (1 - phase)
    r(mx + 2 + i * 2 + Math.round(Math.sin(t * 2.2 + i) * 1.2), my - 3 - phase * 12, 1, 3, '#ffffff')
  }
  ctx.globalAlpha = 1
}

function drawCat(t: number, r: Rect) {
  const x = 196
  const y = DESK_Y - 11
  const breathe = Math.sin(t * 1.25) > 0.15 ? 1 : 0
  const fur = '#f7f4ef'
  const dark = '#dcd5cb'
  const outline = '#7a6a62'
  // Curled loaf, head on the left.
  for (let row = 0; row < 10; row++) {
    const width = row < 2 ? 18 - (2 - row) * 4 : row > 8 ? 26 : 28
    const left = x + 6 + (row < 2 ? 4 - row * 2 : 0) - (row > 6 ? 1 : 0)
    r(left, y + row - (row < 5 ? breathe : 0), width, 1, row === 0 ? outline : fur)
  }
  for (const sx of [12, 18, 24]) r(x + sx, y + 2 - breathe, 2, 4, dark)
  r(x + 5, y + 9, 30, 1, outline)
  // Head with ears and a sleepy face.
  r(x, y + 2, 11, 8, fur); r(x - 1, y + 3, 1, 6, outline); r(x, y + 1, 11, 1, outline)
  r(x + 1, y - 1, 2, 2, fur); r(x + 1, y - 2, 1, 1, outline); r(x + 7, y - 1, 2, 2, fur); r(x + 8, y - 2, 1, 1, outline)
  r(x + 2, y + 5, 2, 1, outline); r(x + 7, y + 5, 2, 1, outline)
  r(x + 5, y + 6, 1, 1, '#ef8fa0'); r(x + 1, y + 7, 9, 2, '#ffffff'); r(x + 2, y - 1, 1, 1, '#f3b3c0'); r(x + 7, y - 1, 1, 1, '#f3b3c0')
  // Tail curls around the front and flicks now and then.
  const flick = Math.floor(t * 1.4) % 5 === 0 ? 1 : 0
  r(x + 10, y + 9, 22, 2, fur); r(x + 8 - flick, y + 8 - flick, 3, 2, dark)
}

function drawSleepZ(ctx: CanvasRenderingContext2D, t: number, r: Rect) {
  for (let i = 0; i < 3; i++) {
    const phase = ((t * 0.35) + i / 3) % 1
    ctx.globalAlpha = Math.sin(phase * Math.PI)
    const size = 3 + i
    const zx = SPRITE_X + SPRITE_W * 0.84 + phase * 12 + i * 3
    const zy = SPRITE_Y + 10 - phase * 22
    r(zx, zy, size, 1, '#ffffff'); r(zx + size - 2, zy + 1, 1, 1, '#ffffff'); r(zx + 1, zy + 2, 1, 1, '#ffffff'); r(zx, zy + 3, size, 1, '#ffffff')
  }
  ctx.globalAlpha = 1
}

function vignette(ctx: CanvasRenderingContext2D) {
  for (let i = 0; i < 6; i++) {
    ctx.globalAlpha = 0.05
    ctx.fillStyle = '#05050f'
    ctx.fillRect(0, 0, W, 2 + i * 2); ctx.fillRect(0, H - 2 - i * 2, W, 2 + i * 2)
    ctx.fillRect(0, 0, 3 + i * 3, H); ctx.fillRect(W - 3 - i * 3, 0, 3 + i * 3, H)
  }
  ctx.globalAlpha = 1
}

function samplePalette(sprite: HTMLImageElement): Palette {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = SPRITE_W
    canvas.height = SPRITE_H
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return fallbackPalette
    ctx.drawImage(sprite, 0, 0, sprite.naturalWidth / 3, sprite.naturalHeight, 0, 0, SPRITE_W, SPRITE_H)
    const data = ctx.getImageData(0, 0, SPRITE_W, SPRITE_H).data
    const at = (x: number, y: number) => { const i = (y * SPRITE_W + x) * 4; return `#${[data[i], data[i + 1], data[i + 2]].map((c) => (c ?? 0).toString(16).padStart(2, '0')).join('')}` }
    const sleeve = at(Math.round(SPRITE_W * 0.36), Math.round(SPRITE_H * 0.94))
    const skin = at(Math.round(SPRITE_W * 0.536), Math.round(SPRITE_H * 0.625))
    return { skin, skinShade: mix(skin, -0.1), sleeve, sleeveShade: mix(sleeve, -0.22), sleeveLight: mix(sleeve, 0.18) }
  } catch {
    return fallbackPalette
  }
}

function PixelStudyScene({ scene, isNight, state, appearance = defaultChibi, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const props = useRef({ scene, isNight, state, appearance })
  props.current = { scene, isNight, state, appearance }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.imageSmoothingEnabled = false
    const r: Rect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w, h) }
    const layouts = new Map<SceneId, Layout>()
    const layoutFor = (id: SceneId) => {
      let layout = layouts.get(id)
      if (!layout) { layout = createLayout(id); layouts.set(id, layout) }
      return layout
    }
    const sprite = new Image()
    let spriteReady = false
    let palette = fallbackPalette
    let lastTime = 0
    sprite.onload = () => { spriteReady = true; palette = samplePalette(sprite); render(lastTime) }
    sprite.src = SPRITE_URL

    const render = (t: number) => {
      lastTime = t
      const { scene: id, isNight: night, state: mood, appearance: look } = props.current
      const isAsal = look.companion === 'asal'
      const base = isAsal ? palette : { ...fallbackPalette, ...chibiSkin[look.skin] }
      const sleeve = look.outfit ? chibiItems[look.outfit].color : null
      const colors = sleeve ? { ...base, sleeve, sleeveShade: mix(sleeve, -0.22), sleeveLight: mix(sleeve, 0.18) } : base
      const bob = mood === 'studying' ? Math.floor(t / 0.75) % 2 : mood === 'paused' && Math.sin(t * 1.3) > 0.5 ? 1 : 0
      const frame = mood === 'break' ? 2 : mood === 'paused' || t % 3.6 < 0.16 ? 1 : 0
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      drawRoom(ctx, t, id, night, layoutFor(id), r)
      drawLamp(r)
      if (!isAsal) {
        drawCustomChibi(look, colors.sleeve, frame, bob, r)
      } else if (spriteReady) {
        const frameWidth = sprite.naturalWidth / 3
        ctx.drawImage(sprite, frame * frameWidth, 0, frameWidth, sprite.naturalHeight, SPRITE_X, SPRITE_Y + bob, SPRITE_W, SPRITE_H)
      }
      drawDesk(ctx, id, night, r)
      const progress = drawNotebook(t, mood, r)
      drawArms(t, mood, progress, colors, r)
      // Book stack, pencil cup and the cat share the right side of the desk.
      r(150, DESK_Y - 4, 18, 4, '#7398c4'); r(151, DESK_Y - 8, 16, 4, '#d4776a'); r(151, DESK_Y - 6, 16, 1, '#ecaa9d'); r(152, DESK_Y - 11, 14, 3, '#efdcb4')
      r(64, DESK_Y - 9, 7, 9, '#9a7cc2'); r(64, DESK_Y - 9, 7, 1, '#b79ddb'); r(65, DESK_Y - 13, 1, 4, '#f2c94c'); r(67, DESK_Y - 14, 1, 5, '#e66d6d'); r(69, DESK_Y - 12, 1, 3, '#6aa889')
      drawDeskDecor(look.decor, r)
      drawMug(t, mood, colors, ctx, r)
      drawCat(t, r)
      drawLight(ctx, t, night)
      if (mood === 'paused') drawSleepZ(ctx, t, r)
      vignette(ctx)
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduced.matches) {
      const still = window.setInterval(() => render(5), 1000)
      render(5)
      return () => window.clearInterval(still)
    }
    let frame = 0
    let last = 0
    let visible = true
    const started = performance.now()
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop)
      if (!visible || now - last < FRAME_MS) return
      last = now
      render((now - started) / 1000)
    }
    const observer = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? true })
    observer.observe(canvas)
    render(0)
    frame = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(frame); observer.disconnect() }
  }, [])

  const name = appearance.companion === 'asal' ? 'عسل' : 'چیبی تو'
  const label = name + (state === 'studying' ? ' پشت میزش مشغول مطالعه است' : state === 'break' ? ' در استراحت چای می‌نوشد' : ' کمی چرت می‌زند')
  return <canvas ref={canvasRef} width={W} height={H} className={className} role="img" aria-label={label} style={{ imageRendering: 'pixelated' }} />
}

export default memo(PixelStudyScene)
