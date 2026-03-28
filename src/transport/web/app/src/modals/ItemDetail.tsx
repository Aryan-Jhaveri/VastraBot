import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { markWorn, deleteItem, updateItem, scanTag } from '../api/items'
import type { Item } from '../api/items'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'

interface ItemDetailProps {
  item: Item
  onClose: () => void
  onChanged: () => void
}

function parseJSON<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T } catch { return fallback }
}

export function ItemDetail({ item: initialItem, onClose, onChanged }: ItemDetailProps) {
  const navigate = useNavigate()
  const [item, setItem] = useState<Item>(initialItem)
  const [deleting, setDeleting] = useState(false)
  const [marking, setMarking] = useState(false)
  const [editing, setEditing] = useState(false)
  const [brand, setBrand] = useState(initialItem.brand ?? '')
  const [size, setSize] = useState(initialItem.size ?? '')
  const [saving, setSaving] = useState(false)
  const [scanningTag, setScanningTag] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const careInstructions = parseJSON<string[]>(item.careInstructions, [])
  const seasons = parseJSON<string[]>(item.season, [])
  const tags = parseJSON<string[]>(item.tags, [])

  async function handleMarkWorn() {
    setMarking(true)
    try { await markWorn(item.id); onChanged() }
    catch (err) { setError(String(err)) }
    finally { setMarking(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try { await deleteItem(item.id); onClose(); onChanged() }
    catch (err) { setError(String(err)); setDeleting(false) }
  }

  async function handleSaveEdit() {
    setSaving(true)
    try {
      const updated = await updateItem(item.id, { brand: brand || undefined, size: size || undefined })
      setItem(updated)
      setEditing(false)
    } catch (err) { setError(String(err)) }
    finally { setSaving(false) }
  }

  async function handleScanTag(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanningTag(true)
    setError(null)
    try {
      const { item: updated } = await scanTag(item.id, file)
      setItem(updated)
      setBrand(updated.brand ?? '')
      setSize(updated.size ?? '')
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
          <button
            onClick={() => setEditing(e => !e)}
            className="border-2 border-[#111] px-2 py-0.5 text-[8px] font-bold font-mono uppercase tracking-[0.06em] hover:bg-[#f0f0f0]"
          >
            {editing ? 'Done' : 'Edit'}
          </button>
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
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>

          {/* Name + category */}
          <div>
            <h2 className="font-bold text-base capitalize leading-tight">
              {item.primaryColor ? `${item.primaryColor} ` : ''}{item.subcategory ?? item.category}
            </h2>
            <p className="text-[9px] font-mono text-[#888] uppercase tracking-[0.06em] mt-0.5">
              {item.category}{item.subcategory ? ` — ${item.subcategory}` : ''}
            </p>
          </div>

          {/* Attribute badges */}
          <div className="flex flex-wrap gap-1.5">
            {[item.primaryColor, item.material, item.brand, item.size, ...seasons]
              .filter(Boolean)
              .map((val, i) => (
                <span key={i} className="border-2 border-[#111] px-2 py-0.5 text-[8px] font-bold font-mono uppercase tracking-[0.04em]">
                  {val}
                </span>
              ))
            }
          </div>

          {/* Edit fields */}
          {editing && (
            <div className="flex flex-col gap-3 border-2 border-[#111] p-3">
              <p className="text-[9px] font-bold font-mono uppercase tracking-[0.08em]">Edit</p>
              {[
                { label: 'Brand', value: brand, set: setBrand, placeholder: 'e.g. Nike' },
                { label: 'Size', value: size, set: setSize, placeholder: 'e.g. M' },
              ].map(({ label, value, set, placeholder }) => (
                <div key={label} className="flex flex-col gap-1">
                  <label className="text-[8px] font-mono text-[#888] uppercase tracking-[0.08em]">{label}</label>
                  <input
                    value={value}
                    onChange={e => set(e.target.value)}
                    placeholder={placeholder}
                    className="border-2 border-[#111] px-3 py-1.5 text-sm font-mono outline-none focus:bg-[#f0f0f0]"
                  />
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <Button variant="ghost" onClick={() => setEditing(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleSaveEdit} loading={saving} className="flex-1">Save</Button>
              </div>
            </div>
          )}

          {/* Care label photo */}
          <div>
            <p className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] border-b-2 border-[#111] pb-1.5 mb-2">
              Care Label
            </p>
            {item.tagImageUri ? (
              <div className="flex items-start gap-3">
                <div className="relative w-16 h-20 shrink-0 overflow-hidden border-2 border-[#111]">
                  <img
                    src={`/${item.tagImageUri}`}
                    alt="Care label"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  {careInstructions.length > 0 && (
                    <ul className="space-y-0.5">
                      {careInstructions.map((c, i) => (
                        <li key={i} className="text-[10px] font-mono text-[#555]">— {c}</li>
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

          {/* Care instructions (when no label photo yet but instructions exist) */}
          {!item.tagImageUri && careInstructions.length > 0 && (
            <ul className="space-y-0.5 -mt-2">
              {careInstructions.map((c, i) => (
                <li key={i} className="text-[10px] font-mono text-[#555]">— {c}</li>
              ))}
            </ul>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <span key={tag} className="border border-[#111] px-2 py-0.5 text-[8px] font-mono uppercase tracking-[0.04em]">{tag}</span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 border-t-2 border-[#111] pt-3">
            <div className="flex gap-2">
              <Button variant="primary" onClick={handleMarkWorn} loading={marking} className="flex-1">
                Mark Worn
              </Button>
              <Button
                variant="secondary"
                onClick={() => { onClose(); navigate('/tryon', { state: { itemId: item.id } }) }}
                className="flex-1"
              >
                Try On
              </Button>
            </div>
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
