import type { ChibiLook, DecorId } from '../../shared/api/chibi'

type Rect = (x: number, y: number, w: number, h: number, color: string) => void

export const chibiSkin = {
  light: { skin: '#f7d5ba', skinShade: '#dcae91' },
  warm: { skin: '#dba47e', skinShade: '#b97c5f' },
  deep: { skin: '#a86f52', skinShade: '#83503c' },
}

const hairColors = {
  brown: ['#624131', '#9b6749'],
  black: ['#302c36', '#595063'],
  auburn: ['#713929', '#ae5d43'],
} as const

export function drawCustomChibi(look: ChibiLook, sleeve: string, frame: number, bob: number, r: Rect) {
  const { skin, skinShade } = chibiSkin[look.skin]
  const [hair, highlight] = hairColors[look.hair]
  const outline = '#392830'
  const y = 52 + bob
  const paint: Rect = (x, top, w, h, color) => r(x, y + top, w, h, color)
  const longHair = look.companion === 'girl'

  if (longHair) {
    paint(98, 15, 58, 45, outline)
    paint(101, 18, 52, 42, hair)
    paint(103, 31, 3, 21, highlight)
    paint(148, 22, 3, 30, highlight)
  }
  paint(109, 51, 37, 10, outline)
  paint(104, 56, 47, 10, outline)
  paint(107, 56, 41, 10, sleeve)
  paint(121, 46, 13, 13, skinShade)

  // Step the silhouette in whole pixels so the hair and cheeks stay crisp.
  paint(112, 0, 31, 50, outline)
  paint(105, 4, 44, 42, outline)
  paint(101, 11, 52, 28, outline)
  paint(106, 8, 44, 27, hair)
  paint(112, 3, 31, 18, hair)
  paint(109, 16, 38, 27, skin)
  paint(104, 27, 48, 11, skinShade)
  paint(110, 26, 36, 17, skin)
  paint(114, 43, 28, 6, skin)
  paint(119, 49, 18, 2, skinShade)
  paint(106, 13, longHair ? 13 : 17, 10, hair)
  paint(109, 9, 8, 3, highlight)
  paint(115, 6, 18, 2, highlight)
  paint(135, 11, 11, 5, highlight)
  paint(141, 15, 8, longHair ? 16 : 8, hair)
  if (longHair) paint(104, 27, 4, 17, hair)

  for (const x of [117, 135]) {
    paint(x, 25, 6, 2, hair)
    paint(x, 31, 6, frame === 0 ? 6 : 1, outline)
    if (frame === 0) paint(x + 3, 31, 2, 2, '#fff4e3')
  }
  paint(112, 40, 6, 2, skinShade)
  paint(138, 40, 6, 2, skinShade)
  paint(125, 43, 6, 1, '#763d40')
  if (frame !== 1) paint(126, 44, 4, 2, '#a65f61')
  paint(123, 56, 10, 2, '#e9d7c9')
}

export function drawDeskDecor(decor: DecorId | null, r: Rect) {
  if (decor === 'desk-plant') {
    r(77, 104, 13, 8, '#9b5263')
    r(76, 102, 15, 3, '#de8990')
    r(83, 93, 2, 9, '#557d50')
    r(77, 92, 6, 4, '#7ca766')
    r(84, 89, 6, 5, '#a6bf6b')
    r(85, 96, 6, 3, '#698f58')
  } else if (decor === 'desk-clock') {
    r(77, 94, 16, 15, '#956c54')
    r(79, 96, 12, 11, '#f8ead2')
    r(84, 97, 2, 6, '#4e3d50')
    r(86, 101, 3, 2, '#4e3d50')
    r(79, 109, 2, 3, '#5a423a')
    r(89, 109, 2, 3, '#5a423a')
  }
}
