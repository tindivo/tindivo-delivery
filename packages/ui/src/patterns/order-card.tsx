import { Icon } from '../icons/icon'
import { cn } from '../lib/cn'
import { ColorDot } from './color-dot'
import { StatusChip } from './status-chip'

type Props = {
  shortId: string
  restaurantName: string
  restaurantAccentColor: string
  status:
    | 'waiting_driver'
    | 'heading_to_restaurant'
    | 'waiting_at_restaurant'
    | 'picked_up'
    | 'delivered'
    | 'cancelled'
  orderAmount: number
  paymentLabel: string
  prepTimeMinutes?: number
  driverName?: string | null
  onClick?: () => void
  className?: string
  highlight?: boolean
}

export function OrderCard({
  shortId,
  restaurantName,
  restaurantAccentColor,
  status,
  orderAmount,
  paymentLabel,
  prepTimeMinutes,
  driverName,
  onClick,
  className,
  highlight,
}: Props) {
  const money = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(orderAmount)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group w-full text-left cursor-pointer relative overflow-hidden',
        'rounded-[24px] p-4 flex flex-col gap-3',
        'bg-gradient-to-br from-white to-[#fafaf8]',
        'border border-outline-variant/15',
        'shadow-[0_4px_20px_rgba(171,53,0,0.04)]',
        'transition-all duration-300',
        'hover:-translate-y-0.5 hover:shadow-[0_10px_40px_rgba(0,0,0,0.06)]',
        'active:scale-[0.98] active:translate-y-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        highlight && 'ring-2 ring-primary-container ring-offset-2',
        className,
      )}
    >
      {/* Accent color bar con glow lateral */}
      <span
        aria-hidden="true"
        className="absolute top-0 left-0 bottom-0 w-1.5 rounded-tl-[24px] rounded-bl-[24px]"
        style={{
          backgroundColor: `#${restaurantAccentColor}`,
          boxShadow: `0 0 16px #${restaurantAccentColor}40`,
        }}
      />

      <div className="flex items-start justify-between gap-2 pl-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <ColorDot color={restaurantAccentColor} size={10} label={restaurantName} />
            <span className="font-bold truncate text-on-surface">{restaurantName}</span>
          </div>
          <div className="text-xs text-on-surface-variant font-mono tracking-wider">
            #{shortId}
          </div>
        </div>
        <StatusChip status={status} />
      </div>

      <div className="flex items-end justify-between pl-2">
        <div>
          <div className="bleed-text text-2xl font-black text-on-surface">{money}</div>
          <div className="text-xs text-on-surface-variant mt-1">{paymentLabel}</div>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs">
          {prepTimeMinutes != null && (
            <span className="inline-flex items-center gap-1 text-on-surface-variant">
              <Icon name="schedule" size={14} />
              {prepTimeMinutes} min
            </span>
          )}
          {driverName && (
            <span className="inline-flex items-center gap-1 text-on-surface-variant">
              <Icon name="two_wheeler" size={14} />
              {driverName}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
