import { type ButtonHTMLAttributes } from 'react'
import { Spinner } from './Spinner'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  loading?: boolean
}

const variantClass: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-stone-900 text-white hover:bg-stone-700 disabled:bg-stone-400',
  secondary: 'bg-stone-100 text-stone-900 hover:bg-stone-200 disabled:text-stone-400',
  ghost: 'text-stone-600 hover:bg-stone-100 disabled:text-stone-300',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
}

export function Button({ variant = 'primary', loading, children, className = '', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${variantClass[variant]} ${className}`}
    >
      {loading && <Spinner size={16} />}
      {children}
    </button>
  )
}
