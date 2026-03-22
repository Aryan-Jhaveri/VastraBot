import type { ReactNode, HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      {...props}
      className={`bg-white rounded-2xl shadow-sm border border-stone-100 ${className}`}
    >
      {children}
    </div>
  )
}
