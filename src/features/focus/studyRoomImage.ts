import { defaultChibi, type ChibiAppearance } from '../../shared/api/chibi'
import type { ChibiScene } from './scenes'

export type PixelSceneState = 'studying' | 'break' | 'paused'

export const deskSprites = {
  girl: '/images/chibi-pack/girl-desk.webp',
  boy: '/images/chibi-pack/boy-desk.webp',
}

const nightRooms: Record<PixelSceneState, string> = {
  studying: 'night',
  break: 'night-break',
  paused: 'night-paused',
}

const weatherRooms: Record<Exclude<ChibiScene, 'night-desk'>, string> = {
  'rainy-window': 'rainy',
  'snow-cabin': 'snow',
  'sunny-library': 'sunny',
}

export function studyRoomArt(scene: ChibiScene, state: PixelSceneState, look: ChibiAppearance = defaultChibi) {
  const showAsal = look.companion === 'asal' && !look.outfit && (scene === 'night-desk' || state === 'studying')
  const image = scene === 'night-desk' ? nightRooms[state] : weatherRooms[scene]
  return {
    room: `/images/pixel/study-rooms/${image}${showAsal ? '' : '-open'}.webp`,
    sprite: showAsal ? null : deskSprites[look.companion === 'boy' ? 'boy' : 'girl'],
  }
}

// Reuse the decoded image when moving between Today, Focus and the studio.
const images = new Map<string, HTMLImageElement>()

export function studyImage(url: string) {
  const existing = images.get(url)
  if (existing) return existing
  const image = new Image()
  images.set(url, image)
  image.fetchPriority = 'high'
  image.addEventListener('error', () => images.delete(url), { once: true })
  image.src = url
  return image
}

export function prepareStudyArt(scene: ChibiScene, state: PixelSceneState, appearance?: ChibiAppearance) {
  const { room, sprite } = studyRoomArt(scene, state, appearance)
  for (const url of [room, sprite]) {
    if (url) void studyImage(url).decode().catch(() => undefined)
  }
}
