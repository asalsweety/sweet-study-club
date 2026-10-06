export type ChibiScene = 'night-desk' | 'rainy-window' | 'snow-cabin' | 'sunny-library'

type SceneTheme = {
  label: string
  wall: string
  daySky: string
  nightSky: string
  frame: string
  wood: string
  woodLight: string
  sweater: string
  accent: string
  weather: 'clear' | 'rain' | 'snow'
}

export const sceneThemes: Record<ChibiScene, SceneTheme> = {
  'night-desk': {
    label: 'میز شبانه',
    wall: '#2d2346',
    daySky: '#9ec9ff',
    nightSky: '#1b1838',
    frame: '#4b3b6b',
    wood: '#6b4a3a',
    woodLight: '#8a6250',
    sweater: '#f472b6',
    accent: '#f9a8d4',
    weather: 'clear',
  },
  'rainy-window': {
    label: 'پنجره‌ی بارانی',
    wall: '#3a4a5c',
    daySky: '#93a9c4',
    nightSky: '#24324a',
    frame: '#55667d',
    wood: '#5b4636',
    woodLight: '#79604c',
    sweater: '#93c5fd',
    accent: '#7dd3fc',
    weather: 'rain',
  },
  'snow-cabin': {
    label: 'کلبه‌ی برفی',
    wall: '#6b3f2f',
    daySky: '#dbeafe',
    nightSky: '#2b3555',
    frame: '#8b5a43',
    wood: '#4a2f22',
    woodLight: '#6b4535',
    sweater: '#fca5a5',
    accent: '#fde68a',
    weather: 'snow',
  },
  'sunny-library': {
    label: 'کتابخانه‌ی آفتابی',
    wall: '#fde7d3',
    daySky: '#bfe3ff',
    nightSky: '#30406b',
    frame: '#e3b98f',
    wood: '#b07a52',
    woodLight: '#c99468',
    sweater: '#a78bfa',
    accent: '#f9a8d4',
    weather: 'clear',
  },
}
