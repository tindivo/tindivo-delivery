import { cva, type VariantProps } from 'class-variance-authority'
import { type HTMLAttributes } from 'react'
import { cn } from '../lib/cn'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide',
  {
    variants: {
      variant: {
        default: 'bg-surface-container text-on-surface',
        primary: 'bg-primary-fixed text-on-primary-fixed',
        success: 'bg-emerald-100 text-emerald-800',
        warning: 'bg-amber-100 text-amber-900',
        danger: 'bg-error-container text-on-error-container',
        info: 'bg-blue-100 text-blue-900',
        outline: 'border border-outline-variant text-on-surface-variant bg-transparent',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
