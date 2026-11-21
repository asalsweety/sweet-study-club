import { z } from 'zod'

export const sheetKinds = ['identity', 'monthly', 'habits', 'weekly', 'daily', 'review', 'chapter'] as const
export const sheetKindSchema = z.enum(sheetKinds)
export type SheetKind = z.infer<typeof sheetKindSchema>

/** Field values: text, ticks and small numbers (stars, counts). */
export const sheetValueSchema = z.union([z.string().max(2000), z.boolean(), z.number().finite()])
export type SheetValue = z.infer<typeof sheetValueSchema>
export const sheetDataSchema = z.record(z.string().max(40), sheetValueSchema).refine((data) => Object.keys(data).length <= 800)
export type SheetData = z.infer<typeof sheetDataSchema>

export const sheetSummarySchema = z.object({
  id: z.string(),
  kind: sheetKindSchema,
  title: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export const sheetSchema = sheetSummarySchema.extend({ data: sheetDataSchema })
export type SheetSummary = z.infer<typeof sheetSummarySchema>
export type Sheet = z.infer<typeof sheetSchema>

export const sheetsResponseSchema = z.object({ sheets: z.array(sheetSummarySchema) })
export const sheetResponseSchema = z.object({ sheet: sheetSchema })
export const createSheetInputSchema = z.object({ kind: sheetKindSchema, title: z.string().trim().min(1).max(80).optional() }).strict()
export const updateSheetInputSchema = z.object({ title: z.string().trim().min(1).max(80).optional(), data: sheetDataSchema.optional() }).strict()
export type UpdateSheetInput = z.infer<typeof updateSheetInputSchema>
