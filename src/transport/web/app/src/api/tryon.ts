import { apiFetch, apiFetchJSON } from './client'

export interface WearSuggestion {
  label: string
  instruction: string
}

export interface TryonResult {
  resultImageUri: string
  tryonId: string
  wearSuggestions: WearSuggestion[]
}

export interface TryonHistoryItem {
  id: string
  userPhotoId: string
  outfitId: string | null
  itemIds: string  // JSON string
  resultImageUri: string
  promptInstruction?: string
  createdAt: number
}

export async function generateTryOn(
  userPhotoId: string,
  itemIds: string[],
  garmentUris?: string[],
  userInstruction?: string,
): Promise<TryonResult> {
  return apiFetchJSON('/api/tryon', {
    method: 'POST',
    body: JSON.stringify({ userPhotoId, itemIds, garmentUris, userInstruction }),
  })
}

export async function uploadGarment(file: File): Promise<{ imageUri: string }> {
  const fd = new FormData()
  fd.append('image', file)
  return apiFetchJSON('/api/tryon/garments', { method: 'POST', body: fd })
}

export async function fetchTryonHistory(): Promise<TryonHistoryItem[]> {
  return apiFetchJSON('/api/tryon')
}

export async function deleteTryonResult(id: string): Promise<void> {
  await apiFetch(`/api/tryon/${id}`, { method: 'DELETE' })
}

export async function fetchWearSuggestions(itemIds: string[]): Promise<WearSuggestion[]> {
  const res = await apiFetchJSON<{ suggestions: WearSuggestion[] }>('/api/tryon/suggestions', {
    method: 'POST',
    body: JSON.stringify({ itemIds }),
  })
  return res.suggestions
}
