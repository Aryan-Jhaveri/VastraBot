import { useState, useMemo } from 'react'
import { useItems } from '../hooks/useItems'
import { ItemCard } from '../components/ItemCard'
import { CategoryFilter } from '../components/CategoryFilter'
import { FilterBar } from '../components/FilterBar'
import { AddItem } from '../modals/AddItem'
import { ItemDetail } from '../modals/ItemDetail'
import { Spinner } from '../components/ui/Spinner'
import type { Item } from '../api/items'

const PAGE_SIZE = 10
const SEASONS = ['spring', 'summer', 'fall', 'winter', 'all']
const OCCASIONS = ['casual', 'work', 'formal', 'outdoor', 'date']

export function Closet() {
  const [category, setCategory] = useState('')
  const [color, setColor] = useState('')
  const [season, setSeason] = useState('')
  const [occasion, setOccasion] = useState('')
  const [brand, setBrand] = useState('')
  const [tag, setTag] = useState('')
  const [page, setPage] = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState<Item | null>(null)

  const { items, total, loading, refetch } = useItems({
    category: category || undefined,
    color: color || undefined,
    season: season || undefined,
    occasion: occasion || undefined,
    brand: brand || undefined,
    tags: tag ? [tag] : undefined,
    page,
    limit: PAGE_SIZE,
  })

  const { items: allItems } = useItems({ limit: 1000 })
  const categories = useMemo(
    () => [...new Set(allItems.map(i => i.category))].sort(),
    [allItems],
  )
  const colors = useMemo(
    () => [...new Set(allItems.map(i => i.primaryColor).filter(Boolean) as string[])].sort(),
    [allItems],
  )
  const brands = useMemo(
    () => [...new Set(allItems.map(i => i.brand).filter(Boolean) as string[])].sort(),
    [allItems],
  )
  const allTags = useMemo(
    () => {
      const tagSet = new Set<string>()
      allItems.forEach(i => {
        try { (JSON.parse(i.tags || '[]') as string[]).forEach(t => tagSet.add(t)) } catch { /* ignore */ }
      })
      return [...tagSet].sort()
    },
    [allItems],
  )

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const filterValues = { color, season, occasion, brand, tag }
  const activeFilterCount = [color, season, occasion, brand, tag].filter(Boolean).length

  function handleFilterChange(key: string, value: string) {
    setPage(1)
    if (key === 'color') setColor(value)
    else if (key === 'season') setSeason(value)
    else if (key === 'occasion') setOccasion(value)
    else if (key === 'brand') setBrand(value)
    else if (key === 'tag') setTag(value)
  }

  function clearFilters() {
    setColor(''); setSeason(''); setOccasion(''); setBrand(''); setTag('')
    setPage(1)
  }

  function handleCategoryChange(cat: string) {
    setCategory(cat)
    setPage(1)
  }

  const filterConfigs = [
    ...(colors.length > 0 ? [{ key: 'color', label: 'Color', options: colors }] : []),
    { key: 'season', label: 'Season', options: SEASONS },
    { key: 'occasion', label: 'Occasion', options: OCCASIONS },
    ...(brands.length >= 2 ? [{ key: 'brand', label: 'Brand', options: brands }] : []),
    ...(allTags.length > 0 ? [{ key: 'tag', label: 'Tag', options: allTags }] : []),
  ]

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      {/* Header */}
      <div className="flex items-end justify-between border-b-2 border-[#111] pb-2">
        <div>
          <h1 className="text-[22px] font-bold leading-none">Closet</h1>
          <p className="text-[9px] font-mono text-[#888] uppercase tracking-[0.06em] mt-0.5">{total} {total === 1 ? 'item' : 'items'}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-[#111] text-white border-2 border-[#111] px-3 py-1.5 text-[9px] font-bold font-mono uppercase tracking-[0.08em] hover:bg-[#333] transition-colors"
        >
          + Add
        </button>
      </div>

      <CategoryFilter categories={categories} value={category} onChange={handleCategoryChange} />

      {filterConfigs.length > 0 && (
        <FilterBar
          filters={filterConfigs}
          values={filterValues}
          onChange={handleFilterChange}
          onClear={clearFilters}
          activeCount={activeFilterCount}
        />
      )}

      {loading && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {!loading && items.length === 0 && (
        <p className="text-[10px] font-mono text-[#888] uppercase tracking-[0.06em] text-center py-10">
          {activeFilterCount > 0 ? 'No items matching your filters.' : category ? `No ${category} yet.` : 'Your closet is empty. Add your first item!'}
        </p>
      )}

      <div className="grid grid-cols-3 gap-[3px]">
        {items.map(item => (
          <ItemCard key={item.id} item={item} onClick={() => setSelected(item)} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 border-t-2 border-[#111] pt-3">
          <button
            onClick={() => setPage(p => p - 1)}
            disabled={page === 1}
            className="text-[9px] font-bold font-mono uppercase tracking-[0.08em] disabled:opacity-30 hover:text-[#888]"
          >
            ← Prev
          </button>
          <span className="text-[9px] font-mono text-[#888]">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page === totalPages}
            className="text-[9px] font-bold font-mono uppercase tracking-[0.08em] disabled:opacity-30 hover:text-[#888]"
          >
            Next →
          </button>
        </div>
      )}

      {showAdd && (
        <AddItem
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); void refetch() }}
        />
      )}

      {selected && (
        <ItemDetail
          item={selected}
          onClose={() => setSelected(null)}
          onChanged={() => { setSelected(null); void refetch() }}
        />
      )}
    </div>
  )
}
