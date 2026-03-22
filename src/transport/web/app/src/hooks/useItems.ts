import { useState, useEffect, useCallback } from 'react'
import { fetchItems } from '../api/items'
import type { ItemsPage } from '../api/items'

interface UseItemsOptions {
  category?: string
  page?: number
  limit?: number
}

export function useItems(opts: UseItemsOptions = {}) {
  const [data, setData] = useState<ItemsPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchItems(opts)
      setData(result)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [opts.category, opts.page, opts.limit])

  useEffect(() => {
    void load()
  }, [load])

  return { items: data?.items ?? [], total: data?.total ?? 0, loading, error, refetch: load }
}
