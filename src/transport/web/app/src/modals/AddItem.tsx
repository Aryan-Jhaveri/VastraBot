import { useState, useRef, type DragEvent, type ChangeEvent } from 'react'
import { analyzeItem, createItem } from '../api/items'
import type { ItemClassification } from '../api/items'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Spinner } from '../components/ui/Spinner'

interface AddItemProps {
  onClose: () => void
  onSaved: () => void
}

type Step = 1 | 2 | 3

export function AddItem({ onClose, onSaved }: AddItemProps) {
  const [step, setStep] = useState<Step>(1)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [classification, setClassification] = useState<ItemClassification | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Editable fields — pre-filled by AI, fully free-form
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [primaryColor, setPrimaryColor] = useState('')
  const [brand, setBrand] = useState('')
  const [size, setSize] = useState('')
  const [season, setSeason] = useState('')   // comma-separated, e.g. "spring, summer"
  const [tags, setTags] = useState('')       // comma-separated

  function setFileAndPreview(f: File) {
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleFileSelected(f: File) {
    setFileAndPreview(f)
    setStep(2)
    setError(null)
    try {
      const result = await analyzeItem(f)
      setClassification(result)
      setCategory(result.category)
      setSubcategory(result.subcategory)
      setPrimaryColor(result.primary_color)
      setSeason(result.season.join(', '))
      setTags(result.suggested_tags.join(', '))
      setStep(3)
    } catch (err) {
      setError(String(err))
      setStep(1)
    }
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) void handleFileSelected(f)
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f && f.type.startsWith('image/')) void handleFileSelected(f)
  }

  function splitCSV(s: string): string[] {
    return s.split(',').map(x => x.trim()).filter(Boolean)
  }

  async function handleSave() {
    if (!file) return
    setSaving(true)
    setError(null)
    try {
      await createItem(file, {
        category: category || undefined,
        subcategory: subcategory || undefined,
        primaryColor: primaryColor || undefined,
        colors: classification?.colors,
        material: classification?.material,
        season: splitCSV(season),
        aiDescription: classification?.ai_description,
        tags: splitCSV(tags),
        brand: brand || undefined,
        size: size || undefined,
      })
      onSaved()
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900">Add Item</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl leading-none">×</button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Step 1: Upload */}
          {step === 1 && (
            <div
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
                dragOver ? 'border-stone-400 bg-stone-50' : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <span className="text-4xl">📷</span>
              <p className="text-sm font-medium text-stone-700">Drop a photo or tap to choose</p>
              <p className="text-xs text-stone-400">JPG, PNG, WebP</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={onInputChange}
              />
            </div>
          )}

          {/* Step 2: Analyzing */}
          {step === 2 && (
            <div className="flex flex-col items-center gap-4 py-6">
              {preview && (
                <img src={preview} alt="Preview" className="h-40 w-32 object-cover rounded-xl" />
              )}
              <div className="flex items-center gap-2 text-stone-500">
                <Spinner size={20} />
                <span className="text-sm">Analyzing your item…</span>
              </div>
            </div>
          )}

          {/* Step 3: Confirm/Edit */}
          {step === 3 && preview && (
            <>
              <div className="flex gap-4">
                <img src={preview} alt="Preview" className="h-32 w-24 shrink-0 object-cover rounded-xl border border-stone-100" />
                <div className="flex flex-col gap-3 flex-1">
                  <Input
                    label="Category"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    placeholder="e.g. tops"
                  />
                  <Input
                    label="Subcategory"
                    value={subcategory}
                    onChange={e => setSubcategory(e.target.value)}
                    placeholder="e.g. T-shirt"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Primary Color"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  placeholder="e.g. navy"
                />
                <Input
                  label="Brand"
                  value={brand}
                  onChange={e => setBrand(e.target.value)}
                  placeholder="e.g. Levi's"
                />
                <Input
                  label="Size"
                  value={size}
                  onChange={e => setSize(e.target.value)}
                  placeholder="e.g. M, 32"
                />
                <Input
                  label="Season"
                  value={season}
                  onChange={e => setSeason(e.target.value)}
                  placeholder="e.g. spring, summer"
                />
              </div>

              <Input
                label="Tags"
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="e.g. casual, office (comma-separated)"
              />

              <div className="flex gap-2 pt-2">
                <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
                <Button onClick={handleSave} loading={saving} className="flex-1">Save</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
