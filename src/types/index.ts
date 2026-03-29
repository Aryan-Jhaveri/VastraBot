import { z } from 'zod'
import type { items, outfits, userPhotos, tryonResults } from '../db/schema.js'

// ─── DB row types ─────────────────────────────────────────────────────────────

export type Item = typeof items.$inferSelect
export type NewItem = typeof items.$inferInsert

export type Outfit = typeof outfits.$inferSelect
export type NewOutfit = typeof outfits.$inferInsert

export type UserPhoto = typeof userPhotos.$inferSelect
export type NewUserPhoto = typeof userPhotos.$inferInsert

export type TryonResult = typeof tryonResults.$inferSelect
export type NewTryonResult = typeof tryonResults.$inferInsert

// ─── Parsed types (JSON fields hydrated) ─────────────────────────────────────

export type ItemParsed = Omit<Item, 'colors' | 'careInstructions' | 'season' | 'tags' | 'occasion'> & {
  colors: string[]
  careInstructions: string[]
  season: string[]
  tags: string[]
  occasion: string[]
}

export type OutfitParsed = Omit<Outfit, 'itemIds' | 'season' | 'tags' | 'weatherContext'> & {
  itemIds: string[]
  season: string[]
  tags: string[]
  weatherContext: Record<string, unknown> | null
}

// ─── Categories ───────────────────────────────────────────────────────────────

export const ITEM_CATEGORIES = [
  'tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories', 'activewear', 'underwear',
] as const

export type ItemCategory = typeof ITEM_CATEGORIES[number]

export const OCCASIONS = ['casual', 'work', 'formal', 'outdoor', 'date'] as const
export type Occasion = typeof OCCASIONS[number]

export const SEASONS = ['spring', 'summer', 'fall', 'winter', 'all'] as const
export type Season = typeof SEASONS[number]

// ─── Zod schemas (for tool input validation + MCP inputSchema) ────────────────

export const AddItemInputSchema = z.object({
  imageBase64: z.string().optional(),
  imagePath: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  primaryColor: z.string().optional(),
  colors: z.array(z.string()).optional(),
  material: z.string().optional(),
  careInstructions: z.array(z.string()).optional(),
  brand: z.string().optional(),
  size: z.string().optional(),
  season: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  aiDescription: z.string().optional(),
  occasion: z.array(z.string()).optional(),
  autoAnalyze: z.boolean().default(true),
})
export type AddItemInput = z.infer<typeof AddItemInputSchema>

export const ListItemsInputSchema = z.object({
  category: z.string().optional(),
  color: z.string().optional(),
  season: z.string().optional(),
  occasion: z.string().optional(),
  brand: z.string().optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z.enum(['created', 'worn', 'name']).optional(),
  limit: z.number().int().positive().optional(),
})
export type ListItemsInput = z.infer<typeof ListItemsInputSchema>

export const UpdateItemInputSchema = z.object({
  id: z.string(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  primaryColor: z.string().optional(),
  colors: z.array(z.string()).optional(),
  material: z.string().optional(),
  materialSource: z.enum(['ocr', 'manual']).optional(),
  careInstructions: z.array(z.string()).optional(),
  brand: z.string().optional(),
  size: z.string().optional(),
  season: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  aiDescription: z.string().optional(),
  occasion: z.array(z.string()).optional(),
})
export type UpdateItemInput = z.infer<typeof UpdateItemInputSchema>

export const CreateOutfitInputSchema = z.object({
  name: z.string().min(1),
  itemIds: z.array(z.string()).min(1),
  occasion: z.string().optional(),
  season: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  aiGenerated: z.boolean().optional(),
  weatherContext: z.record(z.string(), z.unknown()).optional(),
})
export type CreateOutfitInput = z.infer<typeof CreateOutfitInputSchema>

export const UpdateOutfitInputSchema = z.object({
  name: z.string().min(1).optional(),
  occasion: z.string().optional(),
  season: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
})
export type UpdateOutfitInput = z.infer<typeof UpdateOutfitInputSchema>

export const AddUserPhotoInputSchema = z.object({
  imageBase64: z.string().optional(),
  imagePath: z.string().optional(),
  label: z.string().optional(),
  isPrimary: z.boolean().optional(),
})
export type AddUserPhotoInput = z.infer<typeof AddUserPhotoInputSchema>

// ─── AI result types ──────────────────────────────────────────────────────────

export const ItemClassificationSchema = z.object({
  category: z.string(),
  subcategory: z.string(),
  primary_color: z.string(),
  colors: z.array(z.string()),
  material: z.string(),
  season: z.array(z.string()),
  ai_description: z.string(),
  suggested_tags: z.array(z.string()),
})
export type ItemClassification = z.infer<typeof ItemClassificationSchema>

export const TagDataSchema = z.object({
  brand: z.string().nullable(),
  size: z.string().nullable(),
  material_composition: z.string().nullable(),
  care_instructions: z.array(z.string()),
  country_of_origin: z.string().nullable(),
})
export type TagData = z.infer<typeof TagDataSchema>

export const OutfitSuggestionSchema = z.object({
  item_ids: z.array(z.string()),
  name: z.string(),
  occasion: z.string(),
  reasoning: z.string(),
})
export type OutfitSuggestion = z.infer<typeof OutfitSuggestionSchema>

// ─── Weather types ────────────────────────────────────────────────────────────

export interface WeatherData {
  temperature: number
  weatherCode: number
  condition: string
  precipitation: number
  windSpeed: number
  icon: string
}
