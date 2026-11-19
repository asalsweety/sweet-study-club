import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../app/session'
import type { ChibiAppearance } from '../../shared/api/chibi'
import type { UserSettings } from '../../shared/api/settings'
import { prepareStudyArt, type PixelSceneState } from './studyRoomImage'

export function usePrepareFocusRoom() {
  const client = useQueryClient()
  return (state: PixelSceneState, forcePixel = false) => {
    // Start fetching the route and the selected artwork during the timer request.
    void import('../../pages/FocusPage').catch(() => undefined)
    const settings = client.getQueryData<UserSettings>(queryKeys.settings)
    if (forcePixel || settings?.timerDisplay === 'chibi') {
      const chibi = client.getQueryData<{ appearance: ChibiAppearance }>(queryKeys.chibi)
      prepareStudyArt(settings?.chibiScene ?? 'night-desk', state, chibi?.appearance)
    }
  }
}
