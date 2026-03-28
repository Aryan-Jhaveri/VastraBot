interface FilterDropdownProps {
  label: string
  options: string[]
  value: string
  onChange: (v: string) => void
}

export function FilterDropdown({ label, options, value, onChange }: FilterDropdownProps) {
  const id = `filter-${label.toLowerCase()}`
  return (
    <div className="flex flex-col gap-0.5 flex-1 min-w-[80px]">
      <label htmlFor={id} className="text-[8px] font-mono text-[#888] uppercase tracking-[0.1em]">{label}</label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full border-2 border-[#111] px-2 py-1.5 pr-6 text-[9px] font-mono uppercase tracking-[0.06em] bg-white appearance-none outline-none focus:bg-[#f0f0f0] cursor-pointer"
        >
          <option value="">All</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
          <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
            <path d="M1 1L4 4L7 1" stroke="#111" strokeWidth="1.5" strokeLinecap="square"/>
          </svg>
        </div>
      </div>
    </div>
  )
}
