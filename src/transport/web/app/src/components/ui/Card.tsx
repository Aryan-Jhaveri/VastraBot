import type { ReactNode, HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div {...props} className={`bg-white border-2 border-[#111] ${className}`}>
      {children}
    </div>
  )
}
