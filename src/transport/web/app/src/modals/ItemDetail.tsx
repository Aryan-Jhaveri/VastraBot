import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteItem, updateItem, scanTag } from '../api/items'
import type { Item } from '../api/items'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { ChipToggle } from '../components/ui/ChipToggle'
import { InlineField } from '../components/ui/InlineField'
import { TagEditor } from '../components/ui/TagEditor'

interface ItemDetailProps {
  item: Item
  onClose: () => void
  onChanged: () => void
}

function parseJSON<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T } catch { return fallback }
}

const SEASONS = ['spring', 'summer', 'fall', 'winter', 'all']
const OCCASIONS = ['casual', 'work', 'formal', 'outdoor', 'date']

export function ItemDetail({ item: initialItem, onClose, onChanged }: ItemDetailProps) {
  const navigate = useNavigate()
  const [item, setItem] = useState<Item>(initialItem)
  const [scanningTag, setScanningTag] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editingSeason, setEditingSeason] = useState(false)
  const [editingOccasion, setEditingOccasion] = useState(false)
  const [occasionInput, setOccasionInput] = useState('')
  const [careInput, setCareInput] = useState('')

  const currentSeasons = parseJSON<string[]>(item.season, [])
  const currentOccasions = parseJSON<string[]>(item.occasion, [])
  const currentTags = parseJSON<string[]>(item.tags, [])
  const currentCare = parseJSON<string[]>(item.careInstructions, [])

  async function patchItem(patch: Partial<Item>) {
    try {
      const updated = await updateItem(item.id, patch)
      setItem(updated)
      onChanged()
    } catch (err) { setError(String(err)) }
  }

  async function addOccasion(raw: string) {
    const o = raw.trim().toLowerCase()
    if (!o || currentOccasions.includes(o)) { setOccasionInput(''); return }
    await patchItem({ occasion: [...currentOccasions, o] as unknown as string })
    setOccasionInput('')
  }

  async function removeOccasion(o: string) {
    await patchItem({ occasion: currentOccasions.filter(x => x !== o) as unknown as string })
  }

  async function addCare(raw: string) {
    const c = raw.trim()
    if (!c || currentCare.includes(c)) { setCareInput(''); return }
    await patchItem({ careInstructions: [...currentCare, c] as unknown as string })
    setCareInput('')
  }

  async function removeCare(c: string) {
    await patchItem({ careInstructions: currentCare.filter(x => x !== c) as unknown as string })
  }

  async function handleDelete() {
    setDeleting(true)
    try { await deleteItem(item.id); onClose(); onChanged() }
    catch (err) { setError(String(err)); setDeleting(false) }
  }

  async function handleScanTag(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanningTag(true)
    setError(null)
    try {
      const { item: updated } = await scanTag(item.id, file)
      setItem(updated)
    } catch (err) {
      setError(String(err))
    } finally {
      setScanningTag(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white border-2 border-[#111] w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-[#111]">
          <button onClick={onClose} className="text-[9px] font-bold font-mono uppercase tracking-[0.08em] hover:text-[#888]">←</button>
          <span className="text-[9px] font-bold font-mono uppercase tracking-[0.08em] capitalize">
            {item.subcategory ?? item.category}
          </span>
          <div className="w-8" />
        </div>

        <div className="flex flex-col gap-4 p-4">
          {error && (
            <div className="border-2 border-[#111] bg-[#f0f0f0] px-3 py-2 text-[10px] font-mono uppercase tracking-[0.06em]">
              {error}
            </div>
          )}

          {/* Garment image */}
          <div className="relative aspect-[4/5] overflow-hidden border-2 border-[#111]">
            <img
              src={`/${item.imageUri}`}
              alt={item.subcategory ?? item.category}
              className="absolute inset-0 h-full w-full object-contain"
            />
          </div>

          <InlineField
            label="Category"
            value={item.category}
            onSave={async (next) => {
              if (!next.trim() || next.trim() === item.category) return
              await patchItem({ category: next.trim() })
            }}
            placeholder="e.g. tops"
          />

          <InlineField
            label="Type"
            value={item.subcategory}
            onSave={async (next) => {
              if (next.trim() === (item.subcategory ?? '')) return
              await patchItem({ subcategory: next.trim() || undefined })
            }}
            placeholder="e.g. t-shirt"
          />

          <InlineField
            label="Color"
            value={item.primaryColor}
            onSave={async (next) => {
              if (next.trim() === (item.primaryColor ?? '')) return
              await patchItem({ primaryColor: next.trim() || undefined })
            }}
            placeholder="e.g. navy"
          />

          <div>
            <InlineField
              label="Material"
              value={item.material}
              onSave={async (next) => {
                if (next.trim() === (item.material ?? '')) return
                await patchItem({ material: next.trim() || undefined })
              }}
              placeholder="e.g. cotton"
            />
            {item.materialSource === 'ocr' && (
              <p className="text-[7px] font-mono text-[#888] uppercase tracking-[0.06em] mt-1">from label</p>
            )}
          </div>

          <InlineField
            label="Brand"
            value={item.brand}
            onSave={async (next) => {
              if (next.trim() === (item.brand ?? '')) return
              await patchItem({ brand: next.trim() || undefined })
            }}
            placeholder="e.g. Nike"
          />

          <InlineField
            label="Size"
            value={item.size}
            onSave={async (next) => {
              if (next.trim() === (item.size ?? '')) return
              await patchItem({ size: next.trim() || undefined })
            }}
            placeholder="e.g. M"
          />

          {/* Season */}
          <div>
            <p className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] border-b-2 border-[#111] pb-1.5 mb-2">Season</p>
            {editingSeason ? (
              <div>
                <ChipToggle
                  options={SEASONS}
                  selected={currentSeasons}
                  onChange={async (next) => {
                    try {
                      const updated = await updateItem(item.id, { season: next as unknown as string })
                      setItem(o => ({ ...o, ...updated }))
                      onChanged()
                    } catch (err) { setError(String(err)) }
                  }}
                />
                <button onClick={() => setEditingSeason(false)} className="mt-2 text-[8px] font-mono text-[#888] uppercase tracking-[0.06em] hover:text-[#111]">Done</button>
              </div>
            ) : (
              <button onClick={() => setEditingSeason(true)} className="flex items-center gap-2 group">
                <span className="text-sm font-mono capitalize">
                  {currentSeasons.length > 0 ? currentSeasons.join(', ') : <span className="text-[#888]">—</span>}
                </span>
                <span className="text-[8px] font-mono text-[#888] uppercase tracking-[0.06em] group-hover:text-[#111]">✎</span>
              </button>
            )}
          </div>

          {/* Occasion */}
          <div>
            <p className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] border-b-2 border-[#111] pb-1.5 mb-2">Occasion</p>
            {editingOccasion ? (
              <div className="flex flex-col gap-2">
                {currentOccasions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {currentOccasions.map(o => (
                      <span key={o} className="flex items-center gap-1 border-2 border-[#111] px-2 py-0.5 text-[9px] font-mono uppercase tracking-[0.06em]">
                        {o}
                        <button onClick={() => removeOccasion(o)} className="text-[#888] hover:text-[#111] leading-none font-bold">×</button>
                      </span>
                    ))}
                  </div>
                )}
                <input
                  value={occasionInput}
                  onChange={e => setOccasionInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); void addOccasion(occasionInput) } }}
                  onBlur={() => { if (occasionInput.trim()) void addOccasion(occasionInput) }}
                  placeholder="Add occasion, press Enter"
                  className="w-full border-2 border-[#111] px-3 py-1.5 text-[9px] font-mono outline-none focus:bg-[#f0f0f0] placeholder:text-[#888] placeholder:normal-case"
                />
                {OCCASIONS.filter(o => !currentOccasions.includes(o)).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {OCCASIONS.filter(o => !currentOccasions.includes(o)).map(o => (
                      <button key={o} onClick={() => void addOccasion(o)}
                        className="border border-dashed border-[#888] px-2 py-0.5 text-[8px] font-mono text-[#888] uppercase tracking-[0.04em] hover:border-[#111] hover:text-[#111]">
                        + {o}
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={() => setEditingOccasion(false)} className="text-[8px] font-mono text-[#888] uppercase tracking-[0.06em] hover:text-[#111] self-start">Done</button>
              </div>
            ) : (
              <button onClick={() => setEditingOccasion(true)} className="flex items-center gap-2 group">
                <span className="text-sm font-mono capitalize">
                  {currentOccasions.length > 0 ? currentOccasions.join(', ') : <span className="text-[#888]">—</span>}
                </span>
                <span className="text-[8px] font-mono text-[#888] uppercase tracking-[0.06em] group-hover:text-[#111]">✎</span>
              </button>
            )}
          </div>

          {/* Tags */}
          <div>
            <p className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] border-b-2 border-[#111] pb-1.5 mb-2">Tags</p>
            <TagEditor
              tags={currentTags}
              onChange={async (next) => {
                try {
                  const updated = await updateItem(item.id, { tags: next as unknown as string })
                  setItem(updated)
                  onChanged()
                } catch (err) { setError(String(err)) }
              }}
            />
          </div>

          {/* Care label photo */}
          <div>
            <p className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] border-b-2 border-[#111] pb-1.5 mb-2">
              Care Label
            </p>
            {item.tagImageUri ? (
              <div className="flex items-start gap-3">
                <div className="relative w-16 h-20 shrink-0 overflow-hidden border-2 border-[#111]">
                  <img src={`/${item.tagImageUri}`} alt="Care label" className="absolute inset-0 h-full w-full object-contain" />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  {currentCare.length > 0 && (
                    <ul className="space-y-0.5">
                      {currentCare.map((c, i) => (
                        <li key={i} className="text-[10px] font-mono text-[#555] flex items-start gap-1">
                          <span className="flex-1">— {c}</span>
                          <button onClick={() => removeCare(c)} className="text-[#888] hover:text-[#111] leading-none font-bold shrink-0">×</button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <label className={`mt-1 self-start border border-[#888] px-2 py-0.5 text-[8px] font-mono text-[#888] uppercase tracking-[0.06em] cursor-pointer hover:border-[#111] hover:text-[#111] transition-colors ${scanningTag ? 'opacity-50 pointer-events-none' : ''}`}>
                    {scanningTag ? 'Scanning…' : 'Re-scan'}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScanTag} disabled={scanningTag} />
                  </label>
                </div>
              </div>
            ) : (
              <label className={`flex items-center gap-3 border-2 border-dashed border-[#888] p-3 cursor-pointer hover:border-[#111] transition-colors ${scanningTag ? 'opacity-50 pointer-events-none' : ''}`}>
                {scanningTag
                  ? <Spinner size={20} />
                  : <div className="w-8 h-8 border-2 border-[#888] flex items-center justify-center text-[#888] font-bold">+</div>
                }
                <div>
                  <p className="text-[9px] font-bold font-mono uppercase tracking-[0.08em]">
                    {scanningTag ? 'Scanning label…' : 'Add Care Label Photo'}
                  </p>
                  <p className="text-[8px] font-mono text-[#888] mt-0.5">AI will extract material & care info</p>
                </div>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScanTag} disabled={scanningTag} />
              </label>
            )}
          </div>

          {/* Care instructions (no label photo) */}
          {!item.tagImageUri && (
            <div>
              <p className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] border-b-2 border-[#111] pb-1.5 mb-2">Care Instructions</p>
              {currentCare.length > 0 && (
                <div className="flex flex-col gap-1 mb-2">
                  {currentCare.map((c, i) => (
                    <span key={i} className="flex items-center gap-1 border-2 border-[#111] px-2 py-0.5 text-[9px] font-mono tracking-[0.04em]">
                      <span className="flex-1">{c}</span>
                      <button onClick={() => removeCare(c)} className="text-[#888] hover:text-[#111] leading-none font-bold">×</button>
                    </span>
                  ))}
                </div>
              )}
              <input
                value={careInput}
                onChange={e => setCareInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void addCare(careInput) } }}
                onBlur={() => { if (careInput.trim()) void addCare(careInput) }}
                placeholder="Add instruction, press Enter"
                className="w-full border-2 border-[#111] px-3 py-1.5 text-[9px] font-mono outline-none focus:bg-[#f0f0f0] placeholder:text-[#888] placeholder:normal-case"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 border-t-2 border-[#111] pt-3">
            <Button
              variant="primary"
              onClick={() => { onClose(); navigate('/tryon', { state: { itemId: item.id } }) }}
              className="w-full"
            >
              Try On
            </Button>
            {confirmDelete ? (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setConfirmDelete(false)} className="flex-1">Keep it</Button>
                <Button variant="secondary" onClick={handleDelete} loading={deleting} className="flex-1 !border-red-500 !text-red-500 hover:!bg-red-50">Delete</Button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full text-[9px] font-mono text-[#888] uppercase tracking-[0.08em] py-2 hover:text-[#111]"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
