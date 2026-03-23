import { type ButtonHTMLAttributes } from 'react'
import { Spinner } from './Spinner'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  loading?: boolean
}

const variantClass: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-[#111] text-white border-2 border-[#111] hover:bg-[#333] disabled:opacity-40',
  secondary: 'bg-white text-[#111] border-2 border-[#111] hover:bg-[#f0f0f0] disabled:opacity-40',
  ghost: 'text-[#888] hover:text-[#111] disabled:opacity-40',
  danger: 'bg-[#111] text-white border-2 border-[#111] hover:opacity-80 disabled:opacity-40',
}

export function Button({ variant = 'primary', loading, children, className = '', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[10px] font-bold font-mono uppercase tracking-[0.08em] transition-colors ${variantClass[variant]} ${className}`}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  )
}
