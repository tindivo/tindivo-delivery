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
        type="text"
        inputMode="decimal"
        pattern="[0-9]*[.,]?[0-9]*"
        autoComplete="off"
        className={cn('pl-10 text-lg font-semibold placeholder:text-sm placeholder:font-medium', className)}
        {...props}
      />
    </div>
  )
})
MoneyInput.displayName = 'MoneyInput'
