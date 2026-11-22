import { z } from 'zod'

export const minutesPerCoin = 15
export const chibiStyles = ['asal', 'girl', 'boy'] as const
export const skinTones = ['light', 'warm', 'deep'] as const
export const hairColors = ['brown', 'black', 'auburn'] as const
export const hairStyles = ['short', 'bob', 'buns', 'ponytail'] as const
export const eyeColors = ['brown', 'green', 'blue'] as const
export const shirtColors = ['rose', 'mint', 'sky', 'honey', 'lavender'] as const
export const chibiAccessories = ['none', 'glasses', 'star-clip', 'headphones'] as const
export const outfitIds = ['lavender-knit', 'blue-hoodie'] as const
export const decorIds = ['desk-plant', 'desk-clock'] as const
export type OutfitId = typeof outfitIds[number]
export type DecorId = typeof decorIds[number]
export type ChibiItemId = OutfitId | DecorId

export const chibiItems = {
  'lavender-knit': { name: 'ژاکت یاسی', cost: 4, slot: 'outfit', color: '#a08ccc' },
  'blue-hoodie': { name: 'هودی آبی', cost: 4, slot: 'outfit', color: '#5086aa' },
  'desk-plant': { name: 'گلدان کوچک', cost: 3, slot: 'decor' },
  'desk-clock': { name: 'ساعت رومیزی', cost: 3, slot: 'decor' },
} as const satisfies Record<ChibiItemId, { name: string; cost: number; slot: 'outfit' | 'decor'; color?: string }>

export const chibiCustomizationSchema = z.object({
  hairStyle: z.enum(hairStyles),
  eyes: z.enum(eyeColors),
  shirt: z.enum(shirtColors),
  accessory: z.enum(chibiAccessories),
}).strict()

const lookSchema = z.object({
  companion: z.enum(chibiStyles),
  skin: z.enum(skinTones),
  hair: z.enum(hairColors),
  customization: chibiCustomizationSchema.nullable().optional(),
})
const itemSchema = z.enum([...outfitIds, ...decorIds])
const appearanceSchema = lookSchema.extend({
  outfit: z.enum(outfitIds).nullable(),
  decor: z.enum(decorIds).nullable(),
  customization: chibiCustomizationSchema.nullable().default(null),
})
export const chibiResponseSchema = z.object({
  appearance: appearanceSchema,
  coins: z.number().int().nonnegative(),
  owned: z.array(itemSchema),
})
export const buyChibiItemSchema = z.object({ item: itemSchema })
export const updateChibiSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('look'), look: lookSchema }),
  z.object({ action: z.literal('equip'), item: itemSchema, use: z.boolean() }),
])

export type ChibiLook = z.infer<typeof lookSchema>
export type ChibiCustomization = z.infer<typeof chibiCustomizationSchema>
export type ChibiAppearance = z.infer<typeof appearanceSchema>
export type ChibiUpdate = z.infer<typeof updateChibiSchema>
export const defaultChibi: ChibiAppearance = {
  companion: 'asal',
  skin: 'warm',
  hair: 'brown',
  outfit: null,
  decor: null,
  customization: null,
}

export const defaultCustomization: ChibiCustomization = {
  hairStyle: 'bob',
  eyes: 'brown',
  shirt: 'rose',
  accessory: 'none',
}

export const chibiShirtPalette: Record<ChibiCustomization['shirt'], string> = {
  rose: '#eeaaa9',
  mint: '#81bba1',
  sky: '#82acd3',
  honey: '#e6b365',
  lavender: '#a08ccc',
}
