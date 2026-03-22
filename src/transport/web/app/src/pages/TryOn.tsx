import { useState, useEffect } from 'react'
import { useLocation as useRouterLocation } from 'react-router-dom'
import { fetchUserPhotos, uploadUserPhoto } from '../api/userPhotos'
import { fetchItems } from '../api/items'
import { generateTryOn } from '../api/tryon'
import type { UserPhoto } from '../api/userPhotos'
import type { Item } from '../api/items'
import { ItemCard } from '../components/ItemCard'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'

type TryOnStep = 'pick-photo' | 'pick-items' | 'result'

export function TryOn() {
  const routerState = useRouterLocation().state as { itemId?: string } | null
  const [step, setStep] = useState<TryOnStep>('pick-photo')

  const [photos, setPhotos] = useState<UserPhoto[]>([])
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)
  const [loadingPhotos, setLoadingPhotos] = useState(true)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

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
          // Pre-select item if navigated from ItemDetail
          if (routerState?.itemId) {
            setSelectedItemIds(new Set([routerState.itemId]))
          }
        })
        .catch(err => setError(String(err)))
        .finally(() => setLoadingItems(false))
    }
  }, [step])

  async function handleAddPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const photo = await uploadUserPhoto(file)
      setPhotos(prev => [photo, ...prev])
      setSelectedPhotoId(photo.id)
    } catch (err) {
      setError(String(err))
    } finally {
      setUploadingPhoto(false)
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

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <h1 className="font-semibold text-stone-900">Virtual Try-On</h1>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      {/* Step 1: Pick reference photo */}
      {step === 'pick-photo' && (
        <>
          <p className="text-sm text-stone-500">Choose a reference photo of yourself.</p>

          {loadingPhotos ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photos.map(photo => (
                <button
                  key={photo.id}
                  onClick={() => setSelectedPhotoId(photo.id)}
                  className={`relative aspect-[3/4] overflow-hidden rounded-2xl border-2 transition-all ${
                    selectedPhotoId === photo.id
                      ? 'border-stone-900 ring-2 ring-stone-900'
                      : 'border-stone-100'
                  }`}
                >
                  <img src={`/images/${photo.imageUri}`} alt="You" className="w-full h-full object-cover" />
                </button>
              ))}
              <label className={`aspect-[3/4] flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-stone-200 cursor-pointer hover:border-stone-300 ${uploadingPhoto ? 'opacity-50' : ''}`}>
                {uploadingPhoto ? <Spinner size={20} /> : <span className="text-2xl">+</span>}
                <span className="text-xs text-stone-400">Add photo</span>
                <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleAddPhoto} disabled={uploadingPhoto} />
              </label>
            </div>
          )}

          <Button
            onClick={() => setStep('pick-items')}
            disabled={!selectedPhotoId}
            className="w-full"
          >
            Choose Items →
          </Button>
        </>
      )}

      {/* Step 2: Pick items */}
      {step === 'pick-items' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-stone-500">Select items to try on.</p>
            <button onClick={() => setStep('pick-photo')} className="text-sm text-stone-400 hover:text-stone-600">← Back</button>
          </div>

          {loadingItems ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
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

          <Button
            onClick={handleGenerate}
            disabled={selectedItemIds.size === 0}
            className="w-full"
          >
            Generate Try-On ({selectedItemIds.size} item{selectedItemIds.size !== 1 ? 's' : ''})
          </Button>
        </>
      )}

      {/* Step 3: Result */}
      {step === 'result' && (
        <>
          {generating && (
            <div className="flex flex-col items-center gap-4 py-10">
              <Spinner size={40} />
              <p className="text-sm text-stone-500">Generating your look…</p>
            </div>
          )}

          {resultUri && !generating && (
            <>
              <div className="overflow-hidden rounded-2xl bg-stone-50">
                <img src={`/images/${resultUri}`} alt="Try-on result" className="w-full object-contain" />
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
