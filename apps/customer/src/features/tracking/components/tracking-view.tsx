'use client'
import type { Tracking } from '@tindivo/contracts'
import { ColorDot, GlassTopBar, HeroBadge, Icon, Timeline, type TimelineStep } from '@tindivo/ui'
import { motion } from 'motion/react'
import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { useRealtimeTracking } from '../hooks/use-realtime-tracking'

// Leaflet toca `window` en su top-level: cargar solo en cliente.
const InteractiveMap = dynamic(
  () => import('@tindivo/ui/patterns/interactive-map').then((m) => m.InteractiveMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[260px] w-full animate-pulse rounded-[28px] bg-surface-container" />
    ),
  },
)

type Props = {
  shortId: string
  initial: Tracking.TrackingResponse
}

const STATUS_LABELS = {
  pending_acceptance: 'El local está confirmando tu pedido',
  waiting_driver: 'Esperando motorizado',
  heading_to_restaurant: 'Motorizado en camino al local',
  waiting_at_restaurant: 'Recogiendo tu pedido',
  picked_up: 'En camino a tu dirección',
  delivered: '¡Pedido entregado!',
  cancelled: 'Pedido cancelado',
} as const

const WASH_BY_STATUS = {
  pending_acceptance: 'wash-warning',
  waiting_driver: 'wash-warning',
  heading_to_restaurant: 'wash-active',
  waiting_at_restaurant: 'wash-active',
  picked_up: 'wash-active',
  delivered: 'wash-success',
  cancelled: 'wash-danger',
} as const

const HERO_ICON_BY_STATUS = {
  pending_acceptance: 'pending',
  waiting_driver: 'hourglass_top',
  heading_to_restaurant: 'two_wheeler',
  waiting_at_restaurant: 'restaurant',
  picked_up: 'delivery_dining',
  delivered: 'check_circle',
  cancelled: 'cancel',
} as const

const HERO_VARIANT_BY_STATUS = {
  pending_acceptance: 'warning',
  waiting_driver: 'warning',
  heading_to_restaurant: 'info',
  waiting_at_restaurant: 'info',
  picked_up: 'info',
  delivered: 'success',
  cancelled: 'danger',
} as const

export function TrackingView({ initial, shortId }: Props) {
  const [tracking, setTracking] = useState<Tracking.TrackingResponse>(initial)
  useRealtimeTracking(shortId, setTracking)

  const washClass = WASH_BY_STATUS[tracking.status]
  const heroIcon = HERO_ICON_BY_STATUS[tracking.status]
  const heroVariant = HERO_VARIANT_BY_STATUS[tracking.status]
  const label = STATUS_LABELS[tracking.status]

  const steps = useMemo<TimelineStep[]>(() => {
    const s = tracking.status
    return [
      {
        key: 'created',
        label: 'Pedido recibido',
        icon: 'receipt_long',
        done: true,
      },
      {
        key: 'driver_accepted',
        label: 'Motorizado asignado',
        icon: 'two_wheeler',
        done: ['heading_to_restaurant', 'waiting_at_restaurant', 'picked_up', 'delivered'].includes(
          s,
        ),
        current: s === 'heading_to_restaurant',
      },
      {
        key: 'at_restaurant',
        label: 'Recogiendo pedido',
        icon: 'restaurant',
        done: ['picked_up', 'delivered'].includes(s),
        current: s === 'waiting_at_restaurant',
      },
      {
        key: 'picked_up',
        label: 'En camino a tu dirección',
        icon: 'delivery_dining',
        done: s === 'delivered',
        current: s === 'picked_up',
        timestamp: tracking.pickedUpAt ? formatTime(tracking.pickedUpAt) : undefined,
      },
      {
        key: 'delivered',
        label: 'Entregado',
        icon: 'check_circle',
        done: s === 'delivered',
        timestamp: tracking.deliveredAt ? formatTime(tracking.deliveredAt) : undefined,
      },
    ]
  }, [tracking])

  return (
    <div className={`customer-page ${washClass}`}>
      <GlassTopBar
        title="Tindivo"
        left={
          <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_-18px_rgba(171,53,0,0.8)]">
            <img src="/icon.svg" alt="" className="h-8 w-8 object-contain" />
          </span>
        }
        right={
          <div className="flex items-center gap-2 font-mono text-xs text-on-surface-variant">
            <Icon name="receipt_long" size={18} />#{shortId}
          </div>
        }
      />

      <main className="mx-auto max-w-3xl px-4 pb-12 pt-24 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="customer-soft-gradient flex flex-col items-center space-y-6 rounded-[36px] px-5 py-8 text-center text-white md:px-8"
        >
          <HeroBadge icon={heroIcon} variant={heroVariant} />

          <div className="space-y-3">
            <h1 className="text-3xl font-black leading-tight tracking-normal md:text-5xl">
              {label}
            </h1>
            <div className="customer-glass inline-flex items-center gap-2 rounded-full px-4 py-2">
              <ColorDot color={tracking.restaurantAccentColor} size={10} />
              <span className="text-sm font-extrabold text-on-surface">
                {tracking.restaurantName}
              </span>
            </div>
          </div>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="customer-panel mt-5 rounded-[30px] p-6"
        >
          <Timeline steps={steps} />
        </motion.section>

        {tracking.driverFirstName && tracking.status !== 'cancelled' && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="customer-panel mt-4 flex items-center gap-4 rounded-[28px] p-5"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-fixed">
              <Icon name="two_wheeler" size={24} className="text-on-primary-fixed" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">Tu motorizado</p>
              <p className="font-bold text-on-surface">{tracking.driverFirstName}</p>
            </div>
          </motion.section>
        )}

        {tracking.deliveryCoordinates && tracking.status !== 'cancelled' && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="mt-4"
          >
            <h3 className="mb-2 ml-1 flex items-center gap-1.5 text-sm font-bold text-on-surface-variant">
              <Icon name="location_on" size={18} />
              Tu ubicación de entrega
            </h3>
            <InteractiveMap
              value={tracking.deliveryCoordinates}
              initialZoom={16}
              readOnly
              height={260}
            />
          </motion.section>
        )}

        <p className="mt-10 text-center text-xs text-on-surface-variant">
          Esta página se actualiza automáticamente en tiempo real.
        </p>
      </main>
    </div>
  )
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}
