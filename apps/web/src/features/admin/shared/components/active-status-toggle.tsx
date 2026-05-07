'use client'
import { ApiError } from '@tindivo/api-client'
import { Button, Icon } from '@tindivo/ui'
import { useState } from 'react'
import { ActiveOrdersBlockerModal, type BlockingOrder } from './active-orders-blocker-modal'

type Props = {
  isActive: boolean
  subjectLabel: string
  onToggle: (nextIsActive: boolean) => Promise<unknown>
  isPending: boolean
  helpText?: string
}

export function ActiveStatusToggle({
  isActive,
  subjectLabel,
  onToggle,
  isPending,
  helpText,
}: Props) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [blockingOrders, setBlockingOrders] = useState<BlockingOrder[] | null>(null)

  async function handleToggle() {
    setErrorMsg(null)
    try {
      await onToggle(!isActive)
    } catch (err) {
      const blocking = extractBlockingOrders(err)
      if (blocking) {
        setBlockingOrders(blocking)
        return
      }
      setErrorMsg(humanizeError(err))
    }
  }

  return (
    <>
      <section className="rounded-2xl bg-surface-container-lowest border border-outline-variant/15 p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-on-surface-variant">
              Estado de cuenta
            </div>
            <h3 className="font-black text-lg leading-tight mt-1">
              {isActive ? (
                <span className="inline-flex items-center gap-2 text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Activo
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-on-surface-variant">
                  <span className="w-2.5 h-2.5 rounded-full bg-outline-variant" />
                  Inactivo
                </span>
              )}
            </h3>
            <p className="text-on-surface-variant text-xs mt-2 max-w-md">
              {helpText ??
                (isActive
                  ? 'Si lo desactivas dejará de operar (sin nuevos pedidos). Solo se permite desactivar si no hay pedidos en curso.'
                  : 'Está pausado. Al activarlo volverá a estar disponible para operar.')}
            </p>
          </div>
          <Button
            type="button"
            size="md"
            variant={isActive ? 'secondary' : 'primary'}
            onClick={handleToggle}
            disabled={isPending}
          >
            <Icon name={isActive ? 'pause' : 'play_arrow'} size={18} filled />
            {isPending ? 'Aplicando…' : isActive ? 'Desactivar' : 'Activar'}
          </Button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800">
            {errorMsg}
          </div>
        )}
      </section>

      {blockingOrders && (
        <ActiveOrdersBlockerModal
          subjectLabel={subjectLabel}
          orders={blockingOrders}
          onClose={() => setBlockingOrders(null)}
        />
      )}
    </>
  )
}

function extractBlockingOrders(err: unknown): BlockingOrder[] | null {
  if (!(err instanceof ApiError)) return null
  const code = err.problem.code as string
  if (code !== 'ACTIVE_ORDERS_BLOCKING') return null
  const raw = (err.problem as unknown as { activeOrders?: BlockingOrder[] }).activeOrders
  return Array.isArray(raw) ? raw : []
}

function humanizeError(err: unknown): string {
  if (err instanceof ApiError) return err.problem.detail ?? err.problem.title
  return 'No se pudo cambiar el estado. Intenta de nuevo.'
}
