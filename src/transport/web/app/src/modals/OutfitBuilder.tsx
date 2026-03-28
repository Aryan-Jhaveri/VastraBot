import { useState } from 'react'
import { useItems } from '../hooks/useItems'
import { createOutfit } from '../api/outfits'
import { ItemCard } from '../components/ItemCard'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'

interface OutfitBuilderProps {
  onClose: () => void
  onCreated: () => void
}

export function OutfitBuilder({ onClose, onCreated }: OutfitBuilderProps) {
  const { items, loading } = useItems({ limit: 100 })
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [name, setName] = useState('')
  const [occasion, setOccasion] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleItem(id: string) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  async function handleCreate() {
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)
    try {
      await createOutfit({
        name: name.trim(),
        itemIds: selectedIds,
        occasion: occasion.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      onCreated()
      onClose()
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white border-2 border-[#111] w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-[#111] shrink-0">
          <button
            onClick={step === 1 ? onClose : () => setStep(1)}
            className="text-[9px] font-bold font-mono uppercase tracking-[0.08em] hover:text-[#888]"
          >
            ←
          </button>
          <span className="text-[9px] font-bold font-mono uppercase tracking-[0.08em]">
            New Outfit — {step === 1 ? 'Pick Items' : 'Details'}
          </span>
          <div className="w-8" />
        </div>

        {/* Step 1 — item picker */}
        {step === 1 && (
          <>
            <div className="overflow-y-auto flex-1 p-4">
              {loading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : items.length === 0 ? (
                <p className="text-[10px] font-mono text-[#888] text-center py-8">No items in your closet yet.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {items.map(item => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      selectable
                      selected={selectedIds.includes(item.id)}
                      onClick={() => toggleItem(item.id)}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t-2 border-[#111] shrink-0">
              <Button
                className="w-full"
                disabled={selectedIds.length < 2}
                onClick={() => setStep(2)}
              >
                Next — {selectedIds.length} selected
              </Button>
              {selectedIds.length < 2 && (
                <p className="text-center text-[8px] font-mono text-[#888] mt-1.5 uppercase tracking-[0.06em]">
                  Select at least 2 items
                </p>
              )}
            </div>
          </>
        )}

        {/* Step 2 — details */}
        {step === 2 && (
          <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-4">
            {error && (
              <div className="border-2 border-[#111] bg-[#f0f0f0] px-3 py-2 text-[10px] font-mono uppercase tracking-[0.06em]">
                {error}
              </div>
            )}

            {/* Selected item strip */}
            <div>
              <p className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] border-b-2 border-[#111] pb-1.5 mb-2">
                {selectedIds.length} items
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {selectedIds.map(id => {
                  const item = items.find(i => i.id === id)
                  if (!item) return null
                  return (
                    <div key={id} className="shrink-0 w-14 h-[72px] border-2 border-[#111] overflow-hidden">
                      <img src={`/${item.imageUri}`} alt={item.subcategory ?? item.category} className="h-full w-full object-cover" />
                    </div>
                  )
                })}
              </div>
            </div>

            {[
              { label: 'Name *', value: name, set: setName, placeholder: 'e.g. Weekend Casual' },
              { label: 'Occasion', value: occasion, set: setOccasion, placeholder: 'e.g. casual, work, formal' },
              { label: 'Notes', value: notes, set: setNotes, placeholder: 'Optional notes…' },
            ].map(({ label, value, set, placeholder }) => (
              <div key={label} className="flex flex-col gap-1">
                <label className="text-[8px] font-mono text-[#888] uppercase tracking-[0.08em]">{label}</label>
                <input
                  value={value}
                  onChange={e => set(e.target.value)}
                  placeholder={placeholder}
                  className="border-2 border-[#111] px-3 py-2 text-sm font-mono outline-none focus:bg-[#f0f0f0]"
                />
              </div>
            ))}

            <Button onClick={handleCreate} loading={saving} className="w-full mt-2">
              Save Outfit
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
