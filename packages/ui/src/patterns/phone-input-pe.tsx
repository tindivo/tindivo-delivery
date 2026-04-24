import { type InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '../lib/cn'
import { Input } from '../primitives/input'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'pattern'>

export const PhoneInputPe = forwardRef<HTMLInputElement, Props>(({ className, ...props }, ref) => {
  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-medium pointer-events-none">
        +51
      </span>
      <Input
        ref={ref}
        type="tel"
        inputMode="tel"
        pattern="^9\d{8}$"
        maxLength={9}
        placeholder="987654321"
        className={cn('pl-14 tracking-wider font-mono', className)}
        {...props}
      />
    </div>
  )
})
PhoneInputPe.displayName = 'PhoneInputPe'
