import { useState } from 'react'

interface InlineFieldProps {
  label: string
  value: string | null | undefined
  onSave: (next: string) => Promise<void> | void
  placeholder?: string
  multiline?: boolean
  valueClassName?: string
}

export function InlineField({ label, value, onSave, placeholder, multiline, valueClassName }: InlineFieldProps) {
  const [editing, setEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')

  function startEdit() {
    setInputValue(value ?? '')
    setEditing(true)
  }

  function handleSave() {
    setEditing(false)
    void onSave(inputValue)
  }

  return (
    <div>
      <p className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] border-b-2 border-[#111] pb-1.5 mb-2">{label}</p>
      {editing ? (
        <div className="flex gap-2">
          {multiline ? (
            <textarea
              autoFocus
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onBlur={handleSave}
              placeholder={placeholder}
              rows={3}
              className="flex-1 border-2 border-[#111] px-3 py-1.5 text-[10px] font-mono outline-none focus:bg-[#f0f0f0] resize-none placeholder:text-[#888] placeholder:normal-case"
            />
          ) : (
            <input
              autoFocus
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder={placeholder}
              className="flex-1 border-2 border-[#111] px-3 py-1.5 text-sm font-mono outline-none focus:bg-[#f0f0f0]"
            />
          )}
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={handleSave}
            className="shrink-0 self-start border-2 border-[#111] px-3 py-1.5 text-[9px] font-bold font-mono uppercase tracking-[0.08em] hover:bg-[#f0f0f0] transition-colors"
          >
            Save
          </button>
        </div>
      ) : (
        <button type="button" onClick={startEdit} className="flex items-center gap-2 group">
          <span className={valueClassName ?? 'text-sm font-mono capitalize'}>
            {value || <span className="text-[#888]">—</span>}
          </span>
          <span className="text-[8px] font-mono text-[#888] uppercase tracking-[0.06em] group-hover:text-[#111]">✎</span>
        </button>
      )}
    </div>
  )
}
