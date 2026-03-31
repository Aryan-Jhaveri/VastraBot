import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateOutfit, uploadOutfitCover, removeOutfitCover, deleteOutfit } from '../api/outfits'
import type { HydratedOutfit } from '../api/outfits'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { ChipToggle } from '../components/ui/ChipToggle'
import { InlineField } from '../components/ui/InlineField'
import { TagEditor } from '../components/ui/TagEditor'

const SEASONS = ['spring', 'summer', 'fall', 'winter', 'all']

interface OutfitDetailProps {
  outfit: HydratedOutfit
  onClose: () => void
  onChanged: () => void
}

export function OutfitDetail({ outfit: initialOutfit, onClose, onChanged }: OutfitDetailProps) {
  const navigate = useNavigate()
  const [outfit, setOutfit] = useState<HydratedOutfit>(initialOutfit)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [removingCover, setRemovingCover] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const currentSeasons: string[] = (() => { try { return JSON.parse(outfit.season || '[]') } catch { return [] } })()
  const currentTags: string[] = (() => { try { return JSON.parse(outfit.tags || '[]') } catch { return [] } })()

  async function patchOutfit(data: Parameters<typeof updateOutfit>[1]) {
    try {
      const updated = await updateOutfit(outfit.id, data)
      setOutfit(o => ({ ...o, ...updated }))
      onChanged()
    } catch (err) { setError(String(err)) }
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
              <div className="relative overflow-hidden border-2 border-[#111]">
                <img src={`/${outfit.coverImageUri}`} alt="Cover" className="w-full h-auto max-h-[70vh] object-contain block" />
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

          <InlineField
            label="Name"
            value={outfit.name}
            onSave={async (next) => {
              if (!next.trim() || next.trim() === outfit.name) return
              await patchOutfit({ name: next.trim() })
            }}
            valueClassName="font-bold text-base"
          />

          <InlineField
            label="Occasion"
            value={outfit.occasion}
            onSave={async (next) => {
              if (next === (outfit.occasion ?? '')) return
              await patchOutfit({ occasion: next || undefined })
            }}
            placeholder="e.g. casual, work, formal"
          />

          {/* Season */}
          <div>
            <p className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] border-b-2 border-[#111] pb-1.5 mb-2">Season</p>
            <ChipToggle
              options={SEASONS}
              selected={currentSeasons}
              onChange={async (next) => {
                try {
                  const updated = await updateOutfit(outfit.id, { season: next })
                  setOutfit(o => ({ ...o, ...updated }))
                  onChanged()
                } catch (err) { setError(String(err)) }
              }}
            />
          </div>

          {/* Tags */}
          <div>
            <p className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] border-b-2 border-[#111] pb-1.5 mb-2">Tags</p>
            <TagEditor
              tags={currentTags}
              onChange={async (next) => {
                try {
                  const updated = await updateOutfit(outfit.id, { tags: next })
                  setOutfit(o => ({ ...o, ...updated }))
                  onChanged()
                } catch (err) { setError(String(err)) }
              }}
            />
          </div>

          <InlineField
            label="Notes"
            value={outfit.notes}
            onSave={async (next) => {
              if (next === (outfit.notes ?? '')) return
              await patchOutfit({ notes: next || undefined })
            }}
            placeholder="Add notes about this outfit…"
            multiline
            valueClassName="text-[10px] font-mono text-[#555]"
          />

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
                    className="h-full w-full object-contain"
                  />
                </div>
              ))}
            </div>
          </div>

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
