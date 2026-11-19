import { useChibi, useSettings } from '../../app/session'
import { useTheme } from '../theme/useTheme'
import PixelStudyScene, { type PixelSceneState } from './PixelStudyScene'

export default function TodayStudyRoom({ state, className }: { state?: PixelSceneState; className: string }) {
  const look = useChibi().data?.appearance
  const scene = useSettings().data?.chibiScene ?? 'night-desk'
  const { mode } = useTheme()
  const reference = (!state || state === 'studying') && scene === 'night-desk' && (!look || (look.companion === 'asal' && !look.outfit && !look.decor))
  if (reference && !state) return <div role="img" aria-label="عسل پشت میزش مشغول مطالعه است" className={className + ' today-reference-room'} />
  return <PixelStudyScene appearance={look} scene={scene} isNight={scene !== 'sunny-library'} state={state ?? 'studying'}
    studyBackdrop={reference ? `/images/figma/today-room-${mode}.webp` : undefined}
    className={reference && mode === 'light' ? className + ' today-sunny-session' : className} />
}
