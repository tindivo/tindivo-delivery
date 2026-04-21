import { forwardRef, type InputHTMLAttributes } from 'react'
import { Input } from '../primitives/input'
import { cn } from '../lib/cn'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export const MoneyInput = forwardRef<HTMLInputElement, Props>(({ className, ...props }, ref) => {
  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-medium pointer-events-none">
        S/
      </span>
      <Input
        ref={ref}
        type="number"
        inputMode="decimal"
        step="0.10"
        min={0}
        className={cn('pl-10 text-lg font-semibold', className)}
        {...props}
      />
    </div>
  )
})
MoneyInput.displayName = 'MoneyInput'
