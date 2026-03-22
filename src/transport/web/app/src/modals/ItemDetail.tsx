import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { markWorn, deleteItem, updateItem } from '../api/items'
import type { Item } from '../api/items'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

interface ItemDetailProps {
  item: Item
  onClose: () => void
  onChanged: () => void
}

function parseJSON<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T } catch { return fallback }
}

export function ItemDetail({ item, onClose, onChanged }: ItemDetailProps) {
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const [marking, setMarking] = useState(false)
  const [editing, setEditing] = useState(false)
  const [brand, setBrand] = useState(item.brand ?? '')
  const [size, setSize] = useState(item.size ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const colors = parseJSON<string[]>(item.colors, [])
  const careInstructions = parseJSON<string[]>(item.careInstructions, [])
  const seasons = parseJSON<string[]>(item.season, [])
  const tags = parseJSON<string[]>(item.tags, [])

  async function handleMarkWorn() {
    setMarking(true)
    try {
      await markWorn(item.id)
      onChanged()
    } catch (err) {
      setError(String(err))
    } finally {
      setMarking(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteItem(item.id)
      onClose()
      onChanged()
    } catch (err) {
      setError(String(err))
      setDeleting(false)
    }
  }

  async function handleSaveEdit() {
    setSaving(true)
    try {
      await updateItem(item.id, { brand: brand || undefined, size: size || undefined })
      onChanged()
      setEditing(false)
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
          <h2 className="font-semibold text-stone-900 capitalize">
            {item.subcategory ?? item.category}
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl leading-none">×</button>
        </div>

        <div className="flex flex-col gap-4 p-4">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</div>
          )}

          <div className="aspect-[4/5] overflow-hidden rounded-xl bg-stone-50">
            <img
              src={`/images/${item.imageUri}`}
              alt={item.subcategory ?? item.category}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="text-stone-400">Category</div>
            <div className="capitalize text-stone-700">{item.category}</div>
            {item.primaryColor && (
              <>
                <div className="text-stone-400">Color</div>
                <div className="capitalize text-stone-700">{item.primaryColor}</div>
              </>
            )}
            {item.material && (
              <>
                <div className="text-stone-400">Material</div>
                <div className="text-stone-700">{item.material}</div>
              </>
            )}
            {seasons.length > 0 && (
              <>
                <div className="text-stone-400">Season</div>
                <div className="capitalize text-stone-700">{seasons.join(', ')}</div>
              </>
            )}
            <div className="text-stone-400">Worn</div>
            <div className="text-stone-700">{item.timesWorn}×</div>
          </div>

          {!editing && (item.brand || item.size) && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {item.brand && (
                <>
                  <div className="text-stone-400">Brand</div>
                  <div className="text-stone-700">{item.brand}</div>
                </>
              )}
              {item.size && (
                <>
                  <div className="text-stone-400">Size</div>
                  <div className="text-stone-700">{item.size}</div>
                </>
              )}
            </div>
          )}

          {editing && (
            <div className="flex flex-col gap-3">
              <Input label="Brand" value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Nike" />
              <Input label="Size" value={size} onChange={e => setSize(e.target.value)} placeholder="e.g. M" />
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setEditing(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleSaveEdit} loading={saving} className="flex-1">Save</Button>
              </div>
            </div>
          )}

          {careInstructions.length > 0 && (
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Care</p>
              <ul className="text-sm text-stone-600 space-y-0.5">
                {careInstructions.map((c, i) => <li key={i}>• {c}</li>)}
              </ul>
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map(tag => (
                <span key={tag} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">{tag}</span>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2 border-t border-stone-100">
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleMarkWorn} loading={marking} className="flex-1">
                Mark Worn
              </Button>
              <Button variant="secondary" onClick={() => { onClose(); navigate('/tryon', { state: { itemId: item.id } }) }} className="flex-1">
                Try On
              </Button>
            </div>
            {!editing && (
              <Button variant="ghost" onClick={() => setEditing(true)} className="w-full">
                Edit
              </Button>
            )}
            {confirmDelete ? (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setConfirmDelete(false)} className="flex-1">Keep it</Button>
                <Button variant="danger" onClick={handleDelete} loading={deleting} className="flex-1">Delete</Button>
              </div>
            ) : (
              <Button variant="ghost" onClick={() => setConfirmDelete(true)} className="w-full text-red-500">
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
