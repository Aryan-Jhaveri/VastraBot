import { apiFetchJSON } from './client'

export interface TryonResult {
  resultImageUri: string
  tryonId: string
}

export async function generateTryOn(userPhotoId: string, itemIds: string[]): Promise<TryonResult> {
  return apiFetchJSON('/api/tryon', {
    method: 'POST',
    body: JSON.stringify({ userPhotoId, itemIds }),
  })
}
