import type { ChibiAppearance } from '../../shared/api/chibi'
import { chibiItems } from '../../shared/api/chibi'

export const deskSprites = {
  girl: '/images/chibi-pack/girl-desk.webp',
  boy: '/images/chibi-pack/boy-desk.webp',
}

const skinScales = {
  light: [1.03, 1.1, 1.17],
  warm: [1, 1, 1],
  deep: [0.74, 0.65, 0.64],
} as const

function tintSprite(image: HTMLImageElement, look: ChibiAppearance): CanvasImageSource {
  if (look.skin === 'warm' && look.hair === 'brown' && !look.outfit) return image
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return image

  ctx.drawImage(image, 0, 0)
  const frameWidth = canvas.width / 3
  const raster = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const pixels = raster.data
  const [skinR, skinG, skinB] = skinScales[look.skin]
  const outfit = look.outfit ? Number.parseInt(chibiItems[look.outfit].color.slice(1), 16) : null
  const boy = look.companion === 'boy'

  // The head, skin and sleeves occupy fixed regions in each 86 × 80 source frame.
  // Color checks inside those regions preserve transparent edges, eyes and white details.
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const r = pixels[offset] ?? 0
    const g = pixels[offset + 1] ?? 0
    const b = pixels[offset + 2] ?? 0
    if ((pixels[offset + 3] ?? 0) === 0) continue
    const pixel = offset / 4
    const x = (pixel % canvas.width) % frameWidth
    const y = Math.floor(pixel / canvas.width)
    const warmColor = r > g + 8 && g > b + 5
    const skinRegion = boy
      ? (y >= 22 && y <= 52 && x >= 22 && x <= 66) || (y >= 58 && y <= 69 && (x < 32 || x > 53))
      : ((x - 45) / 24) ** 2 + ((y - 43) / 24) ** 2 <= 1
    if (skinRegion && warmColor && r >= 150 && g >= 95 && g - b <= 51) {
      pixels[offset] = r * skinR
      pixels[offset + 1] = g * skinG
      pixels[offset + 2] = b * skinB
    } else if (look.hair !== 'brown' && !skinRegion && warmColor && y < (boy ? 38 : 70)) {
      const shade = (r + g * 2 + b) / 4
      pixels[offset] = look.hair === 'black' ? shade * 0.62 : r * 1.09
      pixels[offset + 1] = look.hair === 'black' ? shade * 0.62 : g * 0.77
      pixels[offset + 2] = look.hair === 'black' ? shade * 0.72 : b * 0.72
    } else if (outfit !== null && y >= (boy ? 53 : 70) && (boy ? g > r * 0.85 && g > b + 13 : x > 28 && x < 65 && r > g + 18 && Math.abs(g - b) < 20)) {
      const lightness = (r + g + b) / 600
      pixels[offset] = (outfit >> 16) * lightness
      pixels[offset + 1] = ((outfit >> 8) & 255) * lightness
      pixels[offset + 2] = (outfit & 255) * lightness
    }
  }
  ctx.putImageData(raster, 0, 0)
  return canvas
}

export function createDeskSpriteCache() {
  let cached: { image: HTMLImageElement; key: string; sprite: CanvasImageSource } | undefined
  return (image: HTMLImageElement, look: ChibiAppearance) => {
    const key = `${look.companion}/${look.skin}/${look.hair}/${look.outfit}`
    if (cached?.image === image && cached.key === key) return cached.sprite
    const sprite = tintSprite(image, look)
    cached = { image, key, sprite }
    return sprite
  }
}
