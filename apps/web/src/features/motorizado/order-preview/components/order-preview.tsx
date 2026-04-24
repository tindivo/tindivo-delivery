'use client'
import { useDriverCapacity } from '@/features/motorizado/active-order/hooks/use-driver-capacity'
import { useAcceptOrder } from '@/features/motorizado/available-orders/hooks/use-accept-order'
import { useNow } from '@/shared/hooks/use-now'
import { ApiError } from '@tindivo/api-client'
import {
  BottomActionBar,
  Button,
  ColorDot,
  ElapsedTimer,
  GlassTopBar,
  Icon,
  IconButton,
  Skeleton,
  UrgencyBadge,
  computeUrgencyTier,
} from '@tindivo/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useOrderPreview } from '../hooks/use-order-preview'

type Props = { orderId: string }

function paymentLabel(status: string): string {
  switch (status) {
    case 'prepaid':
      return 'Prepagado'
    case 'pending_yape':
      return 'Cobrar Yape al entregar'
    case 'pending_cash':
      return 'Cobrar efectivo al entregar'
    default:
      return status
  }
}

const PREP_LABEL: Record<string, string> = {
  fast: 'Rápido (~10 min)',
  normal: 'Normal (~15 min)',
  slow: 'Lento (~20 min)',
}

/**
 * Preview de un pedido disponible antes de aceptarlo. El driver puede ver
 * todos los detalles (restaurante, monto, tiempo de espera, urgencia) y
 * decidir con un CTA explícito. Antes se auto-aceptaba al click — UX mala.
 */
