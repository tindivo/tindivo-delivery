'use client'
import { ApiError } from '@tindivo/api-client'
import { BottomActionBar, Button, Icon, IconButton } from '@tindivo/ui'
import { motion } from 'motion/react'
import { useState } from 'react'
import { useRequestTransfer } from '../hooks/use-request-transfer'

type Props = {
  order: {
    id: string
    shortId: string
    restaurantName: string
    driverFullName: string
    orderAmount: number
    statusLabel: string
  }
  onClose: () => void
  onSuccess: () => void
}

/**
 * Sheet de confirmación para solicitar un pedido a un compañero. Avisa al
 * driver del flujo (30s para respuesta) y dispara la mutation /request.
 *
 * Errores manejados:
 *  - DRIVER_CAPACITY_EXCEEDED → "Tu mochila ya está llena"
 *  - INVALID_TRANSFER → "No puedes solicitar este pedido"
 *  - DRIVER_NOT_AUTHORIZED_FOR_RESTAURANT → "No atiendes este restaurante"
 *  - ORDER_ALREADY_TRANSFERRED → "El pedido cambió de dueño"
 */
export function RequestOrderSheet({ order, onClose, onSuccess }: Props) {
  const requestTransfer = useRequestTransfer()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function handleConfirm() {
    setErrorMsg(null)
    requestTransfer.mutate(order.id, {
      onSuccess: () => onSuccess(),
      onError: (err) => {
        if (err instanceof ApiError) {
          switch (err.problem.code) {
            case 'DRIVER_CAPACITY_EXCEEDED':
              setErrorMsg('Tu mochila ya está llena. Completa una entrega primero.')
              break
            case 'INVALID_TRANSFER':
              setErrorMsg('No puedes solicitar este pedido.')
              break
            case 'DRIVER_NOT_AUTHORIZED_FOR_RESTAURANT':
              setErrorMsg('No estás asignado a este restaurante.')
              break
            case 'ORDER_ALREADY_TRANSFERRED':
              setErrorMsg('El pedido ya cambió de dueño.')
              break
            default:
              setErrorMsg('No pudimos enviar la solicitud. Intenta de nuevo.')
          }
        } else {
          setErrorMsg('No pudimos enviar la solicitud. Intenta de nuevo.')
        }
      },
    })
  }

  return (
    <dialog
      open
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-transparent"
      style={{ background: 'rgba(0, 0, 0, 0.55)' }}
      aria-label="Solicitar pedido"
    >
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 48 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full sm:max-w-md bg-surface-container-lowest rounded-t-[28px] sm:rounded-[28px] p-5 pb-32 max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-on-surface">Solicitar pedido</h2>
          <IconButton variant="ghost" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" />
          </IconButton>
        </div>

        <div className="space-y-3">
          <div className="rounded-[20px] p-4 bg-surface-container border border-outline-variant/15 space-y-1.5">
            <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-on-surface-variant">
              Pedido
            </div>
            <div className="font-black text-on-surface">
              #{order.shortId} · {order.restaurantName}
            </div>
            <div className="text-sm text-on-surface-variant">
              S/ {order.orderAmount.toFixed(2)} · {order.statusLabel}
            </div>
            <div className="text-xs text-on-surface-variant pt-1 flex items-center gap-1.5">
              <Icon name="two_wheeler" size={14} />
              Lo tiene actualmente: <span className="font-semibold">{order.driverFullName}</span>
            </div>
          </div>

          <div
            className="rounded-[20px] p-4"
            style={{
              background: 'rgba(234, 179, 8, 0.12)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              color: '#92400E',
            }}
          >
            <div className="flex items-start gap-3">
              <Icon name="schedule" size={20} filled />
              <div className="text-sm font-semibold">
                Tu compañero tiene <span className="font-black">30 segundos</span> para
                aceptar. Si no responde o rechaza, el pedido sigue siendo de él.
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-[16px] p-3 bg-red-50 border border-red-200 text-sm font-semibold text-red-800">
              {errorMsg}
            </div>
          )}
        </div>

        <BottomActionBar zIndex={210}>
          <Button
            size="lg"
            className="w-full"
            disabled={requestTransfer.isPending}
            onClick={handleConfirm}
          >
            <Icon name={requestTransfer.isPending ? 'progress_activity' : 'swap_horiz'} filled />
            {requestTransfer.isPending ? 'Enviando solicitud...' : 'Solicitar pedido'}
          </Button>
          <Button
            variant="secondary"
            size="md"
            className="w-full"
            disabled={requestTransfer.isPending}
            onClick={onClose}
          >
            Cancelar
          </Button>
        </BottomActionBar>
      </motion.div>
    </dialog>
  )
}
