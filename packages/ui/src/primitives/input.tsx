import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

export type InputProps = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'flex h-12 w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-4 py-2',
          'text-base text-on-surface placeholder:text-on-surface-variant/60',
          'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-colors duration-200',
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'
