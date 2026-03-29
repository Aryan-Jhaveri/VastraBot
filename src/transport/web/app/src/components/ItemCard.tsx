import type { Item } from '../api/items'

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
      className={`relative overflow-hidden border-2 text-left transition-all ${
        selected ? 'border-[#111] ring-2 ring-[#111] ring-offset-1' : 'border-[#111]'
      } bg-white`}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-[#f0f0f0] border-b-2 border-[#111]">
        <img
          src={`/${item.imageUri}`}
          alt={item.subcategory ?? item.category}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="p-1.5">
        <p className="truncate text-[8px] font-bold font-mono uppercase tracking-[0.04em] text-[#111]">
          {item.subcategory ?? item.category}
        </p>
        {item.primaryColor && (
          <p className="truncate text-[7px] font-mono text-[#888] capitalize">{item.primaryColor}</p>
        )}
      </div>
      {selectable && selected && (
        <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#111]">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </button>
  )
}
