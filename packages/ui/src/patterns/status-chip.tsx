import { cva } from 'class-variance-authority'
import { Icon } from '../icons/icon'
import { cn } from '../lib/cn'

type OrderStatus =
  | 'waiting_driver'
  | 'heading_to_restaurant'
  | 'waiting_at_restaurant'
  | 'picked_up'
  | 'delivered'
  | 'cancelled'

const statusStyles: Record<
  OrderStatus,
  { label: string; icon: string; variant: 'red' | 'yellow' | 'orange' | 'darkYellow' | 'green' | 'gray' }
> = {
  waiting_driver: { label: 'Esperando motorizado', icon: 'pending', variant: 'red' },
  heading_to_restaurant: { label: 'En camino al local', icon: 'directions_bike', variant: 'yellow' },
  waiting_at_restaurant: { label: 'Esperando pedido', icon: 'hourglass_top', variant: 'orange' },
  picked_up: { label: 'En entrega', icon: 'delivery_dining', variant: 'darkYellow' },
  delivered: { label: 'Entregado', icon: 'check_circle', variant: 'green' },
  cancelled: { label: 'Cancelado', icon: 'cancel', variant: 'gray' },
}

const chipVariants = cva(
  'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide',
  {
    variants: {
      variant: {
        red: 'bg-error-container text-on-error-container',
        yellow: 'bg-amber-100 text-amber-900',
        orange: 'bg-tertiary-container text-on-tertiary',
        darkYellow: 'bg-amber-200 text-amber-900',
        green: 'bg-emerald-100 text-emerald-800',
        gray: 'bg-surface-container text-on-surface-variant',
      },
    },
  },
)

type Props = {
  status: OrderStatus
  className?: string
}

export function StatusChip({ status, className }: Props) {
  const { label, icon, variant } = statusStyles[status]
  return (
    <span className={cn(chipVariants({ variant }), className)}>
      <Icon name={icon} size={16} filled={variant === 'green'} />
      {label}
    </span>
  )
}
