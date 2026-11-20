import type { ChibiAppearance } from '../../shared/api/chibi'
import { chibiItems } from '../../shared/api/chibi'

const skinScales = {
  light: [1.03, 1.1, 1.17],
  warm: [1, 1, 1],
  deep: [0.74, 0.65, 0.64],
} as const

// These cutouts follow the face, neck and clothes in the original 86 × 80
// frames. The eyes change inside the cutouts as the character blinks. Several
// hair highlights and skin pixels use the same colors in the source palette.
const cutouts = {
  girl: [
    'M22 80 L23 76 27 73 32 70 36 68 41 67 42 65 37 63 32 61 30 59',
    'L25 59 22 57 21 54 21 52 24 50 26 50 26 47 28 44 29 41 31 37 32 35',
    'L33 32 35 29 36 25 40 22 42 21 50 21 53 23 55 26 57 29 60 31 61 34',
    'L64 37 66 40 67 44 67 47 69 49 70 51 70 54 68 57 65 58 64 60',
    'L59 62 54 64 50 65 51 68 56 70 60 73 63 75 64 80 Z',
    // Hair clip and earrings.
    'M22 23 H27 V26 H22 Z M17 58 H20 V60 H17 Z M67 58 H69 V60 H67 Z',
  ].join(' '),
  boy: [
    'M0 51 H16 L17 48 19 47 22 47 25 49 27 50 26 47 26 40 29 37 32 36',
    'L34 35 31 35 31 27 33 26 36 25 43 25 45 26 46 28 46 31 45 35',
    'L43 37 46 36 47 37 46 39 44 40 44 42 48 42 50 40 53 38 54 36',
    'L54 33 55 32 58 32 63 35 66 38 66 46 65 49 66 49 68 47 71 47',
    'L73 49 73 51 H86 V80 H0 Z',
  ].join(' '),
} as const

const frameWidth = 86
const frameHeight = 80
const maskCache = new Map<keyof typeof cutouts, Uint8ClampedArray>()

function getHairMask(style: keyof typeof cutouts) {
  const cached = maskCache.get(style)
  if (cached) return cached
  const stencil = document.createElement('canvas')
  stencil.width = frameWidth
  stencil.height = frameHeight
  const ctx = stencil.getContext('2d')
  if (!ctx) return null
  ctx.fillRect(0, 0, frameWidth, frameHeight)
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fill(new Path2D(cutouts[style]))
  const mask = ctx.getImageData(0, 0, frameWidth, frameHeight).data
  maskCache.set(style, mask)
  return mask
}

function tintSprite(image: HTMLImageElement, look: ChibiAppearance): CanvasImageSource {
  const hair = look.companion === 'asal' ? 'brown' : look.hair
  const skin = look.companion === 'asal' ? 'warm' : look.skin
  if (skin === 'warm' && hair === 'brown' && !look.outfit) return image
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return image

  ctx.drawImage(image, 0, 0)
  const raster = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const pixels = raster.data
  const [skinR, skinG, skinB] = skinScales[skin]
  const outfit = look.outfit ? Number.parseInt(chibiItems[look.outfit].color.slice(1), 16) : null
  const boy = look.companion === 'boy'
  const mask = getHairMask(boy ? 'boy' : 'girl')
  if (!mask) return image

  for (let offset = 0; offset < pixels.length; offset += 4) {
    const r = pixels[offset] ?? 0
    const g = pixels[offset + 1] ?? 0
    const b = pixels[offset + 2] ?? 0
    if ((pixels[offset + 3] ?? 0) === 0) continue
    const pixel = offset / 4
    const x = (pixel % canvas.width) % frameWidth
    const y = Math.floor(pixel / canvas.width)
    const hairPixel = (mask[(y * frameWidth + x) * 4 + 3] ?? 0) >= 128
    if (hairPixel) {
      if (hair !== 'brown') {
        const shade = r * 0.30 + g * 0.59 + b * 0.11
        pixels[offset] = hair === 'black' ? shade * 0.51 + 6 : shade * 1.15 + 18
        pixels[offset + 1] = hair === 'black' ? shade * 0.48 + 7 : shade * 0.62 + 9
        pixels[offset + 2] = hair === 'black' ? shade * 0.54 + 10 : shade * 0.39 + 10
      }
      continue
    }
    const warmColor = r > g + 8 && g > b + 5
    const skinRegion = boy
      ? y >= 25 && (y <= 63 || (x >= 40 && x <= 49 && y <= 70))
      : y >= 21 && (y <= 64 || (x >= 41 && x <= 49 && y <= 72))
    if (skin !== 'warm' && skinRegion && warmColor && r >= 150 && g >= 95 && g - b <= 51) {
      pixels[offset] = r * skinR
      pixels[offset + 1] = g * skinG
      pixels[offset + 2] = b * skinB
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
