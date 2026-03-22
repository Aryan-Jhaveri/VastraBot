import { db } from './client.js'
import { items, outfits, userPhotos, tryonResults } from './schema.js'
import { eq, like, desc, inArray, and, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import type {
  Item, NewItem, Outfit, NewOutfit, UserPhoto, TryonResult, NewTryonResult,
} from '../types/index.js'

// ─── Items ───────────────────────────────────────────────────────────────────

export function getAllItems(): Item[] {
  return db.select().from(items).orderBy(desc(items.createdAt)).all() as Item[]
}

export function getItem(id: string): Item | undefined {
  return db.select().from(items).where(eq(items.id, id)).get() as Item | undefined
}

export function getItemsByCategory(category: string): Item[] {
  return db.select().from(items).where(eq(items.category, category)).all() as Item[]
}

export function getItemsByColor(color: string): Item[] {
  return db.select().from(items).where(like(items.colors, `%${color}%`)).all() as Item[]
}

export function getItemsBySeason(season: string): Item[] {
  return db.select().from(items).where(like(items.season, `%${season}%`)).all() as Item[]
}

export function getItemsByOccasion(occasion: string): Item[] {
  return db.select().from(items).where(like(items.occasion, `%${occasion}%`)).all() as Item[]
}

export function searchItems(query: string): Item[] {
  const q = `%${query}%`
  return db.select().from(items).where(
    sql`${items.aiDescription} LIKE ${q}
     OR ${items.brand} LIKE ${q}
     OR ${items.subcategory} LIKE ${q}
     OR ${items.tags} LIKE ${q}`
  ).all() as Item[]
}

export function insertItem(data: Omit<NewItem, 'id' | 'createdAt' | 'updatedAt'>): Item {
  const now = Date.now()
  return db.insert(items).values({
    id: nanoid(),
    ...data,
    createdAt: now,
    updatedAt: now,
  }).returning().get() as Item
}

export function updateItem(id: string, data: Partial<Omit<NewItem, 'id' | 'createdAt'>>): Item | undefined {
  return db.update(items)
    .set({ ...data, updatedAt: Date.now() })
    .where(eq(items.id, id))
    .returning().get() as Item | undefined
}

export function deleteItem(id: string): void {
  db.delete(items).where(eq(items.id, id)).run()
}

export function markItemWorn(id: string): Item | undefined {
  return db.update(items)
    .set({
      timesWorn: sql`${items.timesWorn} + 1`,
      lastWornAt: Date.now(),
      updatedAt: Date.now(),
    })
    .where(eq(items.id, id))
    .returning().get() as Item | undefined
}

// ─── Outfits ─────────────────────────────────────────────────────────────────

export function getAllOutfits(): Outfit[] {
  return db.select().from(outfits).orderBy(desc(outfits.createdAt)).all() as Outfit[]
}

export function getOutfit(id: string): Outfit | undefined {
  return db.select().from(outfits).where(eq(outfits.id, id)).get() as Outfit | undefined
}

export function getOutfitWithItems(id: string): (Outfit & { items: Item[] }) | null {
  const outfit = db.select().from(outfits).where(eq(outfits.id, id)).get() as Outfit | undefined
  if (!outfit) return null
  const ids = JSON.parse(outfit.itemIds) as string[]
  const outfitItems = ids.length
    ? (db.select().from(items).where(inArray(items.id, ids)).all() as Item[])
    : []
  return { ...outfit, items: outfitItems }
}

export function insertOutfit(data: Omit<NewOutfit, 'id' | 'createdAt'>): Outfit {
  return db.insert(outfits).values({
    id: nanoid(),
    ...data,
    createdAt: Date.now(),
  }).returning().get() as Outfit
}

export function updateOutfit(id: string, data: Partial<Omit<NewOutfit, 'id' | 'createdAt'>>): Outfit | undefined {
  return db.update(outfits)
    .set(data)
    .where(eq(outfits.id, id))
    .returning().get() as Outfit | undefined
}

export function deleteOutfit(id: string): void {
  db.delete(outfits).where(eq(outfits.id, id)).run()
}

export function markOutfitWorn(id: string): Outfit | undefined {
  return db.update(outfits)
    .set({
      timesWorn: sql`${outfits.timesWorn} + 1`,
      lastWornAt: Date.now(),
    })
    .where(eq(outfits.id, id))
    .returning().get() as Outfit | undefined
}

// ─── User Photos ─────────────────────────────────────────────────────────────

export function getUserPhotos(): UserPhoto[] {
  return db.select().from(userPhotos).orderBy(desc(userPhotos.createdAt)).all() as UserPhoto[]
}

export function getPrimaryUserPhoto(): UserPhoto | undefined {
  return db.select().from(userPhotos).where(eq(userPhotos.isPrimary, 1)).get() as UserPhoto | undefined
}

export function insertUserPhoto(data: { imageUri: string; label?: string; isPrimary?: number }): UserPhoto {
  return db.insert(userPhotos).values({
    id: nanoid(),
    imageUri: data.imageUri,
    label: data.label,
    isPrimary: data.isPrimary ?? 0,
    createdAt: Date.now(),
  }).returning().get() as UserPhoto
}

export function setPrimaryPhoto(id: string): UserPhoto | undefined {
  // Unset all primary flags first
  db.update(userPhotos).set({ isPrimary: 0 }).run()
  return db.update(userPhotos)
    .set({ isPrimary: 1 })
    .where(eq(userPhotos.id, id))
    .returning().get() as UserPhoto | undefined
}

export function deleteUserPhoto(id: string): void {
  db.delete(userPhotos).where(eq(userPhotos.id, id)).run()
}

// ─── Tryon Results ────────────────────────────────────────────────────────────

export function getTryonResults(): TryonResult[] {
  return db.select().from(tryonResults).orderBy(desc(tryonResults.createdAt)).all() as TryonResult[]
}

export function insertTryonResult(data: Omit<NewTryonResult, 'id' | 'createdAt'>): TryonResult {
  return db.insert(tryonResults).values({
    id: nanoid(),
    ...data,
    createdAt: Date.now(),
  }).returning().get() as TryonResult
}

export function deleteTryonResult(id: string): void {
  db.delete(tryonResults).where(eq(tryonResults.id, id)).run()
}
