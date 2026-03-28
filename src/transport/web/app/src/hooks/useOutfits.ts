import { useState, useCallback } from 'react'
import { suggestOutfits, createOutfit } from '../api/outfits'
import type { SuggestResult, Outfit } from '../api/outfits'

const CACHE_KEY = 'closet-outfits'

function loadCached(): SuggestResult | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as SuggestResult) : null
  } catch {
    return null
  }
}

export function useOutfits() {
  const [result, setResult] = useState<SuggestResult | null>(loadCached)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const suggest = useCallback(async (lat: number, lon: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await suggestOutfits(lat, lon)
      setResult(res)
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(res)) } catch { /* quota */ }
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
