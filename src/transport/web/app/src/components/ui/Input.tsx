import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-[9px] font-bold font-mono uppercase tracking-[0.1em] text-[#888]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        {...props}
        className={`border-2 border-[#111] px-3 py-2 text-sm outline-none focus:bg-[#f0f0f0] ${error ? 'border-red-500' : ''} ${className}`}
      />
      {error && <p className="text-[10px] font-mono text-red-500">{error}</p>}
    </div>
  )
}
