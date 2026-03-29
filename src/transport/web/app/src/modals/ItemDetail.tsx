import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteItem, updateItem, scanTag } from '../api/items'
import type { Item } from '../api/items'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { ChipToggle } from '../components/ui/ChipToggle'

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
  const [saving, setSaving] = useState(false)
  const [scanningTag, setScanningTag] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Per-field inline editing state
  const [editingCategory, setEditingCategory] = useState(false)
  const [categoryInput, setCategoryInput] = useState('')
  const [editingSubcategory, setEditingSubcategory] = useState(false)
  const [subcategoryInput, setSubcategoryInput] = useState('')
  const [editingColor, setEditingColor] = useState(false)
  const [colorInput, setColorInput] = useState('')
  const [editingMaterial, setEditingMaterial] = useState(false)
  const [materialInput, setMaterialInput] = useState('')
  const [editingBrand, setEditingBrand] = useState(false)
  const [brandInput, setBrandInput] = useState('')
  const [editingSize, setEditingSize] = useState(false)
  const [sizeInput, setSizeInput] = useState('')
  const [editingSeason, setEditingSeason] = useState(false)
  const [editingOccasion, setEditingOccasion] = useState(false)
  const [occasionInput, setOccasionInput] = useState('')

  // Tags & care instructions
  const [tagInput, setTagInput] = useState('')
  const [careInput, setCareInput] = useState('')

  const currentSeasons = parseJSON<string[]>(item.season, [])
  const currentOccasions = parseJSON<string[]>(item.occasion, [])
  const currentTags = parseJSON<string[]>(item.tags, [])
  const currentCare = parseJSON<string[]>(item.careInstructions, [])

  // Generic per-field save
  async function saveField(patch: Partial<Item>, cleanup: () => void) {
    setSaving(true)
    try {
      const updated = await updateItem(item.id, patch)
      setItem(updated)
      cleanup()
      onChanged()
    } catch (err) { setError(String(err)) }
    finally { setSaving(false) }
  }

  async function saveCategory() {
    if (!categoryInput.trim() || categoryInput === item.category) { setEditingCategory(false); return }
    await saveField({ category: categoryInput.trim() }, () => setEditingCategory(false))
  }

  async function saveSubcategory() {
    if (subcategoryInput === (item.subcategory ?? '')) { setEditingSubcategory(false); return }
    await saveField({ subcategory: subcategoryInput.trim() || undefined }, () => setEditingSubcategory(false))
  }

  async function saveColor() {
    if (colorInput === (item.primaryColor ?? '')) { setEditingColor(false); return }
    await saveField({ primaryColor: colorInput.trim() || undefined }, () => setEditingColor(false))
  }

  async function saveMaterial() {
    if (materialInput === (item.material ?? '')) { setEditingMaterial(false); return }
    await saveField({ material: materialInput.trim() || undefined }, () => setEditingMaterial(false))
  }

  async function saveBrand() {
    if (brandInput === (item.brand ?? '')) { setEditingBrand(false); return }
    await saveField({ brand: brandInput.trim() || undefined }, () => setEditingBrand(false))
  }

  async function saveSize() {
    if (sizeInput === (item.size ?? '')) { setEditingSize(false); return }
    await saveField({ size: sizeInput.trim() || undefined }, () => setEditingSize(false))
  }

  async function addOccasion(raw: string) {
    const o = raw.trim().toLowerCase()
    if (!o || currentOccasions.includes(o)) { setOccasionInput(''); return }
    const next = [...currentOccasions, o]
    try {
      const updated = await updateItem(item.id, { occasion: next as unknown as string })
      setItem(updated)
      setOccasionInput('')
      onChanged()
    } catch (err) { setError(String(err)) }
  }

  async function removeOccasion(o: string) {
    const next = currentOccasions.filter(x => x !== o)
    try {
      const updated = await updateItem(item.id, { occasion: next as unknown as string })
      setItem(updated)
      onChanged()
    } catch (err) { setError(String(err)) }
  }

  async function addTag(raw: string) {
    const t = raw.trim().toLowerCase()
    if (!t || currentTags.includes(t)) { setTagInput(''); return }
    const next = [...currentTags, t]
    try {
      const updated = await updateItem(item.id, { tags: next as unknown as string })
      setItem(updated)
      setTagInput('')
      onChanged()
    } catch (err) { setError(String(err)) }
  }

  async function removeTag(t: string) {
    const next = currentTags.filter(x => x !== t)
    try {
      const updated = await updateItem(item.id, { tags: next as unknown as string })
      setItem(updated)
      onChanged()
    } catch (err) { setError(String(err)) }
  }

  async function addCare(raw: string) {
    const c = raw.trim()
    if (!c || currentCare.includes(c)) { setCareInput(''); return }
    const next = [...currentCare, c]
    try {
      const updated = await updateItem(item.id, { careInstructions: next as unknown as string })
      setItem(updated)
      setCareInput('')
      onChanged()
    } catch (err) { setError(String(err)) }
  }

  async function removeCare(c: string) {
    const next = currentCare.filter(x => x !== c)
    try {
      const updated = await updateItem(item.id, { careInstructions: next as unknown as string })
      setItem(updated)
      onChanged()
    } catch (err) { setError(String(err)) }
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

  function InlineField({
    label,
    value,
    editing,
    input,
    onStartEdit,
    onInput,
    onSave,
    placeholder,
  }: {
    label: string
    value: string | null | undefined
    editing: boolean
    input: string
    onStartEdit: () => void
    onInput: (v: string) => void
    onSave: () => void
    placeholder?: string
  }) {
    return (
      <div>
        <p className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] border-b-2 border-[#111] pb-1.5 mb-2">{label}</p>
        {editing ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={input}
              onChange={e => onInput(e.target.value)}
              onBlur={onSave}
              onKeyDown={e => e.key === 'Enter' && onSave()}
              placeholder={placeholder}
              className="flex-1 border-2 border-[#111] px-3 py-1.5 text-sm font-mono outline-none focus:bg-[#f0f0f0]"
            />
            <Button onClick={onSave} loading={saving} className="shrink-0">Save</Button>
          </div>
        ) : (
          <button onClick={onStartEdit} className="flex items-center gap-2 group">
            <span className="text-sm font-mono capitalize">{value || <span className="text-[#888]">—</span>}</span>
            <span className="text-[8px] font-mono text-[#888] uppercase tracking-[0.06em] group-hover:text-[#111]">✎</span>
          </button>
        )}
      </div>
    )
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
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>

          {/* Category */}
          <InlineField
            label="Category"
            value={item.category}
            editing={editingCategory}
            input={categoryInput}
            onStartEdit={() => { setCategoryInput(item.category); setEditingCategory(true) }}
            onInput={setCategoryInput}
            onSave={saveCategory}
            placeholder="e.g. tops"
          />

          {/* Type */}
          <InlineField
            label="Type"
            value={item.subcategory}
            editing={editingSubcategory}
            input={subcategoryInput}
            onStartEdit={() => { setSubcategoryInput(item.subcategory ?? ''); setEditingSubcategory(true) }}
            onInput={setSubcategoryInput}
            onSave={saveSubcategory}
            placeholder="e.g. t-shirt"
          />

          {/* Color */}
          <InlineField
            label="Color"
            value={item.primaryColor}
            editing={editingColor}
            input={colorInput}
            onStartEdit={() => { setColorInput(item.primaryColor ?? ''); setEditingColor(true) }}
            onInput={setColorInput}
            onSave={saveColor}
            placeholder="e.g. navy"
          />

          {/* Material */}
          <InlineField
            label="Material"
            value={item.material}
            editing={editingMaterial}
            input={materialInput}
            onStartEdit={() => { setMaterialInput(item.material ?? ''); setEditingMaterial(true) }}
            onInput={setMaterialInput}
            onSave={saveMaterial}
            placeholder="e.g. cotton"
          />

          {/* Brand */}
          <InlineField
            label="Brand"
            value={item.brand}
            editing={editingBrand}
            input={brandInput}
            onStartEdit={() => { setBrandInput(item.brand ?? ''); setEditingBrand(true) }}
            onInput={setBrandInput}
            onSave={saveBrand}
            placeholder="e.g. Nike"
          />

          {/* Size */}
          <InlineField
            label="Size"
            value={item.size}
            editing={editingSize}
            input={sizeInput}
            onStartEdit={() => { setSizeInput(item.size ?? ''); setEditingSize(true) }}
            onInput={setSizeInput}
            onSave={saveSize}
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
            <div className="flex flex-wrap gap-1.5 mb-2">
              {currentTags.map(t => (
                <span key={t} className="flex items-center gap-1 border-2 border-[#111] px-2 py-0.5 text-[9px] font-mono uppercase tracking-[0.06em]">
                  {t}
                  <button onClick={() => removeTag(t)} className="text-[#888] hover:text-[#111] leading-none font-bold">×</button>
                </span>
              ))}
            </div>
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); void addTag(tagInput) } }}
              onBlur={() => { if (tagInput.trim()) void addTag(tagInput) }}
              placeholder="Add tag, press Enter"
              className="w-full border-2 border-[#111] px-3 py-1.5 text-[9px] font-mono outline-none focus:bg-[#f0f0f0] placeholder:text-[#888] placeholder:normal-case"
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
                  <img src={`/${item.tagImageUri}`} alt="Care label" className="absolute inset-0 h-full w-full object-cover" />
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
