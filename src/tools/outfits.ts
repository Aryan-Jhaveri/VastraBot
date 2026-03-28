import * as queries from '../db/queries.js'
import type { Outfit, CreateOutfitInput, UpdateOutfitInput } from '../types/index.js'

export async function createOutfit(input: CreateOutfitInput): Promise<Outfit> {
  return queries.insertOutfit({
    name: input.name,
    itemIds: JSON.stringify(input.itemIds),
    occasion: input.occasion,
    season: JSON.stringify(input.season ?? []),
    aiGenerated: input.aiGenerated ? 1 : 0,
    weatherContext: input.weatherContext ? JSON.stringify(input.weatherContext) : undefined,
    notes: input.notes,
    timesWorn: 0,
  })
}

export async function listOutfits(input: { occasion?: string; season?: string } = {}): Promise<Outfit[]> {
  const all = queries.getAllOutfits()
  return all.filter(o => {
    if (input.occasion && o.occasion !== input.occasion) return false
    if (input.season && !o.season?.includes(input.season)) return false
    return true
  })
}

export async function getOutfit(id: string): Promise<Outfit | null> {
  return queries.getOutfit(id) ?? null
}

export async function getOutfitWithItems(id: string) {
  return queries.getOutfitWithItems(id)
}

export async function deleteOutfit(id: string): Promise<void> {
  queries.deleteOutfit(id)
}

export async function updateOutfit(id: string, input: UpdateOutfitInput): Promise<Outfit> {
  const updated = queries.updateOutfit(id, input)
  if (!updated) throw new Error(`Outfit ${id} not found`)
  return updated
}

export async function markOutfitWorn(id: string): Promise<Outfit> {
  const updated = queries.markOutfitWorn(id)
  if (!updated) throw new Error(`Outfit ${id} not found`)
  return updated
}
