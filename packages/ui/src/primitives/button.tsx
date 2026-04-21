import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-bold tracking-wide transition-all duration-300 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap',
  {
    variants: {
      variant: {
        primary:
          'bg-primary-container text-on-primary shadow-[0_4px_20px_rgba(171,53,0,0.2)] hover:shadow-[0_10px_40px_rgba(255,107,53,0.3)]',
        secondary:
          'bg-surface-container-lowest text-on-surface border border-outline-variant/20 shadow-[0_4px_20px_rgba(171,53,0,0.04)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.06)]',
        ghost:
          'bg-transparent text-on-surface hover:bg-surface-container-low',
        destructive:
          'bg-error text-on-error shadow-[0_4px_20px_rgba(186,26,26,0.2)] hover:shadow-[0_10px_40px_rgba(186,26,26,0.3)]',
        success:
          'bg-state-green text-white shadow-[0_4px_20px_rgba(5,150,105,0.2)] hover:shadow-[0_10px_40px_rgba(5,150,105,0.3)]',
      },
      size: {
        sm: 'h-10 px-4 text-sm rounded-lg',
        md: 'h-12 px-6 text-base rounded-xl',
        lg: 'h-14 px-8 text-lg rounded-xl',
        xl: 'h-16 px-10 text-xl rounded-xl',
        icon: 'h-10 w-10 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  },
)
Button.displayName = 'Button'

export { buttonVariants }
