interface CategoryFilterProps {
  categories: string[]
  value: string[]
  onChange: (categories: string[]) => void
}

export function CategoryFilter({ categories, value, onChange }: CategoryFilterProps) {
  function toggle(cat: string) {
    if (cat === '') { onChange([]); return }
    const next = value.includes(cat)
      ? value.filter(c => c !== cat)
      : [...value, cat]
    onChange(next)
  }

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      <button
        onClick={() => toggle('')}
        className={`shrink-0 px-3 py-1.5 text-[9px] font-bold font-mono uppercase tracking-[0.08em] border-2 border-[#111] transition-colors ${
          value.length === 0 ? 'bg-[#111] text-white' : 'bg-white text-[#111] hover:bg-[#f0f0f0]'
        }`}
      >
        All
      </button>
      {categories.map(cat => (
        <button
          key={cat}
          onClick={() => toggle(cat)}
          className={`shrink-0 px-3 py-1.5 text-[9px] font-bold font-mono uppercase tracking-[0.08em] border-2 border-[#111] transition-colors capitalize ${
            value.includes(cat) ? 'bg-[#111] text-white' : 'bg-white text-[#111] hover:bg-[#f0f0f0]'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}
