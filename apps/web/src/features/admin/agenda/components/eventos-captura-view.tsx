'use client'
import { Button, EmptyState, Icon, Skeleton, cn } from '@tindivo/ui'
import { useEffect, useState } from 'react'
import { useAgendaVista3, useDriversList } from '../hooks/use-agenda'

function formatDateTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function EventosCapturaView() {
  const [page, setPage] = useState(1)
  const [phone, setPhone] = useState('')
  const [driverId, setDriverId] = useState('all')
  const [actions, setActions] = useState<string[]>([])
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)

  // Estado del visualizador JSON expandido
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  const { data: drivers } = useDriversList()
  const { data, isLoading } = useAgendaVista3({
    page,
    actions,
    phone,
    startDate,
    endDate,
    driverId,
  })

  const items = data?.items ?? []
  const totalItems = data?.total ?? 0
  const totalPages = Math.ceil(totalItems / 50) || 1

  // Resetea página al cambiar filtros
  // biome-ignore lint/correctness/useExhaustiveDependencies: run when filters change
  useEffect(() => {
    setPage(1)
  }, [phone, driverId, actions, startDate, endDate])

  function toggleAction(action: string) {
    setActions((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action],
    )
  }

  function getActionBadgeStyle(action: string) {
    switch (action) {
      case 'admin_captured':
        return 'bg-green-500/10 text-green-700 border-green-500/25'
      case 'admin_edited':
        return 'bg-amber-500/10 text-amber-700 border-amber-500/25'
      case 'confirmed':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/25'
      case 'omitted':
        return 'bg-gray-500/10 text-gray-700 border-gray-500/25'
      case 'dragged':
        return 'bg-purple-500/10 text-purple-700 border-purple-500/25'
      case 'shown':
        return 'bg-cyan-500/10 text-cyan-700 border-cyan-500/25'
      case 'navigate_clicked':
        return 'bg-indigo-500/10 text-indigo-700 border-indigo-500/25'
      default:
        return 'bg-slate-500/10 text-slate-700 border-slate-500/25'
    }
  }

  return (
    <div className="space-y-6">
      {/* Panel de Filtros */}
      <div className="rounded-2xl bg-surface-container-lowest p-5 border border-outline-variant/15 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Teléfono */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Teléfono:
            </span>
            <div className="relative">
              <Icon
                name="phone"
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60"
              />
              <input
                type="text"
                placeholder="Ej: 999999999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface-container rounded-xl border border-outline-variant/30 text-sm font-semibold placeholder:text-on-surface-variant/50 focus:outline-hidden focus:border-primary"
              />
            </div>
          </div>

          {/* Motorizado (Driver) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Motorizado:
            </span>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="w-full rounded-xl bg-surface-container border border-outline-variant/30 px-3 py-2 text-sm font-semibold focus:outline-hidden"
            >
              <option value="all">Todos los motorizados</option>
              {drivers?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Acciones */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Acción:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { code: 'admin_captured', label: 'Admin Captura' },
                { code: 'admin_edited', label: 'Admin Edición' },
                { code: 'confirmed', label: 'Motorizado Confirmó' },
                { code: 'omitted', label: 'Motorizado Omitió' },
              ].map((act) => {
                const active = actions.includes(act.code)
                return (
                  <button
                    type="button"
                    key={act.code}
                    onClick={() => toggleAction(act.code)} // Toggle action
                    className={cn(
                      'px-2 py-1 rounded-lg text-[9px] font-bold tracking-wider uppercase border transition-colors',
                      active
                        ? 'bg-primary text-on-primary border-primary shadow-xs'
                        : 'bg-surface-container text-on-surface-variant border-outline-variant/30 hover:border-outline-variant',
                    )}
                  >
                    {act.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-outline-variant/10">
          {/* Rango de Fechas */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Rango de fecha de evento:
            </span>
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate ?? ''}
                onChange={(e) => setStartDate(e.target.value || null)}
                className="w-1/2 rounded-xl bg-surface-container border border-outline-variant/30 px-2 py-1.5 text-xs font-semibold focus:outline-hidden"
              />
              <input
                type="date"
                value={endDate ?? ''}
                onChange={(e) => setEndDate(e.target.value || null)}
                className="w-1/2 rounded-xl bg-surface-container border border-outline-variant/30 px-2 py-1.5 text-xs font-semibold focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla Principal */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="event_busy"
          title="Sin eventos"
          description="No se registraron eventos de auditoría con los filtros aplicados."
        />
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/15 overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th className="text-left px-4 py-3">Fecha y Hora</th>
                  <th className="text-left px-4 py-3">Acción</th>
                  <th className="text-left px-4 py-3">Teléfono</th>
                  <th className="text-left px-4 py-3">Motorizado ID</th>
                  <th className="text-left px-4 py-3">Pedido ID</th>
                  <th className="text-left px-4 py-3">Metadata (JSON)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row: any) => {
                  const driverName =
                    drivers?.find((d) => d.id === row.driver_id)?.full_name ?? row.driver_id ?? '-'
                  return (
                    <tr
                      key={row.id}
                      className="border-t border-outline-variant/10 hover:bg-surface-container-low/50 transition-colors align-top"
                    >
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                        {formatDateTime(row.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border',
                            getActionBadgeStyle(row.action),
                          )}
                        >
                          {row.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-on-surface">
                        {row.phone ? `+51 ${row.phone}` : '-'}
                      </td>
                      <td
                        className="px-4 py-3 text-xs truncate max-w-[150px]"
                        title={row.driver_id ?? ''}
                      >
                        {driverName}
                      </td>
                      <td
                        className="px-4 py-3 font-mono text-xs truncate max-w-[150px]"
                        title={row.order_id ?? ''}
                      >
                        {row.order_id || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedRowId(expandedRowId === row.id ? null : row.id)
                            }
                            className="inline-flex items-center gap-1 text-[11px] text-primary font-bold hover:underline"
                          >
                            <Icon
                              name={expandedRowId === row.id ? 'expand_less' : 'expand_more'}
                              size={14}
                            />
                            {expandedRowId === row.id ? 'Ocultar JSON' : 'Ver JSON'}
                          </button>
                          {expandedRowId === row.id && (
                            <pre className="mt-2 p-3 bg-surface-container rounded-xl text-[10px] font-mono overflow-auto max-w-[350px] max-h-[220px] border border-outline-variant/15 text-left text-on-surface-variant shadow-xs">
                              {JSON.stringify(row.metadata, null, 2)}
                            </pre>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-surface-container-lowest px-4 py-3 rounded-2xl border border-outline-variant/15">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Página {page} de {totalPages} ({totalItems} registros)
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Siguiente
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
