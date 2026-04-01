import { useState, useMemo } from 'react'
import { useSavedOutfits } from '../hooks/useSavedOutfits'
import { SavedOutfitCard } from '../components/SavedOutfitCard'
import { OutfitDetail } from '../modals/OutfitDetail'
import { FilterBar } from '../components/FilterBar'
import { Spinner } from '../components/ui/Spinner'
import { deleteOutfit } from '../api/outfits'
import type { HydratedOutfit } from '../api/outfits'

const SEASONS = ['spring', 'summer', 'fall', 'winter', 'all']

export function Outfits() {
  const { outfits, loading, error, refetch } = useSavedOutfits()
  const [selectedOccasion, setSelectedOccasion] = useState('')
  const [selectedSeason, setSelectedSeason] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [aiOnly, setAiOnly] = useState(false)
  const [detail, setDetail] = useState<HydratedOutfit | null>(null)

  // Select mode
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  // Derive unique occasions from actual data
  const occasions = [...new Set(outfits.map(o => o.occasion).filter(Boolean) as string[])]

  // Derive unique tags from actual data
  const outfitTags = [...new Set(outfits.flatMap(o => {
    try { return JSON.parse(o.tags || '[]') as string[] } catch { return [] }
  }))].sort()

  const filterValues = { occasion: selectedOccasion, season: selectedSeason, tag: selectedTag }
  const activeFilterCount = [selectedOccasion, selectedSeason, selectedTag].filter(Boolean).length + (aiOnly ? 1 : 0)

  function handleFilterChange(key: string, value: string) {
    if (key === 'occasion') setSelectedOccasion(value)
    else if (key === 'season') setSelectedSeason(value)
    else if (key === 'tag') setSelectedTag(value)
  }

  function clearFilters() {
    setSelectedOccasion('')
    setSelectedSeason('')
    setSelectedTag('')
    setAiOnly(false)
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

  async function deleteSelected() {
    if (selectedIds.size === 0) return
    setDeleting(true)
    await Promise.all([...selectedIds].map(id => deleteOutfit(id)))
    exitSelectMode()
    void refetch()
    setDeleting(false)
  }

  const filterConfigs = [
    ...(occasions.length > 0 ? [{ key: 'occasion', label: 'Occasion', options: occasions }] : []),
    { key: 'season', label: 'Season', options: SEASONS },
    ...(outfitTags.length > 0 ? [{ key: 'tag', label: 'Tag', options: outfitTags }] : []),
  ]

  const filtered = outfits.filter(o => {
    if (selectedOccasion && o.occasion !== selectedOccasion) return false
    if (selectedSeason) {
      let seasons: string[] = []
      try { seasons = JSON.parse(o.season || '[]') as string[] } catch { /* ignore */ }
      if (!seasons.includes(selectedSeason)) return false
    }
    if (selectedTag) {
      let tags: string[] = []
      try { tags = JSON.parse(o.tags || '[]') as string[] } catch { /* ignore */ }
      if (!tags.includes(selectedTag)) return false
    }
    if (aiOnly && !o.aiGenerated) return false
    return true
  })

  const selectedOutfits = useMemo(
    () => outfits.filter(o => selectedIds.has(o.id)),
    [outfits, selectedIds],
  )

  return (
    <div className="flex flex-col p-4 pb-24 gap-4">
      <div className="flex items-center justify-between border-b-2 border-[#111] pb-2">
        <div>
          <h1 className="text-[22px] font-bold leading-none">Outfits.</h1>
          {selectMode && (
            <p className="text-[9px] font-mono text-[#888] uppercase tracking-[0.06em] mt-0.5">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'select outfits'}
            </p>
          )}
        </div>
        {selectMode ? (
          <div className="flex gap-2">
            <button
              onClick={() => void deleteSelected()}
              disabled={selectedIds.size === 0 || deleting}
              className="bg-[#111] text-white border-2 border-[#111] px-3 py-1.5 text-[9px] font-bold font-mono uppercase tracking-[0.08em] transition-colors disabled:opacity-30 hover:bg-[#333]"
            >
              {deleting ? '...' : 'Delete'}
            </button>
            <button
              onClick={exitSelectMode}
              className="border-2 border-[#111] px-3 py-1.5 text-[9px] font-bold font-mono uppercase tracking-[0.08em] hover:bg-[#f0f0f0] transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSelectMode(true)}
            className="border-2 border-[#111] px-3 py-1.5 text-[9px] font-bold font-mono uppercase tracking-[0.08em] hover:bg-[#f0f0f0] transition-colors"
          >
            Select
          </button>
        )}
      </div>

      {/* Selected outfits carousel — only in select mode */}
      {selectMode && (
        <div className="border-2 border-[#111] p-2">
          {selectedOutfits.length === 0 ? (
            <p className="text-[9px] font-mono text-[#888] uppercase tracking-[0.06em]">
              Tap outfits below to select
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              {selectedOutfits.map(o => {
                const thumb = o.coverImageUri
                  ? `/${o.coverImageUri}`
                  : o.items?.[0] ? `/${o.items[0].imageUri}` : null
                return (
                  <div key={o.id} className="relative shrink-0">
                    {thumb
                      ? <img src={thumb} alt={o.name} className="w-14 h-14 object-cover border border-[#111]" />
                      : <div className="w-14 h-14 bg-[#f0f0f0] border border-[#111]" />}
                    <button
                      onClick={() => toggleSelect(o.id)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-[#111] text-white text-[8px] flex items-center justify-center leading-none"
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1">
          <FilterBar
            filters={filterConfigs}
            values={filterValues}
            onChange={handleFilterChange}
            onClear={clearFilters}
            activeCount={activeFilterCount}
          />
        </div>
        <button
          onClick={() => setAiOnly(v => !v)}
          className={`shrink-0 self-end px-3 py-1.5 text-[9px] font-bold font-mono uppercase tracking-[0.08em] border-2 border-[#111] transition-colors ${
            aiOnly ? 'bg-[#111] text-white' : 'bg-white text-[#111] hover:bg-[#f0f0f0]'
          }`}
        >
          AI Only
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-12"><Spinner /></div>
      )}

      {error && (
        <div className="border-2 border-[#111] bg-[#f0f0f0] px-3 py-2 text-[10px] font-mono uppercase tracking-[0.06em]">
          {error}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-[10px] font-mono text-[#888] uppercase tracking-[0.08em]">
            {outfits.length === 0 ? 'No saved outfits yet.' : 'No outfits matching your filters.'}
          </p>
          {outfits.length === 0 && (
            <p className="text-[9px] font-mono text-[#888] uppercase tracking-[0.06em]">Go to Closet to create one.</p>
          )}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(outfit => (
            <SavedOutfitCard
              key={outfit.id}
              outfit={outfit}
              selectable={selectMode}
              selected={selectMode && selectedIds.has(outfit.id)}
              onClick={() => selectMode ? toggleSelect(outfit.id) : setDetail(outfit)}
            />
          ))}
        </div>
      )}

      {detail && (
        <OutfitDetail
          outfit={detail}
          onClose={() => setDetail(null)}
          onChanged={refetch}
        />
      )}

    </div>
  )
}
