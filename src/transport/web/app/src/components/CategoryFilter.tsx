interface CategoryFilterProps {
  categories: string[]
  value: string
  onChange: (category: string) => void
}

export function CategoryFilter({ categories, value, onChange }: CategoryFilterProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      <button
        onClick={() => onChange('')}
        className={`shrink-0 px-3 py-1.5 text-[9px] font-bold font-mono uppercase tracking-[0.08em] border-2 border-[#111] transition-colors ${
          value === '' ? 'bg-[#111] text-white' : 'bg-white text-[#111] hover:bg-[#f0f0f0]'
        }`}
      >
        All
      </button>
      {categories.map(cat => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`shrink-0 px-3 py-1.5 text-[9px] font-bold font-mono uppercase tracking-[0.08em] border-2 border-[#111] transition-colors capitalize ${
            value === cat ? 'bg-[#111] text-white' : 'bg-white text-[#111] hover:bg-[#f0f0f0]'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}
