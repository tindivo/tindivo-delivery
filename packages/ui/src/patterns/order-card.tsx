import { Icon } from '../icons/icon'
import { cn } from '../lib/cn'
import { type UrgencyTier, computeUrgencyTier } from '../lib/urgency'
import { ColorDot } from './color-dot'
import { StatusChip } from './status-chip'
import { UrgencyBadge } from './urgency-badge'

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
  /**
   * ISO string del momento en que debería estar listo.
   * Si se provee (+ status === 'waiting_driver'), muestra UrgencyBadge en lugar del
   * chip estático de minutos y aplica tier styling.
   */
  estimatedReadyAt?: string | Date
  /**
   * Tick externo para que el countdown se refresque cada 30s.
   * Si se omite, se usa Date.now() al render (no live).
   */
  now?: Date
  /**
   * Si true, la card se ve atenuada y el click queda suprimido.
   * Se usa cuando hay un overdue pendiente — el driver debe atender ese primero.
   */
  disabled?: boolean
}

const TIER_STYLES: Record<
  UrgencyTier,
  { borderColor: string; bgGradient: string; extraClass: string }
> = {
  upcoming: {
    borderColor: 'rgba(16, 185, 129, 0.25)',
    bgGradient: 'linear-gradient(135deg, #ffffff 0%, #f7fdf9 100%)',
    extraClass: '',
  },
  pending: {
    borderColor: 'rgba(234, 179, 8, 0.35)',
    bgGradient: 'linear-gradient(135deg, #ffffff 0%, #fffaf0 100%)',
    extraClass: '',
  },
  overdue: {
    borderColor: 'rgba(186, 26, 26, 0.45)',
    bgGradient: 'linear-gradient(135deg, #fff8f8 0%, #fff0f0 100%)',
    extraClass: 'tindivo-overdue-glow',
  },
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
  estimatedReadyAt,
  now,
  disabled = false,
}: Props) {
  const noCharge = orderAmount === 0
  const money = noCharge
    ? 'No cobrar'
    : new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
      }).format(orderAmount)

  const showUrgency = estimatedReadyAt && status === 'waiting_driver'
  const tier: UrgencyTier | null = showUrgency
    ? computeUrgencyTier(estimatedReadyAt, now ?? new Date())
    : null
  const tierStyle = tier ? TIER_STYLES[tier] : null

  const defaultBg = 'linear-gradient(135deg, #ffffff 0%, #fafaf8 100%)'
  const defaultBorder = 'rgba(225, 191, 181, 0.25)'

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className={cn(
        'group w-full text-left relative overflow-hidden',
        'rounded-[24px] p-4 flex flex-col gap-3',
        'transition-all duration-300',
        !disabled && 'cursor-pointer',
        !disabled && 'hover:-translate-y-0.5 hover:shadow-[0_10px_40px_rgba(0,0,0,0.06)]',
        !disabled && 'active:scale-[0.98] active:translate-y-0',
        disabled && 'cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        highlight && 'ring-2 ring-primary-container ring-offset-2',
        tierStyle?.extraClass,
        className,
      )}
      style={{
        background: tierStyle?.bgGradient ?? defaultBg,
        border: `1px solid ${tierStyle?.borderColor ?? defaultBorder}`,
        boxShadow: tierStyle?.extraClass ? undefined : '0 4px 20px rgba(171, 53, 0, 0.04)',
        opacity: disabled ? 0.55 : 1,
        filter: disabled ? 'saturate(0.6)' : 'none',
      }}
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
          <div className="text-xs text-on-surface-variant font-mono tracking-wider">#{shortId}</div>
        </div>
        <StatusChip status={status} />
      </div>

      <div className="flex items-end justify-between pl-2">
        <div>
          <div
            className="bleed-text text-2xl font-black"
            style={{ color: noCharge ? '#059669' : undefined }}
          >
            {money}
          </div>
          <div className="text-xs text-on-surface-variant mt-1">
            {noCharge ? 'Solo entregar' : paymentLabel}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 text-xs">
          {showUrgency && estimatedReadyAt ? (
            <UrgencyBadge estimatedReadyAt={estimatedReadyAt} now={now} variant="chip" />
          ) : (
            prepTimeMinutes != null && (
              <span className="inline-flex items-center gap-1 text-on-surface-variant">
                <Icon name="schedule" size={14} />
                {prepTimeMinutes} min
              </span>
            )
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
