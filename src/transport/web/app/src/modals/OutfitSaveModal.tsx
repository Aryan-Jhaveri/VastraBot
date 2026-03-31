import { useState } from 'react'
import { createOutfit } from '../api/outfits'
import { Button } from '../components/ui/Button'
import { TagEditor } from '../components/ui/TagEditor'
import type { Item } from '../api/items'

const SEASONS = ['spring', 'summer', 'fall', 'winter', 'all']

interface Props {
  items: Item[]
  onClose: () => void
  onSaved: () => void
}

export function OutfitSaveModal({ items, onClose, onSaved }: Props) {
  const [name, setName] = useState('')
  const [occasion, setOccasion] = useState('')
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleSeason(s: string) {
    setSelectedSeasons(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    )
  }

  async function handleSave() {
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)
    try {
      await createOutfit({
        name: name.trim(),
        itemIds: items.map(i => i.id),
        occasion: occasion.trim() || undefined,
        season: selectedSeasons.length ? selectedSeasons : undefined,
        tags: tags.length ? tags : undefined,
        notes: notes.trim() || undefined,
      })
      onSaved()
    } catch (err) {
      setError(String(err))
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white border-2 border-[#111] w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-[#111] shrink-0">
          <button
            onClick={onClose}
            className="text-[9px] font-bold font-mono uppercase tracking-[0.08em] hover:text-[#888]"
          >
            ←
          </button>
          <span className="text-[9px] font-bold font-mono uppercase tracking-[0.08em]">New Outfit</span>
          <div className="w-8" />
        </div>

        <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-4">
          {error && (
            <div className="border-2 border-[#111] bg-[#f0f0f0] px-3 py-2 text-[10px] font-mono uppercase tracking-[0.06em]">
              {error}
            </div>
          )}

          {/* Selected item strip */}
          <div>
            <p className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] border-b-2 border-[#111] pb-1.5 mb-2">
              {items.length} items
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {items.map(item => (
                <div key={item.id} className="shrink-0 w-14 h-[72px] border-2 border-[#111] overflow-hidden">
                  <img src={`/${item.imageUri}`} alt={item.subcategory ?? item.category} className="h-full w-full object-contain" />
                </div>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-[8px] font-mono text-[#888] uppercase tracking-[0.08em]">Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Weekend Casual"
              className="border-2 border-[#111] px-3 py-2 text-sm font-mono outline-none focus:bg-[#f0f0f0]"
            />
          </div>

          {/* Occasion */}
          <div className="flex flex-col gap-1">
            <label className="text-[8px] font-mono text-[#888] uppercase tracking-[0.08em]">Occasion</label>
            <input
              value={occasion}
              onChange={e => setOccasion(e.target.value)}
              placeholder="e.g. casual, work, formal"
              className="border-2 border-[#111] px-3 py-2 text-sm font-mono outline-none focus:bg-[#f0f0f0]"
            />
          </div>

          {/* Season */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[8px] font-mono text-[#888] uppercase tracking-[0.08em]">Season</label>
            <div className="flex gap-1.5 flex-wrap">
              {SEASONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSeason(s)}
                  className={`px-3 py-1.5 text-[9px] font-bold font-mono uppercase tracking-[0.08em] border-2 border-[#111] transition-colors capitalize ${
                    selectedSeasons.includes(s) ? 'bg-[#111] text-white' : 'bg-white text-[#111] hover:bg-[#f0f0f0]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1">
            <label className="text-[8px] font-mono text-[#888] uppercase tracking-[0.08em]">Tags</label>
            <TagEditor tags={tags} onChange={setTags} placeholder="Add tag, press Enter" />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label className="text-[8px] font-mono text-[#888] uppercase tracking-[0.08em]">Notes</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional notes…"
              className="border-2 border-[#111] px-3 py-2 text-sm font-mono outline-none focus:bg-[#f0f0f0]"
            />
          </div>

          <Button onClick={handleSave} loading={saving} className="w-full mt-2">
            Save Outfit
          </Button>
        </div>
      </div>
    </div>
  )
}
