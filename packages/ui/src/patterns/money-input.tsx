import { type InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '../lib/cn'
import { Input } from '../primitives/input'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export const MoneyInput = forwardRef<HTMLInputElement, Props>(({ className, ...props }, ref) => {
  return (
    <div className="relative flex items-center">
      <span className="absolute left-4 text-on-surface-variant font-semibold pointer-events-none select-none text-base">
        S/.
      </span>
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        pattern="[0-9]*[.,]?[0-9]*"
        autoComplete="off"
        className={cn(
          'pl-12 text-lg font-semibold placeholder:text-sm placeholder:font-medium',
          className,
        )}
        {...props}
      />
    </div>
  )
})
MoneyInput.displayName = 'MoneyInput'
