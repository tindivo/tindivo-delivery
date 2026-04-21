import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

const iconButtonVariants = cva(
  'inline-flex items-center justify-center shrink-0 rounded-full transition-colors duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Ghost — transparente con hover naranja muy sutil (estilo mockup ejemplo.html)
        ghost:
          'text-on-surface-variant hover:bg-orange-50/60 hover:text-primary',
        // Subtle — fondo superficial con borde fino
        subtle:
          'bg-surface-container-lowest border border-outline-variant/30 text-on-surface hover:bg-surface-container-low shadow-[0_4px_20px_rgba(171,53,0,0.04)]',
        // Solid — CTA prominente con gradient solar
        solid:
          'bg-solar-gradient text-white solar-glow hover:solar-glow-lg',
        // Danger — para acciones destructivas (cancelar, eliminar)
        danger:
          'text-error hover:bg-error-container/60',
      },
      size: {
        sm: 'h-9 w-9 [&_.material-symbols-outlined]:text-[20px]',
        md: 'h-10 w-10 [&_.material-symbols-outlined]:text-[22px]',
        lg: 'h-12 w-12 [&_.material-symbols-outlined]:text-[24px]',
      },
    },
    defaultVariants: {
      variant: 'ghost',
      size: 'md',
    },
  },
)

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  asChild?: boolean
  'aria-label': string
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(iconButtonVariants({ variant, size }), className)}
        {...props}
      />
    )
  },
)
IconButton.displayName = 'IconButton'

export { iconButtonVariants }
