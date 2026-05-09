'use client'
import { ApiError, type PendingAcceptanceOrder } from '@tindivo/api-client'
import { Button, Icon, IconButton, Skeleton } from '@tindivo/ui'
import { motion } from 'motion/react'
import { useState } from 'react'
import { useAcceptOrderByRestaurant } from '../hooks/use-accept-order'
import { useOrderItems } from '../hooks/use-order-items'

const PREP_PRESETS = [10, 15, 20, 25, 30, 35, 40, 45, 50] as const

type Props = {
  orderId: string
  order: PendingAcceptanceOrder | null
  onClose: () => void
}

/**
 * Bottom sheet con detalle del pedido del cliente:
 *  - Items + modificadores + notas individuales
 *  - Notas generales
 *  - Dirección + referencia + teléfono
 *  - Selector de prep_minutes con presets
 *  - Botón "Aceptar y enviar a motorizado"
 *
 * Tras aceptar exitosamente, dispara auto-assign en backend y la lista de
 * pending_acceptance se invalida (TanStack Query refetch).
 */
export function AcceptOrderSheet({ orderId, order, onClose }: Props) {
  const itemsQuery = useOrderItems(orderId)
  const accept = useAcceptOrderByRestaurant()
  const [prepMinutes, setPrepMinutes] = useState<number>(15)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleAccept() {
    setErrorMsg(null)
    try {
      await accept.mutateAsync({ orderId, prepMinutes })
      onClose()
    } catch (err) {
      setErrorMsg(humanize(err))
    }
  }

  return (
    <dialog
      open
      className="fixed inset-0 z-[80] m-0 h-screen max-h-none w-screen max-w-none border-0 bg-black/40 p-0 flex items-end"
    >
      <button type="button" aria-label="Cerrar" className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ y: 720 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 260 }}
        className="relative z-10 w-full max-h-[92vh] overflow-y-auto rounded-t-[28px] bg-surface pb-32"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 bg-surface/92 backdrop-blur-xl border-b border-outline-variant/10">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-on-surface-variant">
              Aceptar pedido
            </p>
            <h2 className="text-xl font-black truncate">
              {order?.client_name ?? 'Cliente'}
              <span className="ml-2 text-xs text-on-surface-variant font-mono">
                #{order?.short_id}
              </span>
            </h2>
          </div>
          <IconButton variant="subtle" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" />
          </IconButton>
        </div>

        <div className="px-5 pt-5 max-w-xl mx-auto space-y-5">
          {/* Items + modificadores + notas individuales */}
          <section className="rounded-2xl bg-surface-container-lowest border border-outline-variant/15 p-4">
            <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-on-surface-variant mb-3">
              Detalle del pedido
            </h3>
            {itemsQuery.isLoading ? (
              <Skeleton className="h-24" />
            ) : (itemsQuery.data?.items?.length ?? 0) === 0 ? (
              <p className="text-sm text-on-surface-variant">
                Sin desglose detallado (pedido manual del restaurante).
              </p>
            ) : (
              <ul className="space-y-3">
                {itemsQuery.data?.items.map((item) => (
                  <li key={item.id} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-bold text-on-surface">
                        <span className="text-primary-container mr-2 font-mono">
                          {item.quantity}×
                        </span>
                        {item.itemName}
                      </p>
                      <p className="text-sm font-bold text-on-surface tabular-nums">
                        S/ {item.lineTotal.toFixed(2)}
                      </p>
                    </div>
                    {item.modifiers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 ml-7">
                        {item.modifiers.map((m, idx) => (
                          <span
                            key={`${item.id}-${idx}`}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant/30"
                          >
                            {m.optionName}
                            {m.priceDelta > 0 && (
                              <span className="ml-1 text-on-surface/60">
                                +{m.priceDelta.toFixed(2)}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.notes && (
                      <p className="ml-7 text-xs italic text-amber-800 bg-amber-50 rounded-lg px-2 py-1 border border-amber-200/50">
                        <Icon name="comment" size={12} className="inline mr-1 align-middle" />
                        {item.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Datos del cliente */}
          <section className="rounded-2xl bg-surface-container-lowest border border-outline-variant/15 p-4 space-y-3">
            <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-on-surface-variant">
              Entrega
            </h3>
            {order?.customer_phone && (
              <a
                href={`tel:+51${order.customer_phone}`}
                className="flex items-center gap-2 text-sm font-bold text-on-surface"
              >
                <Icon name="call" size={16} />
                +51 {order.customer_phone}
              </a>
            )}
            {order?.delivery_address && (
              <div className="flex items-start gap-2 text-sm text-on-surface">
                <Icon
                  name="location_on"
                  size={16}
                  className="mt-0.5 flex-shrink-0 text-on-surface-variant"
                />
                <div>
                  <p className="font-semibold">{order.delivery_address}</p>
                  {order.delivery_reference && (
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {order.delivery_reference}
                    </p>
                  )}
                </div>
              </div>
            )}
            {order?.notes && (
              <p className="text-xs text-on-surface-variant italic bg-surface-container/50 rounded-lg px-3 py-2">
                <Icon name="sticky_note_2" size={12} className="inline mr-1 align-middle" />
                {order.notes}
              </p>
            )}
          </section>

          {/* Selector prep_minutes */}
          <section className="rounded-2xl bg-surface-container-lowest border border-outline-variant/15 p-4 space-y-3">
            <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-on-surface-variant">
              ¿Cuánto demoras en preparar este pedido?
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {PREP_PRESETS.map((m) => {
                const active = prepMinutes === m
                return (
                  <button
                    type="button"
                    key={m}
                    onClick={() => setPrepMinutes(m)}
                    className={`h-14 rounded-xl flex flex-col items-center justify-center font-black border transition-colors ${
                      active
                        ? 'bg-primary-container text-white border-primary-container'
                        : 'bg-surface-container text-on-surface border-outline-variant/25'
                    }`}
                    aria-pressed={active}
                  >
                    <span className="text-lg leading-none">{m}</span>
                    <span className="text-[10px] mt-0.5 opacity-80">min</span>
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-on-surface-variant">
              Tiempo estimado del cliente: ~{order?.prep_minutes ?? '?'} min
            </p>
          </section>

          {errorMsg && (
            <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
              {errorMsg}
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-20 px-5 pb-5 pt-3 bg-surface/92 backdrop-blur-xl border-t border-outline-variant/15 max-w-xl mx-auto">
          <Button
            size="lg"
            className="w-full"
            disabled={accept.isPending || itemsQuery.isLoading}
            onClick={handleAccept}
          >
            <Icon
              name={accept.isPending ? 'progress_activity' : 'check_circle'}
              className={accept.isPending ? 'animate-spin' : undefined}
            />
            {accept.isPending
              ? 'Aceptando...'
              : `Aceptar y enviar al motorizado · ${prepMinutes} min`}
          </Button>
        </div>
      </motion.div>
    </dialog>
  )
}

function humanize(err: unknown): string {
  if (err instanceof ApiError) return err.problem.detail ?? err.problem.title
  return 'No se pudo aceptar el pedido. Intenta de nuevo.'
}
