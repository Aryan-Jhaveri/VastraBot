import type { Item } from '../api/items'
import { Badge } from './ui/Badge'

interface ItemCardProps {
  item: Item
  onClick?: () => void
  selected?: boolean
  selectable?: boolean
}

export function ItemCard({ item, onClick, selected, selectable }: ItemCardProps) {
  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border text-left transition-all ${
        selected
          ? 'border-stone-900 ring-2 ring-stone-900'
          : 'border-stone-100 hover:border-stone-300'
      } bg-white`}
    >
      <div className="aspect-[4/5] overflow-hidden bg-stone-50">
        <img
          src={`/${item.imageUri}`}
          alt={item.subcategory ?? item.category}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="p-2">
        <p className="truncate text-xs font-medium capitalize text-stone-800">
          {item.subcategory ?? item.category}
        </p>
        {item.primaryColor && (
          <p className="truncate text-xs text-stone-400 capitalize">{item.primaryColor}</p>
        )}
      </div>
      {selectable && selected && (
        <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-stone-900">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </button>
  )
}
