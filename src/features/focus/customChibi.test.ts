import { expect, it } from 'vitest'
import { defaultChibi, defaultCustomization } from '../../shared/api/chibi'
import { drawCustomChibi } from './customChibi'
import { deskSprites, studyRoomArt } from './studyRoomImage'

it('keeps the built-in scene and draws the custom avatar in the open room', () => {
  const look = { ...defaultChibi, companion: 'girl' as const }
  const custom = { ...look, customization: { ...defaultCustomization, hairStyle: 'buns' as const, eyes: 'blue' as const } }
  expect(studyRoomArt('night-desk', 'studying')).toMatchObject({ containsAsal: true, sprite: null })
  expect(studyRoomArt('night-desk', 'studying', look).sprite).toBe(deskSprites.girl)
  expect(studyRoomArt('night-desk', 'studying', custom)).toEqual({
    containsAsal: false, room: '/images/pixel/study-rooms/night-open.webp', sprite: null,
  })

  const pixels: Array<{ y: number; color: string }> = []
  drawCustomChibi(custom, '#81bba1', 0, 0, (_x, y, _width, _height, color) => pixels.push({ y, color }))
  expect(pixels).toContainEqual({ y: 49, color: '#392830' })
  expect(pixels.map(({ color }) => color)).toEqual(expect.arrayContaining(['#486c98', '#81bba1']))
})
