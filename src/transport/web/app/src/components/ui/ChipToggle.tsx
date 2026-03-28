export function ChipToggle({ options, selected, onChange }: {
  options: readonly string[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  function toggle(opt: string) {
    onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt])
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`px-2 py-0.5 text-[8px] font-bold font-mono uppercase tracking-[0.04em] border-2 transition-colors capitalize ${
            selected.includes(opt)
              ? 'bg-[#111] text-white border-[#111]'
              : 'bg-white text-[#111] border-[#111] hover:bg-[#f0f0f0]'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}
