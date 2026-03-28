import { useState } from 'react'
import { useSavedOutfits } from '../hooks/useSavedOutfits'
import { SavedOutfitCard } from '../components/SavedOutfitCard'
import { OutfitDetail } from '../modals/OutfitDetail'
import { OutfitBuilder } from '../modals/OutfitBuilder'
import { FilterBar } from '../components/FilterBar'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import type { HydratedOutfit } from '../api/outfits'

const SEASONS = ['spring', 'summer', 'fall', 'winter', 'all']

export function Outfits() {
  const { outfits, loading, error, refetch } = useSavedOutfits()
  const [selectedOccasion, setSelectedOccasion] = useState('')
  const [selectedSeason, setSelectedSeason] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [aiOnly, setAiOnly] = useState(false)
  const [detail, setDetail] = useState<HydratedOutfit | null>(null)
  const [building, setBuilding] = useState(false)

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

  return (
    <div className="flex flex-col p-4 pb-24 gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold leading-none">Outfits.</h1>
        <Button variant="secondary" onClick={() => setBuilding(true)}>+ New</Button>
      </div>

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
            <Button variant="secondary" onClick={() => setBuilding(true)}>Build your first outfit</Button>
          )}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(outfit => (
            <SavedOutfitCard
              key={outfit.id}
              outfit={outfit}
              onClick={() => setDetail(outfit)}
            />
          ))}
        </div>
      )}

      {detail && (
        <OutfitDetail
          outfit={detail}
          onClose={() => setDetail(null)}
          onChanged={() => { refetch(); setDetail(null) }}
        />
      )}

      {building && (
        <OutfitBuilder
          onClose={() => setBuilding(false)}
          onCreated={refetch}
        />
      )}
    </div>
  )
}
