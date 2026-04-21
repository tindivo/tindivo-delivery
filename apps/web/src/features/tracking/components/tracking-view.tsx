'use client'
import type { Tracking } from '@tindivo/contracts'
import {
  ColorDot,
  GlassTopBar,
  HeroBadge,
  Icon,
  Timeline,
  type TimelineStep,
} from '@tindivo/ui'
import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { useRealtimeTracking } from '../hooks/use-realtime-tracking'

// Leaflet toca `window` en su top-level: cargar solo en cliente.
const InteractiveMap = dynamic(
  () => import('@tindivo/ui/patterns/interactive-map').then((m) => m.InteractiveMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[260px] w-full rounded-xl bg-surface-container animate-pulse" />
    ),
  },
)

type Props = {
  shortId: string
  initial: Tracking.TrackingResponse
}

const STATUS_LABELS = {
  waiting_driver: 'Esperando motorizado',
  heading_to_restaurant: 'Motorizado en camino al local',
  waiting_at_restaurant: 'Recogiendo tu pedido',
  picked_up: 'En camino a tu dirección',
  delivered: '¡Pedido entregado!',
  cancelled: 'Pedido cancelado',
} as const

const WASH_BY_STATUS = {
  waiting_driver: 'wash-warning',
  heading_to_restaurant: 'wash-active',
  waiting_at_restaurant: 'wash-active',
  picked_up: 'wash-active',
  delivered: 'wash-success',
  cancelled: 'wash-danger',
} as const

const HERO_ICON_BY_STATUS = {
  waiting_driver: 'hourglass_top',
  heading_to_restaurant: 'two_wheeler',
  waiting_at_restaurant: 'restaurant',
  picked_up: 'delivery_dining',
  delivered: 'check_circle',
  cancelled: 'cancel',
} as const

const HERO_VARIANT_BY_STATUS = {
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
        done: ['heading_to_restaurant', 'waiting_at_restaurant', 'picked_up', 'delivered'].includes(s),
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
    <div className={`min-h-screen ${washClass}`}>
      <GlassTopBar
        title="TINDIVO"
        right={
          <div className="flex items-center gap-2 text-xs text-on-surface-variant font-mono">
            <Icon name="receipt_long" size={18} />#{shortId}
          </div>
        }
      />

      <main className="pt-24 pb-12 px-6 max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center text-center space-y-6"
        >
          <HeroBadge icon={heroIcon} variant={heroVariant} />

          <div className="space-y-3">
            <h1 className="font-black text-3xl md:text-4xl tracking-tight text-on-surface">
              {label}
            </h1>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container-lowest rounded-full border border-outline-variant/20 shadow-[0_4px_20px_rgba(171,53,0,0.04)]">
              <ColorDot color={tracking.restaurantAccentColor} size={10} />
              <span className="font-semibold text-sm">{tracking.restaurantName}</span>
            </div>
          </div>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mt-10 bg-surface-container-lowest rounded-lg p-6 border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)]"
        >
          <Timeline steps={steps} />
        </motion.section>

        {tracking.driverFirstName && tracking.status !== 'cancelled' && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="mt-4 bg-surface-container-lowest rounded-lg p-5 border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)] flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center">
              <Icon name="two_wheeler" size={24} className="text-on-primary-fixed" />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">Tu motorizado</p>
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
            <h3 className="text-sm font-bold tracking-wide text-on-surface-variant mb-2 ml-1 flex items-center gap-1.5">
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

        <p className="text-center text-xs text-on-surface-variant mt-10">
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
