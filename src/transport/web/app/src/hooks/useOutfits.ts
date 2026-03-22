import { useState, useCallback } from 'react'
import { suggestOutfits, createOutfit } from '../api/outfits'
import type { SuggestResult, Outfit } from '../api/outfits'

export function useOutfits() {
  const [result, setResult] = useState<SuggestResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const suggest = useCallback(async (lat: number, lon: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await suggestOutfits(lat, lon)
      setResult(res)
      return res
    } catch (err) {
      setError(String(err))
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const save = useCallback(async (data: Parameters<typeof createOutfit>[0]): Promise<Outfit> => {
    return createOutfit(data)
  }, [])

  return { result, loading, error, suggest, save }
}
