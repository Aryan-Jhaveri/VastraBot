import { useState, useEffect } from 'react'
import { useLocation as useRouterLocation } from 'react-router-dom'
import { fetchUserPhotos, uploadUserPhoto, deleteUserPhoto } from '../api/userPhotos'
import { fetchItems } from '../api/items'
import { generateTryOn } from '../api/tryon'
import type { UserPhoto } from '../api/userPhotos'
import type { Item } from '../api/items'
import { ItemCard } from '../components/ItemCard'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { cropToAspectRatio } from '../lib/cropImage'

type TryOnStep = 'pick-photo' | 'pick-items' | 'result'

export function TryOn() {
  const routerState = useRouterLocation().state as { itemId?: string } | null
  const [step, setStep] = useState<TryOnStep>('pick-photo')

  const [photos, setPhotos] = useState<UserPhoto[]>([])
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)
  const [loadingPhotos, setLoadingPhotos] = useState(true)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null)

  const [items, setItems] = useState<Item[]>([])
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [loadingItems, setLoadingItems] = useState(false)

  const [generating, setGenerating] = useState(false)
  const [resultUri, setResultUri] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUserPhotos()
      .then(ps => {
        setPhotos(ps)
        const primary = ps.find(p => p.isPrimary)
        if (primary) setSelectedPhotoId(primary.id)
        else if (ps.length > 0) setSelectedPhotoId(ps[0].id)
      })
      .catch(err => setError(String(err)))
      .finally(() => setLoadingPhotos(false))
  }, [])

  useEffect(() => {
    if (step === 'pick-items') {
      setLoadingItems(true)
      fetchItems({ limit: 100 })
        .then(res => {
          setItems(res.items)
          if (routerState?.itemId) {
            setSelectedItemIds(new Set([routerState.itemId]))
          }
        })
        .catch(err => setError(String(err)))
        .finally(() => setLoadingItems(false))
    }
  }, [step])

  async function handleDeletePhoto(id: string) {
    setDeletingPhotoId(id)
    try {
      await deleteUserPhoto(id)
      const remaining = photos.filter(p => p.id !== id)
      setPhotos(remaining)
      if (selectedPhotoId === id) {
        setSelectedPhotoId(remaining[0]?.id ?? null)
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setDeletingPhotoId(null)
    }
  }

  async function handleAddPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      // Crop person photos to 3:4 for consistent display
      const cropped = await cropToAspectRatio(file, 3, 4)
      const photo = await uploadUserPhoto(cropped)
      setPhotos(prev => [photo, ...prev])
      setSelectedPhotoId(photo.id)
    } catch (err) {
      setError(String(err))
    } finally {
      setUploadingPhoto(false)
      // Reset input so same file can be re-selected
      e.target.value = ''
    }
  }

  function toggleItem(id: string) {
    setSelectedItemIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleGenerate() {
    if (!selectedPhotoId || selectedItemIds.size === 0) return
    setGenerating(true)
    setError(null)
    setStep('result')
    try {
      const result = await generateTryOn(selectedPhotoId, [...selectedItemIds])
      setResultUri(result.resultImageUri)
    } catch (err) {
      setError(String(err))
      setStep('pick-items')
    } finally {
      setGenerating(false)
    }
  }

  function reset() {
    setStep('pick-photo')
    setResultUri(null)
    setError(null)
    setSelectedItemIds(new Set())
  }

  const selectedPhoto = photos.find(p => p.id === selectedPhotoId)

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      {/* Header */}
      <h1 className="text-[22px] font-bold leading-tight whitespace-pre-line">{"Try\nOn."}</h1>

      {error && (
        <div className="border-2 border-[#111] bg-[#f0f0f0] px-3 py-2 text-[10px] font-mono text-[#111] uppercase tracking-[0.06em]">
          {error}
        </div>
      )}

      {/* Step 1: Pick reference photo */}
      {step === 'pick-photo' && (
        <>
          <p className="text-[9px] font-mono text-[#888] uppercase tracking-[0.06em]">Your photo</p>

          {loadingPhotos ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : photos.length === 0 ? (
            /* No photos yet — full-width upload zone */
            <label className={`block w-full aspect-[3/4] border-2 border-dashed border-[#888] flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#111] transition-colors ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}>
              {uploadingPhoto
                ? <Spinner size={32} />
                : <span className="text-4xl font-bold text-[#888] leading-none">+</span>
              }
              <span className="text-[9px] font-mono text-[#888] uppercase tracking-[0.08em]">
                {uploadingPhoto ? 'Uploading…' : 'Add your photo'}
              </span>
              <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleAddPhoto} disabled={uploadingPhoto} />
            </label>
          ) : (
            <>
              {/* Large hero photo — full width, 3:4 aspect */}
              <div className="relative w-full aspect-[3/4] border-2 border-[#111] overflow-hidden bg-[#f0f0f0]">
                {selectedPhoto && (
                  <img
                    src={`/${selectedPhoto.imageUri}`}
                    alt="You"
                    className="w-full h-full object-cover"
                  />
                )}
                {/* Delete selected photo */}
                {selectedPhoto && (
                  <button
                    onClick={() => handleDeletePhoto(selectedPhoto.id)}
                    disabled={deletingPhotoId === selectedPhoto.id}
                    className="absolute top-2 right-2 w-8 h-8 bg-[#111] text-white flex items-center justify-center text-base font-bold hover:bg-[#444] disabled:opacity-50 transition-colors"
                    title="Remove photo"
                  >
                    {deletingPhotoId === selectedPhoto.id ? <Spinner size={14} /> : '×'}
                  </button>
                )}
              </div>

              {/* Thumbnail strip + Add button */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {photos.map(photo => (
                  <button
                    key={photo.id}
                    onClick={() => setSelectedPhotoId(photo.id)}
                    className={`shrink-0 w-14 aspect-[3/4] overflow-hidden border-2 transition-all ${
                      selectedPhotoId === photo.id
                        ? 'border-[#111] ring-[3px] ring-[#111] ring-offset-[-3px]'
                        : 'border-[#888] hover:border-[#111]'
                    }`}
                  >
                    <img src={`/${photo.imageUri}`} alt="You" className="w-full h-full object-cover" />
                  </button>
                ))}

                {photos.length < 4 && (
                  <label className={`shrink-0 w-14 aspect-[3/4] flex flex-col items-center justify-center gap-1 border-2 border-dashed border-[#888] cursor-pointer hover:border-[#111] transition-colors ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}>
                    {uploadingPhoto ? <Spinner size={16} /> : <span className="text-xl font-bold text-[#888] leading-none">+</span>}
                    <span className="text-[7px] font-mono text-[#888] uppercase">Add</span>
                    <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleAddPhoto} disabled={uploadingPhoto} />
                  </label>
                )}
              </div>
            </>
          )}

          <div className="border-t-2 border-[#111] pt-3">
            <Button onClick={() => setStep('pick-items')} disabled={!selectedPhotoId} className="w-full">
              Select Items →
            </Button>
          </div>
        </>
      )}

      {/* Step 2: Pick items */}
      {step === 'pick-items' && (
        <>
          <div className="flex items-center justify-between border-b-2 border-[#111] pb-2">
            <p className="text-[9px] font-mono uppercase tracking-[0.06em]">Select items</p>
            <button onClick={() => setStep('pick-photo')} className="text-[9px] font-mono text-[#888] uppercase tracking-[0.06em] hover:text-[#111]">← Back</button>
          </div>

          {loadingItems ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <div className="grid grid-cols-3 gap-[3px]">
              {items.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  selectable
                  selected={selectedItemIds.has(item.id)}
                  onClick={() => toggleItem(item.id)}
                />
              ))}
            </div>
          )}

          <div className="border-t-2 border-[#111] pt-3">
            <Button onClick={handleGenerate} disabled={selectedItemIds.size === 0} className="w-full">
              Generate Preview ({selectedItemIds.size} item{selectedItemIds.size !== 1 ? 's' : ''})
            </Button>
          </div>
        </>
      )}

      {/* Step 3: Result */}
      {step === 'result' && (
        <>
          {generating && (
            <div className="flex flex-col items-center gap-4 py-10">
              <Spinner size={40} />
              <p className="text-[10px] font-mono text-[#888] uppercase tracking-[0.08em]">Generating your look…</p>
            </div>
          )}

          {resultUri && !generating && (
            <>
              <div className="border-2 border-[#111] overflow-hidden">
                <img src={`/${resultUri}`} alt="Try-on result" className="w-full min-h-[60vh] object-contain bg-[#f0f0f0]" />
              </div>
              <Button onClick={reset} variant="secondary" className="w-full">
                Try Again
              </Button>
            </>
          )}
        </>
      )}
    </div>
  )
}
