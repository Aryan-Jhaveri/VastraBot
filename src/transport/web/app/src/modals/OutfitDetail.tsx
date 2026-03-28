import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateOutfit, uploadOutfitCover, removeOutfitCover, deleteOutfit } from '../api/outfits'
import type { HydratedOutfit } from '../api/outfits'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'

interface OutfitDetailProps {
  outfit: HydratedOutfit
  onClose: () => void
  onChanged: () => void
}

export function OutfitDetail({ outfit: initialOutfit, onClose, onChanged }: OutfitDetailProps) {
  const navigate = useNavigate()
  const [outfit, setOutfit] = useState<HydratedOutfit>(initialOutfit)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(initialOutfit.name)
  const [editingOccasion, setEditingOccasion] = useState(false)
  const [occasionInput, setOccasionInput] = useState(initialOutfit.occasion ?? '')
  const [saving, setSaving] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [removingCover, setRemovingCover] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  async function saveName() {
    if (!nameInput.trim() || nameInput === outfit.name) { setEditingName(false); return }
    setSaving(true)
    try {
      const updated = await updateOutfit(outfit.id, { name: nameInput.trim() })
      setOutfit(o => ({ ...o, ...updated }))
      setEditingName(false)
      onChanged()
    } catch (err) { setError(String(err)) }
    finally { setSaving(false) }
  }

  async function saveOccasion() {
    if (occasionInput === outfit.occasion) { setEditingOccasion(false); return }
    setSaving(true)
    try {
      const updated = await updateOutfit(outfit.id, { occasion: occasionInput || undefined })
      setOutfit(o => ({ ...o, ...updated }))
      setEditingOccasion(false)
      onChanged()
    } catch (err) { setError(String(err)) }
    finally { setSaving(false) }
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCover(true)
    setError(null)
    try {
      const updated = await uploadOutfitCover(outfit.id, file)
      setOutfit(o => ({ ...o, ...updated }))
      onChanged()
    } catch (err) { setError(String(err)) }
    finally { setUploadingCover(false) }
  }

  async function handleRemoveCover() {
    setRemovingCover(true)
    try {
      const updated = await removeOutfitCover(outfit.id)
      setOutfit(o => ({ ...o, ...updated }))
      onChanged()
    } catch (err) { setError(String(err)) }
    finally { setRemovingCover(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try { await deleteOutfit(outfit.id); onClose(); onChanged() }
    catch (err) { setError(String(err)); setDeleting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white border-2 border-[#111] w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-[#111]">
          <button onClick={onClose} className="text-[9px] font-bold font-mono uppercase tracking-[0.08em] hover:text-[#888]">←</button>
          <span className="text-[9px] font-bold font-mono uppercase tracking-[0.08em]">Outfit</span>
          <div className="w-8" />
        </div>

        <div className="flex flex-col gap-4 p-4">
          {error && (
            <div className="border-2 border-[#111] bg-[#f0f0f0] px-3 py-2 text-[10px] font-mono uppercase tracking-[0.06em]">
              {error}
            </div>
          )}

          {/* Cover photo */}
          <div>
            <p className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] border-b-2 border-[#111] pb-1.5 mb-2">
              Cover Photo
            </p>
            {outfit.coverImageUri ? (
              <div className="relative aspect-square overflow-hidden border-2 border-[#111]">
                <img src={`/${outfit.coverImageUri}`} alt="Cover" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute bottom-2 right-2 flex gap-1.5">
                  <button
                    onClick={handleRemoveCover}
                    disabled={removingCover || uploadingCover}
                    className="border border-white bg-black/50 px-2 py-0.5 text-[8px] font-mono text-white uppercase tracking-[0.06em] hover:bg-black/70 transition-colors disabled:opacity-50"
                  >
                    {removingCover ? '…' : 'Remove'}
                  </button>
                  <label className={`border border-white bg-black/50 px-2 py-0.5 text-[8px] font-mono text-white uppercase tracking-[0.06em] cursor-pointer hover:bg-black/70 transition-colors ${uploadingCover || removingCover ? 'opacity-50 pointer-events-none' : ''}`}>
                    {uploadingCover ? 'Uploading…' : 'Change'}
                    <input ref={coverInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCoverUpload} />
                  </label>
                </div>
              </div>
            ) : (
              <label className={`flex items-center gap-3 border-2 border-dashed border-[#888] p-3 cursor-pointer hover:border-[#111] transition-colors ${uploadingCover ? 'opacity-50 pointer-events-none' : ''}`}>
                {uploadingCover ? <Spinner size={20} /> : <div className="w-8 h-8 border-2 border-[#888] flex items-center justify-center text-[#888] font-bold">+</div>}
                <p className="text-[9px] font-bold font-mono uppercase tracking-[0.08em]">
                  {uploadingCover ? 'Uploading…' : 'Add Cover Photo'}
                </p>
                <input ref={coverInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCoverUpload} />
              </label>
            )}
          </div>

          {/* Name */}
          <div>
            <p className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] border-b-2 border-[#111] pb-1.5 mb-2">Name</p>
            {editingName ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={e => e.key === 'Enter' && saveName()}
                  className="flex-1 border-2 border-[#111] px-3 py-1.5 text-sm font-mono outline-none focus:bg-[#f0f0f0]"
                />
                <Button onClick={saveName} loading={saving} className="shrink-0">Save</Button>
              </div>
            ) : (
              <button onClick={() => setEditingName(true)} className="flex items-center gap-2 group">
                <span className="font-bold text-base">{outfit.name}</span>
                <span className="text-[8px] font-mono text-[#888] uppercase tracking-[0.06em] group-hover:text-[#111]">✎</span>
              </button>
            )}
          </div>

          {/* Occasion */}
          <div>
            <p className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] border-b-2 border-[#111] pb-1.5 mb-2">Occasion</p>
            {editingOccasion ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={occasionInput}
                  onChange={e => setOccasionInput(e.target.value)}
                  placeholder="e.g. casual, work, formal"
                  onBlur={saveOccasion}
                  onKeyDown={e => e.key === 'Enter' && saveOccasion()}
                  className="flex-1 border-2 border-[#111] px-3 py-1.5 text-sm font-mono outline-none focus:bg-[#f0f0f0]"
                />
                <Button onClick={saveOccasion} loading={saving} className="shrink-0">Save</Button>
              </div>
            ) : (
              <button onClick={() => setEditingOccasion(true)} className="flex items-center gap-2 group">
                <span className="text-sm font-mono capitalize">{outfit.occasion || <span className="text-[#888]">—</span>}</span>
                <span className="text-[8px] font-mono text-[#888] uppercase tracking-[0.06em] group-hover:text-[#111]">✎</span>
              </button>
            )}
          </div>

          {/* Item strip */}
          <div>
            <p className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] border-b-2 border-[#111] pb-1.5 mb-2">
              Items ({outfit.items.length})
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {outfit.items.map(item => (
                <div key={item.id} className="shrink-0 w-16 h-20 border-2 border-[#111] overflow-hidden">
                  <img
                    src={`/${item.imageUri}`}
                    alt={item.subcategory ?? item.category}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Care notes — aggregated from item care instructions */}
          {outfit.items.some(i => {
            try { return (JSON.parse(i.careInstructions || '[]') as string[]).length > 0 } catch { return false }
          }) && (
            <div>
              <p className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] border-b-2 border-[#111] pb-1.5 mb-2">
                Care Notes
              </p>
              {outfit.items.map(item => {
                let care: string[] = []
                try { care = JSON.parse(item.careInstructions || '[]') as string[] } catch { /* ignore */ }
                if (!care.length) return null
                return (
                  <div key={item.id} className="mb-2">
                    <p className="text-[8px] font-mono text-[#888] uppercase tracking-[0.04em] mb-0.5 capitalize">
                      {item.subcategory ?? item.category}
                    </p>
                    <ul className="space-y-0.5">
                      {care.map((c, i) => (
                        <li key={i} className="text-[10px] font-mono text-[#555]">— {c}</li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 border-t-2 border-[#111] pt-3">
            <Button
              onClick={() => {
                onClose()
                navigate('/tryon', { state: { outfitItemIds: outfit.items.map(i => i.id) } })
              }}
              variant="secondary"
              className="w-full"
            >
              Try On →
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
