import { useState, useRef, type DragEvent, type ChangeEvent } from 'react'
import { analyzeItem, createItem } from '../api/items'
import type { ItemClassification } from '../api/items'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { cropToAspectRatio } from '../lib/cropImage'

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

  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [primaryColor, setPrimaryColor] = useState('')
  const [brand, setBrand] = useState('')
  const [size, setSize] = useState('')
  const [season, setSeason] = useState('')
  const [tags, setTags] = useState('')

  function setFileAndPreview(f: File) {
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleFileSelected(rawFile: File) {
    // Crop item photos to 4:5 before analysis for consistent display
    const f = await cropToAspectRatio(rawFile, 4, 5).catch(() => rawFile)
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
        wearContext: classification?.wear_context || undefined,
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white border-2 border-[#111] w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-[#111]">
          <button onClick={onClose} className="text-[9px] font-bold font-mono uppercase tracking-[0.08em] hover:text-[#888]">← Back</button>
          <span className="text-[9px] font-bold font-mono uppercase tracking-[0.08em]">Add Item</span>
          <div className="w-10" />
        </div>

        {/* Step indicator */}
        <div className="flex gap-1 px-4 pt-3">
          {([1, 2, 3] as Step[]).map(s => (
            <div key={s} className={`h-[3px] flex-1 transition-colors ${step >= s ? 'bg-[#111]' : 'bg-[#e0e0e0]'}`} />
          ))}
        </div>

        <div className="p-4 flex flex-col gap-4">
          {error && (
            <div className="border-2 border-[#111] bg-[#f0f0f0] px-3 py-2 text-[10px] font-mono uppercase tracking-[0.06em]">
              {error}
            </div>
          )}

          {/* Step 1: Upload */}
          {step === 1 && (
            <>
              <p className="text-[9px] font-bold font-mono uppercase tracking-[0.1em]">Step 1 — Photo</p>
              <div
                onDrop={onDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed border-[#111] p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
                  dragOver ? 'bg-[#f0f0f0]' : 'hover:bg-[#fafafa]'
                }`}
              >
                <div className="w-8 h-8 border-2 border-[#111] flex items-center justify-center text-lg font-bold">+</div>
                <p className="text-[9px] font-mono uppercase tracking-[0.1em] text-[#888]">Camera or Gallery</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={onInputChange}
                />
              </div>
              <div className="flex gap-2">
                <label className="flex-1 bg-[#111] text-white border-2 border-[#111] py-2.5 text-[10px] font-bold font-mono uppercase tracking-[0.08em] text-center cursor-pointer hover:bg-[#333] transition-colors">
                  Camera
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onInputChange} />
                </label>
                <label className="flex-1 bg-white text-[#111] border-2 border-[#111] py-2.5 text-[10px] font-bold font-mono uppercase tracking-[0.08em] text-center cursor-pointer hover:bg-[#f0f0f0] transition-colors">
                  Gallery
                  <input type="file" accept="image/*" className="hidden" onChange={onInputChange} />
                </label>
              </div>
            </>
          )}

          {/* Step 2: Analyzing */}
          {step === 2 && (
            <>
              <p className="text-[9px] font-bold font-mono uppercase tracking-[0.1em]">Step 2 — Analyzing</p>
              {preview && (
                <div className="flex justify-center">
                  <img src={preview} alt="Preview" className="w-28 aspect-[4/5] object-contain border-2 border-[#111]" />
                </div>
              )}
              <div className="border-2 border-[#111] p-3">
                <p className="text-[9px] font-bold font-mono uppercase tracking-[0.08em] mb-2">AI Processing</p>
                <div className="h-[3px] bg-[#e8e8e8] mb-1.5 overflow-hidden">
                  <div className="h-[3px] w-3/5 bg-[#111] animate-pulse" />
                </div>
                <div className="flex items-center gap-2">
                  <Spinner size={12} />
                  <p className="text-[8px] font-mono text-[#888]">Detecting category + color</p>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && preview && (
            <>
              <p className="text-[9px] font-bold font-mono uppercase tracking-[0.1em]">Step 3 — Confirm</p>
              <div className="flex gap-3">
                <img src={preview} alt="Preview" className="w-14 aspect-[4/5] shrink-0 object-contain border-2 border-[#111]" />
                <div className="flex-1 flex flex-col gap-1.5">
                  {[
                    { label: 'Cat.', value: category, set: setCategory },
                    { label: 'Type', value: subcategory, set: setSubcategory },
                    { label: 'Color', value: primaryColor, set: setPrimaryColor },
                  ].map(({ label, value, set }) => (
                    <div key={label} className="flex items-center border-b border-[#f0f0f0] pb-1">
                      <span className="text-[8px] font-mono text-[#888] uppercase w-10 shrink-0">{label}</span>
                      <input
                        value={value}
                        onChange={e => set(e.target.value)}
                        className="flex-1 text-[9px] font-bold font-mono outline-none bg-transparent"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Brand', value: brand, set: setBrand, placeholder: 'e.g. Levi\'s' },
                  { label: 'Size', value: size, set: setSize, placeholder: 'e.g. M' },
                  { label: 'Season', value: season, set: setSeason, placeholder: 'spring, summer' },
                  { label: 'Tags', value: tags, set: setTags, placeholder: 'casual, office' },
                ].map(({ label, value, set, placeholder }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <label className="text-[8px] font-mono text-[#888] uppercase tracking-[0.08em]">{label}</label>
                    <input
                      value={value}
                      onChange={e => set(e.target.value)}
                      placeholder={placeholder}
                      className="border-2 border-[#111] px-2 py-1.5 text-[10px] font-mono outline-none focus:bg-[#f0f0f0]"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
                <Button onClick={handleSave} loading={saving} className="flex-1">Save Item</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
