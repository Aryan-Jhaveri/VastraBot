import * as queries from '../db/queries.js'
import { saveImage, saveImageFromBase64, deleteImage } from '../storage/images.js'
import { normalizeColor } from '../constants/colors.js'
import type { Item, AddItemInput, ListItemsInput, UpdateItemInput } from '../types/index.js'
import { like, desc, eq, and, sql, inArray } from 'drizzle-orm'
import { db } from '../db/client.js'
import { items } from '../db/schema.js'

export async function addItem(input: AddItemInput): Promise<{ item: Item }> {
  let imageUri: string

  if (input.imagePath) {
    imageUri = await saveImage(input.imagePath, 'items')
  } else if (input.imageBase64) {
    imageUri = await saveImageFromBase64(input.imageBase64, 'items')
  } else {
    throw new Error('addItem requires either imagePath or imageBase64')
  }

  const item = queries.insertItem({
    imageUri,
    category: input.category ?? 'tops',
    subcategory: input.subcategory,
    primaryColor: input.primaryColor ? normalizeColor(input.primaryColor) : undefined,
    colors: JSON.stringify((input.colors ?? []).map(normalizeColor)),
    material: undefined,
    careInstructions: JSON.stringify([]),
    brand: input.brand,
    size: input.size,
    season: JSON.stringify([]),
    tags: JSON.stringify(input.tags ?? []),
    aiDescription: undefined,
    occasion: JSON.stringify([]),
    wearContext: input.wearContext ?? undefined,
  })

  return { item }
}

export async function listItems(input: ListItemsInput = {}): Promise<Item[]> {
  // Build dynamic where conditions
  const conditions = []

  if (input.categories?.length) {
    conditions.push(input.categories.length === 1
      ? eq(items.category, input.categories[0])
      : inArray(items.category, input.categories))
  } else if (input.category) {
    conditions.push(eq(items.category, input.category))
  }
  if (input.color) conditions.push(like(items.colors, `%${input.color}%`))
  if (input.season) conditions.push(like(items.season, `%${input.season}%`))
  if (input.occasion) conditions.push(like(items.occasion, `%${input.occasion}%`))
  if (input.brand) conditions.push(eq(items.brand, input.brand))
  if (input.tags?.length) {
    for (const tag of input.tags) {
      conditions.push(like(items.tags, `%${tag}%`))
    }
  }

  let query = db.select().from(items).$dynamic()

  if (conditions.length) {
    query = query.where(and(...conditions))
  }

  query = query.orderBy(desc(items.createdAt))

  if (input.limit) {
    query = query.limit(input.limit)
  }

  return query.all() as Item[]
}

export async function getItem(id: string): Promise<Item | null> {
  return queries.getItem(id) ?? null
}

export async function updateItem(id: string, data: Omit<UpdateItemInput, 'id'>): Promise<Item> {
  const patch: Record<string, unknown> = { ...data }

  // Serialize array fields
  if (data.colors !== undefined) patch.colors = JSON.stringify(data.colors.map(normalizeColor))
  if (data.careInstructions !== undefined) patch.careInstructions = JSON.stringify(data.careInstructions)
  if (data.season !== undefined) patch.season = JSON.stringify(data.season)
  if (data.tags !== undefined) patch.tags = JSON.stringify(data.tags)
  if (data.occasion !== undefined) patch.occasion = JSON.stringify(data.occasion)
  if (data.primaryColor !== undefined) patch.primaryColor = normalizeColor(data.primaryColor)

  const updated = queries.updateItem(id, patch as Parameters<typeof queries.updateItem>[1])
  if (!updated) throw new Error(`Item ${id} not found`)
  return updated
}

export async function deleteItem(id: string): Promise<void> {
  const item = queries.getItem(id)
  if (item) {
    await deleteImage(item.imageUri)
    if (item.tagImageUri) await deleteImage(item.tagImageUri)
  }
  queries.deleteItem(id)
}

export async function searchItems(query: string): Promise<Item[]> {
  return queries.searchItems(query)
}

export async function markWorn(id: string): Promise<Item> {
  const updated = queries.markItemWorn(id)
  if (!updated) throw new Error(`Item ${id} not found`)
  return updated
}
