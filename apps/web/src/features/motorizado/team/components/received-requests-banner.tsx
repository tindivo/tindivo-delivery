'use client'
import { useNow } from '@/shared/hooks/use-now'
import { Button, Icon } from '@tindivo/ui'
import { motion } from 'motion/react'
import { useAcceptTransferRequest } from '../hooks/use-accept-transfer-request'
import { useRejectTransferRequest } from '../hooks/use-reject-transfer-request'

// biome-ignore lint/suspicious/noExplicitAny: payload snake_case del API
type RequestItem = any

type Props = {
  items: RequestItem[]
}

/**
 * Banner sticky arriba de la pestaña Equipo. Renderiza una card por cada
 * solicitud RECIBIDA pending. Cada card tiene countdown live (30s desde
 * created_at) y botones Aceptar/Rechazar.
 *
 * Si el countdown llega a 0 antes de que el cron procese la fila (1 min de
 * latencia), la card pasa a estado "Transferencia automática…" (naranja) para
 * indicar que la solicitud no se rechazó, sino que está en cola para ser
 * auto-aceptada por el cron `process-expired-transfer-requests`. Cuando el
 * cron procesa la fila (status → 'accepted' o 'expired'), Realtime invalida
 * el cache y la card desaparece.
 */
export function ReceivedRequestsBanner({ items }: Props) {
  if (items.length === 0) return null

  return (
    <div className="space-y-2 sticky top-20 z-30">
      {items.map((req) => (
        <RequestCard key={req.id} request={req} />
      ))}
    </div>
  )
}

function RequestCard({ request }: { request: RequestItem }) {
  const accept = useAcceptTransferRequest()
  const reject = useRejectTransferRequest()
  const now = useNow(1_000)

  const expiresAt = new Date(request.expires_at).getTime()
  const remainingMs = Math.max(0, expiresAt - now.getTime())
  const remainingSec = Math.ceil(remainingMs / 1000)
  const isExpired = remainingMs <= 0
  const isPending = accept.isPending || reject.isPending

  const requesterName = request.drivers?.full_name ?? 'Un compañero'
  const restaurantName = request.orders?.restaurants?.name ?? 'Restaurante'
  const shortId = request.orders?.short_id ?? '???'

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="rounded-[20px] p-4"
      style={{
        background: isExpired
          ? 'linear-gradient(135deg, #C2410C 0%, #EA580C 100%)'
          : 'linear-gradient(135deg, #991B1B 0%, #BA1A1A 100%)',
        color: '#ffffff',
        boxShadow: isExpired
          ? '0 12px 28px -8px rgba(234, 88, 12, 0.4)'
          : '0 12px 28px -8px rgba(186, 26, 26, 0.4)',
      }}
    >
      <div className="flex items-start gap-3">
        <Icon name={isExpired ? 'sync' : 'swap_horiz'} size={22} filled />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold tracking-[0.22em] uppercase opacity-90">
            {isExpired ? 'Transferencia automática…' : 'Te piden un pedido'}
          </div>
          <div className="font-black text-base mt-0.5">
            {requesterName} · #{shortId}
          </div>
          <div className="text-xs opacity-90 mt-0.5">
            {isExpired ? `Pasando el pedido a ${requesterName}` : restaurantName}
          </div>
        </div>
        {!isExpired && (
          <div className="text-right">
            <div
              className="font-mono font-black tabular-nums text-2xl"
              style={{ letterSpacing: '-0.02em' }}
            >
              {remainingSec}s
            </div>
            <div className="text-[10px] uppercase tracking-wider opacity-85">restan</div>
          </div>
        )}
      </div>

      {!isExpired && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            size="md"
            disabled={isPending}
            onClick={() => reject.mutate(request.id)}
            style={{
              background: 'rgba(255, 255, 255, 0.16)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
          >
            <Icon name="close" />
            Rechazar
          </Button>
          <Button
            size="md"
            disabled={isPending}
            onClick={() => accept.mutate(request.id)}
            style={{
              background: '#ffffff',
              color: '#991B1B',
              fontWeight: 900,
            }}
          >
            <Icon name="check" filled />
            Aceptar
          </Button>
        </div>
      )}
    </motion.div>
  )
}
