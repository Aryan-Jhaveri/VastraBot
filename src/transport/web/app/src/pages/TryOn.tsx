import { useState, useEffect } from 'react'
import { useLocation as useRouterLocation } from 'react-router-dom'
import { fetchUserPhotos, uploadUserPhoto, deleteUserPhoto } from '../api/userPhotos'
import { fetchItems } from '../api/items'
import { generateTryOn, fetchTryonHistory, deleteTryonResult, uploadGarment } from '../api/tryon'
import { fetchOutfitsHydrated } from '../api/outfits'
import type { UserPhoto } from '../api/userPhotos'
import type { Item } from '../api/items'
import type { HydratedOutfit } from '../api/outfits'
import type { TryonHistoryItem } from '../api/tryon'
import { ItemCard } from '../components/ItemCard'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { cropToAspectRatio } from '../lib/cropImage'
import { nanoid } from 'nanoid'

type TryOnStep = 'pick-photo' | 'pick-items' | 'upload-garments' | 'result'
type ItemsTab = 'items' | 'outfits'

interface GarmentUpload {
  localId: string
  previewUrl: string
  imageUri: string | null
  uploading: boolean
}

export function TryOn() {
  const routerState = useRouterLocation().state as { itemId?: string; outfitItemIds?: string[] } | null

  const [step, setStep] = useState<TryOnStep>('pick-photo')

  // Photos
  const [photos, setPhotos] = useState<UserPhoto[]>([])
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)
  const [loadingPhotos, setLoadingPhotos] = useState(true)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null)

  // Items + outfits
  const [items, setItems] = useState<Item[]>([])
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    routerState?.outfitItemIds?.length ? new Set(routerState.outfitItemIds) : new Set()
  )
  const [loadingItems, setLoadingItems] = useState(false)
  const [itemsTab, setItemsTab] = useState<ItemsTab>('items')
  const [outfits, setOutfits] = useState<HydratedOutfit[]>([])
  const [loadingOutfits, setLoadingOutfits] = useState(false)

  // Garments
  const [uploadedGarments, setUploadedGarments] = useState<GarmentUpload[]>([])

  // Result
  const [generating, setGenerating] = useState(false)
  const [resultUri, setResultUri] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // History
  const [history, setHistory] = useState<TryonHistoryItem[]>([])
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null)
  const [previewingHistoryUri, setPreviewingHistoryUri] = useState<string | null>(null)
  const [deletingHistoryId, setDeletingHistoryId] = useState<string | null>(null)

  // Load photos on mount; skip to step 2 if outfit items came from router
  useEffect(() => {
    fetchUserPhotos()
      .then(ps => {
        setPhotos(ps)
        const primary = ps.find(p => p.isPrimary)
        if (primary) setSelectedPhotoId(primary.id)
        else if (ps.length > 0) setSelectedPhotoId(ps[0].id)
        if (routerState?.outfitItemIds?.length && ps.length > 0) setStep('pick-items')
      })
      .catch(err => setError(String(err)))
      .finally(() => setLoadingPhotos(false))
  }, [])

  // Refresh history whenever user is on step 1 (picks up newly generated results)
  useEffect(() => {
    if (step !== 'pick-photo') return
    fetchTryonHistory()
      .then(setHistory)
      .catch(() => { /* non-critical */ })
  }, [step])

  // Load items when entering step 2
  useEffect(() => {
    if (step !== 'pick-items') return
    setLoadingItems(true)
    fetchItems({ limit: 100 })
      .then(res => {
        setItems(res.items)
        if (routerState?.itemId && !routerState?.outfitItemIds?.length) {
          setSelectedItemIds(new Set([routerState.itemId]))
        }
      })
      .catch(err => setError(String(err)))
      .finally(() => setLoadingItems(false))
  }, [step])

  // Load outfits when switching to outfits tab (lazy, once)
  useEffect(() => {
    if (itemsTab !== 'outfits' || outfits.length > 0) return
    setLoadingOutfits(true)
    fetchOutfitsHydrated()
      .then(setOutfits)
      .catch(err => setError(String(err)))
      .finally(() => setLoadingOutfits(false))
  }, [itemsTab])

  async function handleDeletePhoto(id: string) {
    setDeletingPhotoId(id)
    try {
      await deleteUserPhoto(id)
      const remaining = photos.filter(p => p.id !== id)
      setPhotos(remaining)
      if (selectedPhotoId === id) setSelectedPhotoId(remaining[0]?.id ?? null)
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
      const cropped = await cropToAspectRatio(file, 3, 4)
      const photo = await uploadUserPhoto(cropped)
      setPhotos(prev => [photo, ...prev])
      setSelectedPhotoId(photo.id)
    } catch (err) {
      setError(String(err))
    } finally {
      setUploadingPhoto(false)
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

  function selectOutfit(outfit: HydratedOutfit) {
    setSelectedItemIds(new Set(outfit.items.map(i => i.id)))
    setItemsTab('items')
  }

  async function handleAddGarments(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    e.target.value = ''

    // Create placeholder entries immediately for instant previews
    const placeholders: GarmentUpload[] = files.map(file => ({
      localId: nanoid(),
      previewUrl: URL.createObjectURL(file),
      imageUri: null,
      uploading: true,
    }))
    setUploadedGarments(prev => [...prev, ...placeholders])

    // Upload all in parallel
    await Promise.all(
      files.map(async (file, i) => {
        const localId = placeholders[i].localId
        try {
          const { imageUri } = await uploadGarment(file)
          setUploadedGarments(prev =>
            prev.map(g => g.localId === localId ? { ...g, imageUri, uploading: false } : g)
          )
        } catch {
          setUploadedGarments(prev => prev.filter(g => g.localId !== localId))
        }
      })
    )
  }

  function removeGarment(localId: string) {
    setUploadedGarments(prev => prev.filter(g => g.localId !== localId))
  }

  async function handleGenerate() {
    if (!selectedPhotoId || selectedItemIds.size === 0) return
    setGenerating(true)
    setError(null)
    setSaved(false)
    setStep('result')
    try {
      const garmentUris = uploadedGarments
        .filter(g => g.imageUri !== null)
        .map(g => g.imageUri!)
      const result = await generateTryOn(
        selectedPhotoId,
        [...selectedItemIds],
        garmentUris.length ? garmentUris : undefined,
      )
      setResultUri(result.resultImageUri)
    } catch (err) {
      setError(String(err))
      setStep('upload-garments')
    } finally {
      setGenerating(false)
    }
  }

  function tryAgain() {
    setStep('upload-garments')
    setResultUri(null)
    setSaved(false)
    setError(null)
  }

  function previewHistory(item: TryonHistoryItem) {
    setSelectedHistoryId(item.id)
    setPreviewingHistoryUri(item.resultImageUri)
  }

  function clearHistoryPreview() {
    setSelectedHistoryId(null)
    setPreviewingHistoryUri(null)
  }

  async function handleDeleteHistory(id: string) {
    setDeletingHistoryId(id)
    try {
      await deleteTryonResult(id)
      setHistory(prev => prev.filter(h => h.id !== id))
      if (selectedHistoryId === id) clearHistoryPreview()
    } catch (err) {
      setError(String(err))
    } finally {
      setDeletingHistoryId(null)
    }
  }

  const selectedPhoto = photos.find(p => p.id === selectedPhotoId)

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <h1 className="text-[22px] font-bold leading-tight whitespace-pre-line">{"Try\nOn."}</h1>

      {error && (
        <div className="border-2 border-[#111] bg-[#f0f0f0] px-3 py-2 text-[10px] font-mono text-[#111] uppercase tracking-[0.06em]">
          {error}
        </div>
      )}

      {/* ── Step 1: Pick reference photo ── */}
      {step === 'pick-photo' && (
        <>
          <p className="text-[9px] font-mono text-[#888] uppercase tracking-[0.06em]">
            {previewingHistoryUri ? 'History preview' : 'Your photo'}
          </p>

          {loadingPhotos ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : photos.length === 0 && !previewingHistoryUri ? (
            <label className={`block w-full aspect-[3/4] border-2 border-dashed border-[#888] flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#111] transition-colors ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}>
              {uploadingPhoto ? <Spinner size={32} /> : <span className="text-4xl font-bold text-[#888] leading-none">+</span>}
              <span className="text-[9px] font-mono text-[#888] uppercase tracking-[0.08em]">
                {uploadingPhoto ? 'Uploading…' : 'Add your photo'}
              </span>
              <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleAddPhoto} disabled={uploadingPhoto} />
            </label>
          ) : (
            <>
              {/* Big image — user photo or history preview */}
              <div className="relative w-full aspect-[3/4] border-2 border-[#111] overflow-hidden bg-[#f0f0f0]">
                {previewingHistoryUri ? (
                  <>
                    <img src={`/${previewingHistoryUri}`} alt="History result" className="w-full h-full object-contain" />
                    <button
                      onClick={clearHistoryPreview}
                      className="absolute top-2 left-2 bg-[#111]/80 text-white px-2 py-1 text-[8px] font-bold font-mono uppercase tracking-[0.06em] hover:bg-[#111] transition-colors"
                    >
                      ← Photo
                    </button>
                  </>
                ) : (
                  <>
                    {selectedPhoto && (
                      <img src={`/${selectedPhoto.imageUri}`} alt="You" className="w-full h-full object-cover" />
                    )}
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
                  </>
                )}
              </div>

              {/* Photo thumbnail strip — hidden while previewing history */}
              {!previewingHistoryUri && (
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
              )}
            </>
          )}

          {/* History carousel */}
          {history.length > 0 && (
            <div>
              <p className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] border-b-2 border-[#111] pb-1.5 mb-2">History</p>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {history.map(h => (
                  <div key={h.id} className="relative shrink-0">
                    <button
                      onClick={() => previewHistory(h)}
                      className={`w-20 h-20 border-2 overflow-hidden transition-all block ${
                        selectedHistoryId === h.id
                          ? 'border-[#111] ring-[3px] ring-[#111] ring-offset-[-3px]'
                          : 'border-[#888] hover:border-[#111]'
                      }`}
                    >
                      <img src={`/${h.resultImageUri}`} alt="Past result" className="w-full h-full object-cover" />
                    </button>
                    <button
                      onClick={() => handleDeleteHistory(h.id)}
                      disabled={deletingHistoryId === h.id}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#111] text-white flex items-center justify-center text-xs font-bold hover:bg-[#444] disabled:opacity-50 transition-colors z-10"
                    >
                      {deletingHistoryId === h.id ? '…' : '×'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t-2 border-[#111] pt-3">
            <Button
              onClick={() => { clearHistoryPreview(); setStep('pick-items') }}
              disabled={!selectedPhotoId}
              className="w-full"
            >
              Select Items →
            </Button>
          </div>
        </>
      )}

      {/* ── Step 2: Pick items / outfits ── */}
      {step === 'pick-items' && (
        <>
          <div className="flex items-center justify-between border-b-2 border-[#111] pb-2">
            <button onClick={() => setStep('pick-photo')} className="text-[9px] font-mono text-[#888] uppercase tracking-[0.06em] hover:text-[#111]">← Photo</button>
            <p className="text-[9px] font-mono uppercase tracking-[0.06em]">Select</p>
            <div className="w-12" />
          </div>

          {/* ITEMS / OUTFITS tabs */}
          <div className="flex border-b-2 border-[#111]">
            {(['items', 'outfits'] as ItemsTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setItemsTab(tab)}
                className={`flex-1 py-2 text-[9px] font-bold font-mono uppercase tracking-[0.08em] transition-colors ${
                  itemsTab === tab ? 'bg-[#111] text-white' : 'text-[#888] hover:text-[#111]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ITEMS tab */}
          {itemsTab === 'items' && (
            loadingItems ? (
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
            )
          )}

          {/* OUTFITS tab */}
          {itemsTab === 'outfits' && (
            loadingOutfits ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : outfits.length === 0 ? (
              <p className="text-center py-10 text-[10px] font-mono text-[#888] uppercase tracking-[0.06em]">No saved outfits</p>
            ) : (
              <div className="flex flex-col gap-2">
                {outfits.map(outfit => (
                  <button
                    key={outfit.id}
                    onClick={() => selectOutfit(outfit)}
                    className="flex items-center gap-3 border-2 border-[#111] p-2 hover:bg-[#f0f0f0] transition-colors text-left w-full"
                  >
                    <div className="shrink-0 w-16 h-16 grid grid-cols-2 gap-[2px] overflow-hidden border border-[#888]">
                      {outfit.items.slice(0, 4).map(item => (
                        <div key={item.id} className="overflow-hidden bg-[#f0f0f0]">
                          <img src={`/${item.imageUri}`} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[11px] font-bold font-mono truncate">{outfit.name}</span>
                      {outfit.occasion && (
                        <span className="text-[8px] font-mono text-[#888] uppercase tracking-[0.06em]">{outfit.occasion}</span>
                      )}
                      <span className="text-[8px] font-mono text-[#888]">{outfit.items.length} items</span>
                    </div>
                  </button>
                ))}
              </div>
            )
          )}

          {/* Selected items preview strip */}
          {selectedItemIds.size > 0 && itemsTab === 'items' && (
            <div className="border-t-2 border-[#111] pt-2">
              <p className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] mb-1.5">{selectedItemIds.size} selected</p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {[...selectedItemIds].map(id => {
                  const item = items.find(i => i.id === id)
                  if (!item) return null
                  return (
                    <div key={id} className="shrink-0 w-12 h-[60px] border-2 border-[#111] overflow-hidden">
                      <img src={`/${item.imageUri}`} alt="" className="h-full w-full object-cover" />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="border-t-2 border-[#111] pt-3">
            <Button onClick={() => setStep('upload-garments')} disabled={selectedItemIds.size === 0} className="w-full">
              Next →
            </Button>
          </div>
        </>
      )}

      {/* ── Step 3: Upload Extras ── */}
      {step === 'upload-garments' && (
        <>
          <div className="flex items-center justify-between border-b-2 border-[#111] pb-2">
            <button onClick={() => setStep('pick-items')} className="text-[9px] font-mono text-[#888] uppercase tracking-[0.06em] hover:text-[#111]">← Items</button>
            <p className="text-[9px] font-mono uppercase tracking-[0.06em]">Extras</p>
            <div className="w-12" />
          </div>

          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#888] p-6 cursor-pointer hover:border-[#111] transition-colors">
            <span className="text-3xl font-bold text-[#888] leading-none">+</span>
            <span className="text-[9px] font-mono text-[#888] uppercase tracking-[0.08em]">Upload garment photos (optional)</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleAddGarments} />
          </label>

          {uploadedGarments.length > 0 && (
            <div className="grid grid-cols-3 gap-[3px]">
              {uploadedGarments.map(g => (
                <div key={g.localId} className="relative aspect-square overflow-hidden border-2 border-[#111]">
                  <img src={g.previewUrl} alt="Garment" className="w-full h-full object-cover" />
                  {g.uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Spinner size={24} />
                    </div>
                  )}
                  {!g.uploading && (
                    <button
                      onClick={() => removeGarment(g.localId)}
                      className="absolute top-1 right-1 w-5 h-5 bg-[#111] text-white flex items-center justify-center text-xs font-bold hover:bg-[#444] transition-colors"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="border-t-2 border-[#111] pt-3">
            <Button
              onClick={handleGenerate}
              disabled={uploadedGarments.some(g => g.uploading)}
              className="w-full"
            >
              Generate Preview ({selectedItemIds.size} item{selectedItemIds.size !== 1 ? 's' : ''}{uploadedGarments.length > 0 ? ` · ${uploadedGarments.length} extra${uploadedGarments.length !== 1 ? 's' : ''}` : ''})
            </Button>
          </div>
        </>
      )}

      {/* ── Step 4: Result ── */}
      {step === 'result' && (
        <>
          <div className="flex items-center justify-between border-b-2 border-[#111] pb-2">
            <button
              onClick={tryAgain}
              disabled={generating}
              className="text-[9px] font-mono text-[#888] uppercase tracking-[0.06em] hover:text-[#111] disabled:opacity-30"
            >
              ← Items
            </button>
            <p className="text-[9px] font-mono uppercase tracking-[0.06em]">Result</p>
            <div className="w-12" />
          </div>

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
              <div className="flex gap-2">
                <Button onClick={() => setSaved(true)} disabled={saved} className="flex-1">
                  {saved ? 'Saved ✓' : 'Save'}
                </Button>
                <Button onClick={tryAgain} variant="secondary" className="flex-1">
                  Try Again
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
