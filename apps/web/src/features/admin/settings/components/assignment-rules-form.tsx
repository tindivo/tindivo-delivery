'use client'
import { ApiError, type AssignmentRulesDto } from '@tindivo/api-client'
import { Button, Icon, Label } from '@tindivo/ui'
import { useEffect, useState } from 'react'
import {
  useAssignmentRulesAdmin,
  useUpdateAssignmentRules,
} from '../hooks/use-assignment-rules-admin'
import { formatSavedAt } from '../lib/format-saved-at'

/**
 * Form para configurar las reglas de asignación de pedidos a motorizados.
 *
 * Implementa los 3 parámetros del simulador (R1..R6):
 *  - maxOrdersPerDriver:      cap de pedidos en mochila por driver (R3).
 *  - maxRestaurantsPerDriver: cap de restaurantes distintos simultáneos (R2).
 *  - groupingWindowMinutes:   ventana para agrupar pedidos del mismo restaurante (R1).
 *
 * Defaults del simulador: 3 / 2 / 5.
 */
export function AssignmentRulesForm() {
  const { data, isLoading } = useAssignmentRulesAdmin()
  const update = useUpdateAssignmentRules()
  const [maxOrdersPerDriver, setMaxOrdersPerDriver] = useState(3)
  const [maxRestaurantsPerDriver, setMaxRestaurantsPerDriver] = useState(2)
  const [groupingWindowMinutes, setGroupingWindowMinutes] = useState(5)
  const [maxOccupancySlotsPerOrder, setMaxOccupancySlotsPerOrder] = useState(3)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (data) {
      setMaxOrdersPerDriver(data.rules.maxOrdersPerDriver)
      setMaxRestaurantsPerDriver(data.rules.maxRestaurantsPerDriver)
      setGroupingWindowMinutes(data.rules.groupingWindowMinutes)
      setMaxOccupancySlotsPerOrder(data.rules.maxOccupancySlotsPerOrder)
      setSavedAt(data.updatedAt)
    }
  }, [data])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    if (!isInRange(maxOrdersPerDriver, 1, 10)) {
      setErrorMsg('Máx. pedidos por driver: entre 1 y 10.')
      return
    }
    if (!isInRange(maxRestaurantsPerDriver, 1, 10)) {
      setErrorMsg('Máx. restaurantes por driver: entre 1 y 10.')
      return
    }
    if (!isInRange(groupingWindowMinutes, 1, 60)) {
      setErrorMsg('Ventana de agrupación: entre 1 y 60 minutos.')
      return
    }
    if (!isInRange(maxOccupancySlotsPerOrder, 1, 10)) {
      setErrorMsg('Máx. ocupación por pedido: entre 1 y 10 slots.')
      return
    }
    const body: AssignmentRulesDto = {
      maxOrdersPerDriver,
      maxRestaurantsPerDriver,
      groupingWindowMinutes,
      maxOccupancySlotsPerOrder,
    }
    try {
      const res = await update.mutateAsync(body)
      setSavedAt(res.updatedAt)
    } catch (err) {
      setErrorMsg(humanize(err))
    }
  }

  return (
    <section className="max-w-xl space-y-4 rounded-2xl bg-surface-container-lowest p-6 border border-outline-variant/15">
      <div>
        <h2 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">
          Reglas de asignación
        </h2>
        <p className="text-xs text-on-surface-variant mt-1">
          Parámetros que rigen cómo el sistema asigna pedidos a motorizados. Los cambios afectan al
          próximo pedido procesado.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="max-orders">Máx. pedidos en mochila por motorizado</Label>
          <input
            id="max-orders"
            type="number"
            min={1}
            max={10}
            value={maxOrdersPerDriver}
            onChange={(e) => setMaxOrdersPerDriver(Number(e.target.value))}
            className="w-full rounded-xl bg-surface-container border border-outline-variant/30 px-3 py-2 text-base font-semibold tabular-nums"
          />
          <p className="text-xs text-on-surface-variant mt-1">
            Regla R3 del simulador. Default: 3. El motorizado deja de recibir asignaciones cuando
            llega a este número de pedidos activos + reservados.
          </p>
        </div>

        <div>
          <Label htmlFor="max-restaurants">Máx. restaurantes distintos simultáneos</Label>
          <input
            id="max-restaurants"
            type="number"
            min={1}
            max={10}
            value={maxRestaurantsPerDriver}
            onChange={(e) => setMaxRestaurantsPerDriver(Number(e.target.value))}
            className="w-full rounded-xl bg-surface-container border border-outline-variant/30 px-3 py-2 text-base font-semibold tabular-nums"
          />
          <p className="text-xs text-on-surface-variant mt-1">
            Regla R2. Default: 2. Si un motorizado ya tiene este nro de restaurantes diferentes en
            su mochila, no recibirá pedidos de un restaurante adicional (sí del mismo, vía R1).
          </p>
        </div>

        <div>
          <Label htmlFor="grouping-window">Ventana de agrupación (minutos)</Label>
          <input
            id="grouping-window"
            type="number"
            min={1}
            max={60}
            value={groupingWindowMinutes}
            onChange={(e) => setGroupingWindowMinutes(Number(e.target.value))}
            className="w-full rounded-xl bg-surface-container border border-outline-variant/30 px-3 py-2 text-base font-semibold tabular-nums"
          />
          <p className="text-xs text-on-surface-variant mt-1">
            Regla R1. Default: 5 min. Si un motorizado ya tiene un pedido del mismo restaurante con
            tiempo de listo dentro de esta ventana, se le asigna el pedido nuevo para consolidar
            entregas.
          </p>
        </div>

        <div>
          <Label htmlFor="max-occupancy">Máx. ocupación por pedido (slots)</Label>
          <input
            id="max-occupancy"
            type="number"
            min={1}
            max={10}
            value={maxOccupancySlotsPerOrder}
            onChange={(e) => setMaxOccupancySlotsPerOrder(Number(e.target.value))}
            className="w-full rounded-xl bg-surface-container border border-outline-variant/30 px-3 py-2 text-base font-semibold tabular-nums"
          />
          <p className="text-xs text-on-surface-variant mt-1">
            Default: 3. Cap del valor que el motorizado puede declarar al recoger un pedido. Suma
            con el cap R3 (mochila) — un pedido que ocupa N slots reduce en N la capacidad
            disponible para nuevas asignaciones.
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMsg}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={update.isPending || isLoading} size="lg">
            <Icon name="check" />
            {update.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
          {savedAt && !update.isPending && (
            <span className="text-xs text-on-surface-variant">
              Última actualización: {formatSavedAt(savedAt)}
            </span>
          )}
        </div>
      </form>
    </section>
  )
}

function isInRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max
}

function humanize(err: unknown): string {
  if (err instanceof ApiError) return err.problem.detail ?? err.problem.title
  return 'No se pudo guardar las reglas. Intenta de nuevo.'
}