export function OrderPreview({ orderId }: Props) {
  const router = useRouter()
  const { data, isLoading } = useOrderPreview(orderId)
  const accept = useAcceptOrder()
  const { activeCount, max, isFull } = useDriverCapacity()
  const now = useNow(1_000)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function handleAccept() {
    if (!data) return
    setErrorMsg(null)
    accept.mutate(data.id, {
      onSuccess: () => router.replace(`/motorizado/pedidos/${data.id}`),
      onError: (err) => {
        if (err instanceof ApiError && err.problem.code === 'DRIVER_CAPACITY_EXCEEDED') {
          setErrorMsg(`Estás al límite (${max}/${max}). Completa una entrega para recibir nuevos.`)
        } else if (err instanceof ApiError && err.problem.code === 'ORDER_ALREADY_ACCEPTED') {
          setErrorMsg('Este pedido ya fue tomado por otro motorizado.')
        } else {
          setErrorMsg('No pudimos aceptar el pedido. Intenta de nuevo.')
        }
      },
    })
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen">
        <GlassTopBar
          title="PEDIDO"
          subtitle="Revisar antes de aceptar"
          left={
            <IconButton variant="ghost" onClick={() => router.back()} aria-label="Volver">
              <Icon name="arrow_back" />
            </IconButton>
          }
        />
        <main className="pt-24 px-4 max-w-md mx-auto space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-32" />
        </main>
      </div>
    )
  }

  const order = data
  const restaurant = order.restaurants ?? {}
  const accent = restaurant.accent_color ?? 'ab3500'
  const tier = order.estimated_ready_at ? computeUrgencyTier(order.estimated_ready_at, now) : null
  const noCharge = Number(order.order_amount) === 0

  return (
    <div
      className="min-h-screen"
      style={{ paddingBottom: 'calc(160px + env(safe-area-inset-bottom))' }}
    >
      <GlassTopBar
        title="PEDIDO"
        subtitle="Revisar antes de aceptar"
        left={
          <IconButton variant="ghost" onClick={() => router.back()} aria-label="Volver">
            <Icon name="arrow_back" />
          </IconButton>
        }
      />

      <main className="pt-24 px-4 max-w-md mx-auto space-y-4">
        {/* Card restaurante */}
        <section
          className="relative overflow-hidden rounded-[24px] p-5"
          style={{
            background: `linear-gradient(135deg, #${accent} 0%, #${accent}dd 100%)`,
            color: '#ffffff',
            boxShadow: `0 16px 40px -12px #${accent}80`,
          }}
        >
          <div
            aria-hidden="true"
            className="absolute -top-10 -right-10 w-44 h-44 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.22) 0%, transparent 60%)',
            }}
          />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1.5">
              <ColorDot color={accent} size={10} />
              <span className="text-[10px] font-bold tracking-[0.22em] uppercase opacity-85">
                Recoger en
              </span>
            </div>
            <h1 className="bleed-text font-black text-2xl" style={{ letterSpacing: '-0.02em' }}>
              {restaurant.name ?? 'Restaurante'}
            </h1>
            <div className="mt-1 flex items-center gap-2 text-xs opacity-90">
              <Icon name="location_on" size={14} filled />
              <span className="truncate">{restaurant.address ?? 'Dirección no disponible'}</span>
            </div>
            <div className="mt-1 text-xs opacity-85 font-mono">#{order.short_id}</div>
          </div>
        </section>

        {/* Cronómetros */}
        <section className="flex items-stretch gap-2">
          {order.created_at && (
            <ElapsedTimer createdAt={order.created_at} now={now} withLabel className="flex-1" />
          )}
          {order.estimated_ready_at && tier && (
            <UrgencyBadge
              estimatedReadyAt={order.estimated_ready_at}
              now={now}
              variant="hero"
              className="flex-1"
            />
          )}
        </section>

        {/* Monto + payment */}
        <section className="bg-surface-container-lowest rounded-[24px] p-5 border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)]">
          <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-on-surface-variant mb-3">
            Cobro al cliente
          </div>
          {noCharge ? (
            <div className="flex items-center gap-3" style={{ color: '#065F46' }}>
              <span
                className="inline-flex items-center justify-center"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#ffffff',
                }}
              >
                <Icon name="verified" size={22} filled />
              </span>
              <div>
                <div className="font-black text-lg">No cobrar</div>
                <div className="text-xs text-on-surface-variant">
                  Solo entregar — ya pagó en el restaurante
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="bleed-text font-black text-3xl text-on-surface">
                  S/ {Number(order.order_amount).toFixed(2)}
                </div>
                <div className="text-xs text-on-surface-variant mt-1">
                  {paymentLabel(order.payment_status)}
                </div>
              </div>
              <Icon
                name={
                  order.payment_status === 'pending_yape'
                    ? 'qr_code_2'
                    : order.payment_status === 'pending_cash'
                      ? 'payments'
                      : 'verified'
                }
                size={32}
                className="text-on-surface-variant/40"
                filled
              />
            </div>
          )}
        </section>

        {/* Info secundaria */}
        <section className="bg-surface-container-lowest rounded-[24px] p-5 border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)] space-y-3">
          <div className="flex items-center gap-3">
            <Icon name="schedule" size={18} className="text-on-surface-variant" />
            <div className="text-sm">
              <span className="text-on-surface-variant">Preparación: </span>
              <span className="font-semibold text-on-surface">
                {PREP_LABEL[order.prep_time_option] ?? order.prep_time_option}
              </span>
            </div>
          </div>
          {restaurant.phone && (
            <a
              href={`tel:+51${restaurant.phone}`}
              className="inline-flex items-center gap-2 text-primary-container font-semibold text-sm"
            >
              <Icon name="call" size={16} />
              Llamar al restaurante
            </a>
          )}
        </section>

        {tier === 'overdue' && (
          <div
            role="alert"
            className="rounded-[20px] p-4 tindivo-overdue-glow"
            style={{
              background: 'linear-gradient(135deg, #991B1B 0%, #BA1A1A 100%)',
              color: '#ffffff',
            }}
          >
            <div className="flex items-center gap-3">
              <Icon name="priority_high" size={22} filled />
              <div>
                <div className="text-[10px] font-bold tracking-[0.22em] uppercase opacity-85">
                  Urgente
                </div>
                <div className="font-bold text-sm">
                  Este pedido ya se pasó del tiempo — es prioridad
                </div>
              </div>
            </div>
          </div>
        )}

        {isFull && (
          <div
            role="alert"
            className="rounded-[20px] p-4"
            style={{
              background: 'rgba(186, 26, 26, 0.14)',
              color: '#991B1B',
              border: '1px solid rgba(186, 26, 26, 0.35)',
            }}
          >
            <div className="flex items-center gap-3">
              <Icon name="block" size={22} filled />
              <div>
                <div className="text-[10px] font-bold tracking-[0.22em] uppercase opacity-85">
                  Capacidad llena
                </div>
                <div className="font-bold text-sm">
                  Tienes {activeCount}/{max} pedidos activos. Completa una entrega para recibir
                  nuevos.
                </div>
              </div>
            </div>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="rounded-[20px] p-4"
            style={{
              background: 'rgba(186, 26, 26, 0.14)',
              color: '#991B1B',
              border: '1px solid rgba(186, 26, 26, 0.35)',
            }}
          >
            <div className="flex items-center gap-3">
              <Icon name="error" size={22} filled />
              <div className="font-semibold text-sm">{errorMsg}</div>
            </div>
          </div>
        )}
      </main>

      <BottomActionBar>
        <div className="flex flex-col gap-2.5">
          <Button
            size="lg"
            className="w-full"
            disabled={accept.isPending || isFull}
            onClick={handleAccept}
          >
            <Icon name={isFull ? 'block' : 'check_circle'} filled />
            {isFull
              ? `Al límite (${max}/${max})`
              : accept.isPending
                ? 'Aceptando...'
                : 'Aceptar pedido'}
          </Button>
          <Button
            variant="secondary"
            size="md"
            className="w-full"
            disabled={accept.isPending}
            onClick={() => router.back()}
          >
            <Icon name="arrow_back" />
            Volver sin aceptar
          </Button>
        </div>
      </BottomActionBar>
    </div>
  )
}
