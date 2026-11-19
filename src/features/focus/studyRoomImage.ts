import type { PixelSceneState } from './PixelStudyScene'
import type { ChibiScene } from './scenes'

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

export function studyRoomImage(scene: ChibiScene, state: PixelSceneState, showAsal: boolean) {
  const image = scene === 'night-desk' ? nightRooms[state] : weatherRooms[scene]
  return `/images/pixel/study-rooms/${image}${showAsal ? '' : '-open'}.png`
}
