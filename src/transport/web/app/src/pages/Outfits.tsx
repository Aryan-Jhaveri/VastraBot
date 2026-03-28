import { useState } from 'react'
import { useSavedOutfits } from '../hooks/useSavedOutfits'
import { SavedOutfitCard } from '../components/SavedOutfitCard'
import { OutfitDetail } from '../modals/OutfitDetail'
import { OutfitBuilder } from '../modals/OutfitBuilder'
import { CategoryFilter } from '../components/CategoryFilter'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import type { HydratedOutfit } from '../api/outfits'

export function Outfits() {
  const { outfits, loading, error, refetch } = useSavedOutfits()
  const [selectedOccasion, setSelectedOccasion] = useState('')
  const [detail, setDetail] = useState<HydratedOutfit | null>(null)
  const [building, setBuilding] = useState(false)

  // Derive unique occasions from actual data
  const occasions = [...new Set(outfits.map(o => o.occasion).filter(Boolean) as string[])]

  const filtered = selectedOccasion
    ? outfits.filter(o => o.occasion === selectedOccasion)
    : outfits

  return (
    <div className="flex flex-col p-4 pb-24 gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold leading-none">Outfits.</h1>
        <Button variant="secondary" onClick={() => setBuilding(true)}>+ New</Button>
      </div>

      {occasions.length > 0 && (
        <CategoryFilter
          categories={occasions}
          value={selectedOccasion}
          onChange={setSelectedOccasion}
        />
      )}

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
            {outfits.length === 0 ? 'No saved outfits yet.' : 'No outfits for this occasion.'}
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
