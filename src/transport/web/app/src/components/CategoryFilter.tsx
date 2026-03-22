interface CategoryFilterProps {
  categories: string[]   // derived from actual DB items
  value: string
  onChange: (category: string) => void
}

export function CategoryFilter({ categories, value, onChange }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      <button
        onClick={() => onChange('')}
        className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          value === '' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
        }`}
      >
        All
      </button>
      {categories.map(cat => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
            value === cat ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}
