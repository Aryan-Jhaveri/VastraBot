import { useState, useMemo } from 'react'
import { useItems } from '../hooks/useItems'
import { ItemCard } from '../components/ItemCard'
import { CategoryFilter } from '../components/CategoryFilter'
import { FilterBar } from '../components/FilterBar'
import { ChipToggle } from '../components/ui/ChipToggle'
import { AddItem } from '../modals/AddItem'
import { ItemDetail } from '../modals/ItemDetail'
import { OutfitSaveModal } from '../modals/OutfitSaveModal'
import { Spinner } from '../components/ui/Spinner'
import type { Item } from '../api/items'

const PAGE_SIZE = 12
const SEASONS = ['spring', 'summer', 'fall', 'winter', 'all']
const OCCASIONS = ['casual', 'work', 'formal', 'outdoor', 'date']

export function Closet() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [color, setColor] = useState('')
  const [season, setSeason] = useState('')
  const [occasion, setOccasion] = useState('')
  const [brand, setBrand] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagsOpen, setTagsOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState<Item | null>(null)

  // Select mode
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showOutfitSave, setShowOutfitSave] = useState(false)

  const { items, total, loading, refetch } = useItems({
    categories: selectedCategories.length ? selectedCategories : undefined,
    color: color || undefined,
    season: season || undefined,
    occasion: occasion || undefined,
    brand: brand || undefined,
    tags: tags.length ? tags : undefined,
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

  const selectedItems = useMemo(
    () => allItems.filter(i => selectedIds.has(i.id)),
    [allItems, selectedIds],
  )

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const filterValues = { color, season, occasion, brand }
  const activeFilterCount = [color, season, occasion, brand, ...tags].filter(Boolean).length

  function handleFilterChange(key: string, value: string) {
    setPage(1)
    if (key === 'color') setColor(value)
    else if (key === 'season') setSeason(value)
    else if (key === 'occasion') setOccasion(value)
    else if (key === 'brand') setBrand(value)
  }

  function clearFilters() {
    setColor(''); setSeason(''); setOccasion(''); setBrand(''); setTags([])
    setPage(1)
  }

  function handleCategoryChange(cats: string[]) {
    setSelectedCategories(cats)
    setPage(1)
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  const filterConfigs = [
    ...(colors.length > 0 ? [{ key: 'color', label: 'Color', options: colors }] : []),
    { key: 'season', label: 'Season', options: SEASONS },
    { key: 'occasion', label: 'Occasion', options: OCCASIONS },
    ...(brands.length >= 2 ? [{ key: 'brand', label: 'Brand', options: brands }] : []),
  ]

  // Keep tags panel open if tags are active
  const tagsOpenEffective = tagsOpen || tags.length > 0

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      {/* Header */}
      <div className="flex items-end justify-between border-b-2 border-[#111] pb-2">
        <div>
          <h1 className="text-[22px] font-bold leading-none">Closet</h1>
          <p className="text-[9px] font-mono text-[#888] uppercase tracking-[0.06em] mt-0.5">
            {selectMode
              ? (selectedIds.size > 0 ? `${selectedIds.size} selected` : 'select items')
              : `${total} ${total === 1 ? 'item' : 'items'}`}
          </p>
        </div>
        {selectMode ? (
          <div className="flex gap-2">
            <button
              onClick={() => setShowOutfitSave(true)}
              disabled={selectedIds.size < 2}
              className="bg-[#111] text-white border-2 border-[#111] px-3 py-1.5 text-[9px] font-bold font-mono uppercase tracking-[0.08em] transition-colors disabled:opacity-30"
            >
              Create Outfit
            </button>
            <button
              onClick={exitSelectMode}
              className="border-2 border-[#111] px-3 py-1.5 text-[9px] font-bold font-mono uppercase tracking-[0.08em] hover:bg-[#f0f0f0] transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setSelectMode(true)}
              className="border-2 border-[#111] px-3 py-1.5 text-[9px] font-bold font-mono uppercase tracking-[0.08em] hover:bg-[#f0f0f0] transition-colors"
            >
              Select
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="bg-[#111] text-white border-2 border-[#111] px-3 py-1.5 text-[9px] font-bold font-mono uppercase tracking-[0.08em] hover:bg-[#333] transition-colors"
            >
              + Add
            </button>
          </div>
        )}
      </div>

      {/* Selected items carousel — only in select mode */}
      {selectMode && (
        <div className="border-2 border-[#111] p-2">
          {selectedItems.length === 0 ? (
            <p className="text-[9px] font-mono text-[#888] uppercase tracking-[0.06em]">
              Tap items below to select
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              {selectedItems.map(item => (
                <div key={item.id} className="relative shrink-0">
                  <img
                    src={`/${item.imageUri}`}
                    alt={item.subcategory ?? item.category}
                    className="w-14 h-14 object-cover border border-[#111]"
                  />
                  <button
                    onClick={() => toggleSelect(item.id)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-[#111] text-white text-[8px] flex items-center justify-center leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <CategoryFilter categories={categories} value={selectedCategories} onChange={handleCategoryChange} />

      {filterConfigs.length > 0 && (
        <FilterBar
          filters={filterConfigs}
          values={filterValues}
          onChange={handleFilterChange}
          onClear={clearFilters}
          activeCount={activeFilterCount}
        />
      )}

      {allTags.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setTagsOpen(v => !v)}
            className="flex items-center gap-1.5 text-[8px] font-bold font-mono uppercase tracking-[0.1em] text-[#888] hover:text-[#111] transition-colors mb-0"
          >
            Tags
            {tags.length > 0 && (
              <span className="px-1 py-0.5 bg-[#111] text-white text-[7px] leading-none">
                {tags.length}
              </span>
            )}
            <svg
              width="8"
              height="8"
              viewBox="0 0 8 8"
              fill="currentColor"
              className={`transition-transform duration-200 ${tagsOpenEffective ? 'rotate-180' : ''}`}
            >
              <path d="M4 5.5L0.5 2h7L4 5.5z" />
            </svg>
          </button>
          <div
            className={`grid transition-all duration-200 ease-in-out ${
              tagsOpenEffective ? 'grid-rows-[1fr] opacity-100 mt-1.5' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              <ChipToggle options={allTags} selected={tags} onChange={(next) => { setTags(next); setPage(1) }} />
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {!loading && items.length === 0 && (
        <p className="text-[10px] font-mono text-[#888] uppercase tracking-[0.06em] text-center py-10">
          {activeFilterCount > 0 || selectedCategories.length > 0
            ? 'No items matching your filters.'
            : 'Your closet is empty. Add your first item!'}
        </p>
      )}

      <div className="grid grid-cols-3 gap-[3px]">
        {items.map(item => (
          <ItemCard
            key={item.id}
            item={item}
            selectable={selectMode}
            selected={selectMode && selectedIds.has(item.id)}
            onClick={() => selectMode ? toggleSelect(item.id) : setSelected(item)}
          />
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
          onChanged={() => { void refetch() }}
        />
      )}

      {showOutfitSave && (
        <OutfitSaveModal
          items={selectedItems}
          onClose={() => setShowOutfitSave(false)}
          onSaved={() => {
            setShowOutfitSave(false)
            exitSelectMode()
          }}
        />
      )}
    </div>
  )
}
