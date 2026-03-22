import { useState, useMemo } from 'react'
import { useItems } from '../hooks/useItems'
import { ItemCard } from '../components/ItemCard'
import { CategoryFilter } from '../components/CategoryFilter'
import { AddItem } from '../modals/AddItem'
import { ItemDetail } from '../modals/ItemDetail'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import type { Item } from '../api/items'

const PAGE_SIZE = 10

export function Closet() {
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState<Item | null>(null)

  const { items, total, loading, refetch } = useItems({ category: category || undefined, page, limit: PAGE_SIZE })

  // Derive distinct categories from ALL items (no filter) for the chip bar
  const { items: allItems } = useItems({ limit: 1000 })
  const categories = useMemo(
    () => [...new Set(allItems.map(i => i.category))].sort(),
    [allItems],
  )

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function handleCategoryChange(cat: string) {
    setCategory(cat)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-stone-900">
          {total} {total === 1 ? 'item' : 'items'}
        </h1>
        <Button onClick={() => setShowAdd(true)}>+ Add</Button>
      </div>

      <CategoryFilter categories={categories} value={category} onChange={handleCategoryChange} />

      {loading && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {!loading && items.length === 0 && (
        <p className="text-sm text-stone-400 text-center py-10">
          {category ? `No ${category} in your closet yet.` : 'Your closet is empty. Add your first item!'}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {items.map(item => (
          <ItemCard key={item.id} item={item} onClick={() => setSelected(item)} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <Button variant="ghost" onClick={() => setPage(p => p - 1)} disabled={page === 1}>← Prev</Button>
          <span className="text-sm text-stone-500">{page} / {totalPages}</span>
          <Button variant="ghost" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Next →</Button>
        </div>
      )}

      {showAdd && (
        <AddItem
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); void refetch() }}
        />
      )}

      {selected && (
        <ItemDetail
          item={selected}
          onClose={() => setSelected(null)}
          onChanged={() => { setSelected(null); void refetch() }}
        />
      )}
    </div>
  )
}
