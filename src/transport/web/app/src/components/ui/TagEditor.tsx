import { useState } from 'react'

interface TagEditorProps {
  tags: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  className?: string
}

export function TagEditor({ tags, onChange, placeholder = 'Add tag, press Enter', className }: TagEditorProps) {
  const [input, setInput] = useState('')

  function addTag(raw: string) {
    const t = raw.trim().toLowerCase()
    if (!t || tags.includes(t)) { setInput(''); return }
    onChange([...tags, t])
    setInput('')
  }

  function removeTag(t: string) {
    onChange(tags.filter(x => x !== t))
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map(t => (
          <span key={t} className="flex items-center gap-1 border-2 border-[#111] px-2 py-0.5 text-[9px] font-mono uppercase tracking-[0.06em]">
            {t}
            <button
              type="button"
              onClick={() => removeTag(t)}
              className="text-[#888] hover:text-[#111] leading-none font-bold"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            addTag(input)
          }
        }}
        onBlur={() => { if (input.trim()) addTag(input) }}
        placeholder={placeholder}
        className="w-full border-2 border-[#111] px-3 py-1.5 text-[9px] font-mono outline-none focus:bg-[#f0f0f0] placeholder:text-[#888] placeholder:normal-case"
      />
    </div>
  )
}
