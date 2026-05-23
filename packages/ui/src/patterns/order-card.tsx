'use client'
import { useEffect, useState } from 'react'
import { Icon } from '../icons/icon'
import { cn } from '../lib/cn'
import { type UrgencyTier, computeUrgencyTier } from '../lib/urgency'
import { ColorDot } from './color-dot'
import { StatusChip } from './status-chip'
import { UrgencyBadge } from './urgency-badge'

/**
 * Mantiene un `now` autónomo (1s) si el padre no propaga uno. Los call sites
 * que SÍ pasan `now` lo reciben directo y el interval interno se desactiva
 * para evitar timers duplicados.
 */
function useEffectiveNow(externalNow: Date | undefined, enabled: boolean): Date {
  const [internal, setInternal] = useState<Date>(() => new Date())
  useEffect(() => {
    if (externalNow || !enabled) return undefined
    const id = setInterval(() => setInternal(new Date()), 1_000)
    return () => clearInterval(id)
  }, [externalNow, enabled])
  return externalNow ?? internal
}

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
   * Si se provee, muestra UrgencyBadge live con countdown mm:ss en lugar
   * del chip estático de minutos. El caller decide cuándo activarlo (driver
   * lo pasa siempre; restaurante solo durante fases activas pre-entrega).
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
  /**
   * Si true, intercambia la jerarquía visual del header: el código del pedido
   * (#shortId) se muestra prominente y el nombre del restaurante secundario.
   * Útil en el rol restaurante donde el dueño ya sabe el nombre del local pero
   * necesita identificar pedidos por su código rápido.
   */
  prominentCode?: boolean
  /**
   * Nombre del cliente registrado por el restaurante al crear el pedido.
   * Cuando está presente, reemplaza al `#shortId` como label principal del
   * card y el código pasa a posición secundaria (más intuitivo para el ojo
   * humano). Si es null/undefined/vacío, se mantiene el comportamiento
   * basado en `prominentCode`.
   */
  clientName?: string | null
  /**
   * Dirección o referencia del destino para mostrar como subtítulo bajo el
   * nombre del cliente cuando `driverLayout` está activo. Si el campo legacy
   * `delivery_reference` es null se puede pasar `delivery_address` como
   * fallback — la card no distingue origen.
   */
  deliveryReference?: string | null
  /**
   * Activa el layout específico de la app del motorizado: nombre del cliente
   * prominente + dirección/referencia debajo, restaurante como label pequeño
   * arriba, y el código del pedido (#shortId) NO se muestra. Cuando es false
   * (default), se mantiene el comportamiento previo (que usa `prominentCode`,
   * `clientName` y el código según rol). Admin y restaurant-history quedan
   * intactos al no pasar esta prop.
   */
  driverLayout?: boolean
  /**
   * Si true, el pedido está en la cola "Urgente" (post-timeout o post-rechazo).
   * Fuerza styling rojo + glow + badge "URGENTE" prominente, sin importar el
   * tier calculado por estimated_ready_at. Solo aplica si status='waiting_driver'.
   */
  isUrgent?: boolean
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
  prominentCode = false,
  clientName,
  deliveryReference,
  driverLayout = false,
  isUrgent = false,
}: Props) {
  const displayLabel = clientName?.trim() || null
  const displayReference = deliveryReference?.trim() || null
  const noCharge = orderAmount === 0
  const money = noCharge
    ? 'No cobrar'
    : new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
      }).format(orderAmount)

  const showUrgency = Boolean(estimatedReadyAt)
  const effectiveNow = useEffectiveNow(now, showUrgency)
  const computedTier: UrgencyTier | null = showUrgency
    ? computeUrgencyTier(estimatedReadyAt as string | Date, effectiveNow)
    : null
  // Cola "Urgente" (post-timeout o post-rechazo) fuerza el tier visual a
  // overdue independientemente del estimated_ready_at — el pedido es
  // urgente por estar en la cola, no por el countdown.
  const tier: UrgencyTier | null =
    isUrgent && status === 'waiting_driver' ? 'overdue' : computedTier
  // El styling de tier (borde rojo, glow) solo aplica cuando el pedido aún
  // no tiene driver — para evitar gritar "urgente" en cards ya en ruta.
  const applyTierStyle = tier && status === 'waiting_driver'
  const tierStyle = applyTierStyle ? TIER_STYLES[tier] : null

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
          {driverLayout ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <ColorDot color={restaurantAccentColor} size={10} label={restaurantName} />
                <span className="text-[10px] font-bold tracking-wider uppercase text-on-surface-variant truncate">
                  {restaurantName}
                </span>
              </div>
              <div className="font-black text-on-surface text-lg leading-tight truncate">
                {displayLabel ?? restaurantName}
              </div>
              {displayReference && (
                <div className="text-xs text-on-surface-variant leading-snug mt-0.5 line-clamp-2">
                  {displayReference}
                </div>
              )}
            </>
          ) : displayLabel ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <ColorDot color={restaurantAccentColor} size={10} label={restaurantName} />
                <span className="font-black truncate text-on-surface">{displayLabel}</span>
              </div>
              <div className="text-xs text-on-surface-variant font-mono tracking-wider truncate">
                #{shortId} · {restaurantName}
              </div>
            </>
          ) : prominentCode ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <ColorDot color={restaurantAccentColor} size={10} label={restaurantName} />
                <span className="font-black truncate text-on-surface font-mono tracking-wider">
                  #{shortId}
                </span>
              </div>
              <div className="text-xs text-on-surface-variant truncate">{restaurantName}</div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <ColorDot color={restaurantAccentColor} size={10} label={restaurantName} />
                <span className="font-bold truncate text-on-surface">{restaurantName}</span>
              </div>
              <div className="text-xs text-on-surface-variant font-mono tracking-wider">
                #{shortId}
              </div>
            </>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {isUrgent && status === 'waiting_driver' && (
            <span
              aria-label="Pedido urgente"
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black tracking-wider"
              style={{
                background: 'linear-gradient(135deg, #991B1B 0%, #BA1A1A 100%)',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(186, 26, 26, 0.35)',
              }}
            >
              <Icon name="priority_high" size={12} filled />
              URGENTE
            </span>
          )}
          <StatusChip status={status} />
        </div>
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
            <UrgencyBadge estimatedReadyAt={estimatedReadyAt} now={effectiveNow} variant="chip" />
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
