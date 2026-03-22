import { apiFetch, apiFetchJSON } from './client'
import type { Item } from './items'

export interface Outfit {
  id: string
  name: string
  itemIds: string     // JSON string
  occasion: string | null
  season: string      // JSON string
  aiGenerated: number
  weatherContext: string | null
  notes: string | null
  timesWorn: number
  createdAt: number
}

export interface OutfitSuggestion {
  item_ids: string[]
  name: string
  occasion: string
  reasoning: string
  items: Item[]
}

export interface WeatherData {
  temperature: number
  weatherCode: number
  condition: string
  precipitation: number
  windSpeed: number
  icon: string
}

export interface SuggestResult {
  weather: WeatherData
  suggestions: OutfitSuggestion[]
}

export async function fetchOutfits(): Promise<Outfit[]> {
  return apiFetchJSON('/api/outfits')
}

export async function suggestOutfits(lat: number, lon: number): Promise<SuggestResult> {
  return apiFetchJSON(`/api/outfits/suggest?lat=${lat}&lon=${lon}`)
}

export async function createOutfit(data: {
  name: string
  itemIds: string[]
  occasion?: string
  aiGenerated?: boolean
  weatherContext?: Record<string, unknown>
}): Promise<Outfit> {
  return apiFetchJSON('/api/outfits', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function deleteOutfit(id: string): Promise<void> {
  await apiFetch(`/api/outfits/${id}`, { method: 'DELETE' })
}

export async function markOutfitWorn(id: string): Promise<Outfit> {
  return apiFetchJSON(`/api/outfits/${id}/worn`, { method: 'POST' })
}
