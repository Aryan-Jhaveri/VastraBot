import { apiFetch, apiFetchJSON } from './client'

export interface Item {
  id: string
  imageUri: string
  category: string
  subcategory: string | null
  primaryColor: string | null
  colors: string        // JSON string — parse client-side as needed
  material: string | null
  careInstructions: string
  brand: string | null
  size: string | null
  season: string
  tags: string
  aiDescription: string | null
  occasion: string
  timesWorn: number
  lastWornAt: number | null
  createdAt: number
  tagImageUri: string | null
}

export interface ItemClassification {
  category: string
  subcategory: string
  primary_color: string
  colors: string[]
  material: string
  season: string[]
  ai_description: string
  suggested_tags: string[]
}

export interface ItemsPage {
  items: Item[]
  total: number
  page: number
  pageSize: number
}

export interface TagData {
  brand: string | null
  size: string | null
  material_composition: string | null
  care_instructions: string[]
  country_of_origin: string | null
}

export async function fetchItems(params: {
  category?: string
  tags?: string[]
  page?: number
  limit?: number
} = {}): Promise<ItemsPage> {
  const qs = new URLSearchParams()
  if (params.category) qs.set('category', params.category)
  if (params.tags?.length) qs.set('tags', params.tags.join(','))
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  return apiFetchJSON(`/api/items?${qs}`)
}

export async function fetchItem(id: string): Promise<Item> {
  return apiFetchJSON(`/api/items/${id}`)
}

export async function analyzeItem(file: File): Promise<ItemClassification> {
  const fd = new FormData()
  fd.append('image', file)
  return apiFetchJSON('/api/items/analyze', { method: 'POST', body: fd })
}

export async function createItem(file: File, fields: Record<string, unknown>): Promise<Item> {
  const fd = new FormData()
  fd.append('image', file)
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== null) {
      fd.append(k, Array.isArray(v) ? JSON.stringify(v) : String(v))
    }
  }
  return apiFetchJSON('/api/items', { method: 'POST', body: fd })
}

export async function updateItem(id: string, data: Partial<Item>): Promise<Item> {
  return apiFetchJSON(`/api/items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteItem(id: string): Promise<void> {
  await apiFetch(`/api/items/${id}`, { method: 'DELETE' })
}

export async function markWorn(id: string): Promise<Item> {
  return apiFetchJSON(`/api/items/${id}/worn`, { method: 'POST' })
}

export async function scanTag(id: string, file: File): Promise<{ item: Item; tagData: TagData }> {
  const fd = new FormData()
  fd.append('image', file)
  return apiFetchJSON(`/api/items/${id}/tag`, { method: 'POST', body: fd })
}
