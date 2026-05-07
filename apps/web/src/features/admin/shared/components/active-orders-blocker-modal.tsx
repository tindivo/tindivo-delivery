'use client'
import { Button, Icon } from '@tindivo/ui'
import Link from 'next/link'

export type BlockingOrder = {
  id: string
  shortId: string
  status: string
  customerName: string | null
}

const STATUS_LABEL: Record<string, string> = {
  pending_acceptance: 'Esperando aceptación',
  waiting_driver: 'Esperando motorizado',
  heading_to_restaurant: 'Motorizado en camino',
  waiting_at_restaurant: 'Recogiendo',
  picked_up: 'En camino al cliente',
}

type Props = {
  subjectLabel: string
  orders: BlockingOrder[]
  onClose: () => void
}

export function ActiveOrdersBlockerModal({ subjectLabel, orders, onClose }: Props) {
  return (
    <dialog
      open
      className="fixed inset-0 z-[200] m-0 w-full h-full max-w-none max-h-none flex items-end sm:items-center justify-center bg-transparent"
      style={{ background: 'rgba(0, 0, 0, 0.55)' }}
      aria-label="No se puede desactivar"
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: 'transparent' }}
      />

      <div
        className="relative w-full sm:max-w-md bg-surface-container-lowest rounded-t-[28px] sm:rounded-[28px] p-6"
        style={{ boxShadow: '0 -16px 40px -12px rgba(0, 0, 0, 0.25)' }}
      >
        <div className="flex items-start gap-3 mb-4">
          <span
            className="shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
              color: '#ffffff',
            }}
          >
            <Icon name="block" size={24} filled />
          </span>
          <div className="flex-1">
            <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-on-surface-variant">
              Acción bloqueada
            </div>
            <h3 className="font-black text-lg leading-tight mt-0.5">No se puede desactivar</h3>
          </div>
        </div>

        <p className="text-sm text-on-surface-variant mb-4">
          Hay {orders.length} pedido(s) activos para {subjectLabel}. Termínalos o cancélalos antes
          de desactivar.
        </p>

        <ul className="space-y-2 max-h-64 overflow-y-auto mb-5">
          {orders.map((o) => (
            <li
              key={o.id}
              className="flex items-center gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-low p-3"
            >
              <div className="flex-1 min-w-0">
                <div className="font-mono text-xs font-bold text-on-surface">#{o.shortId}</div>
                <div className="text-xs text-on-surface-variant truncate">
                  {STATUS_LABEL[o.status] ?? o.status}
                  {o.customerName ? ` · ${o.customerName}` : ''}
                </div>
              </div>
              <Link
                href={`/admin/orders/${o.id}`}
                className="shrink-0 inline-flex items-center gap-1 text-primary text-xs font-bold hover:underline"
              >
                Ver
                <Icon name="chevron_right" size={14} />
              </Link>
            </li>
          ))}
        </ul>

        <Button size="lg" className="w-full" onClick={onClose}>
          Entendido
        </Button>
      </div>
    </dialog>
  )
}
