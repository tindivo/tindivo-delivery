'use client'
import { AddressCaptureModal, Button, EmptyState, Icon, Skeleton, cn } from '@tindivo/ui'
import { useEffect, useState } from 'react'
import {
  useAgendaVista2,
  useDeleteAddress,
  useEditAddress,
  useSetDefaultAddress,
} from '../hooks/use-agenda'

function formatRelativeDate(isoString: string | null | undefined): string {
  if (!isoString) return '-'
  const date = new Date(isoString)
  const diffMs = Date.now() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'hace unos segundos'
  if (diffMins < 60) return `hace ${diffMins} min`
  if (diffHours < 24) return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`
  if (diffDays === 1) return 'ayer'
  return `hace ${diffDays} días`
}

export function TodosRegistrosView() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  // Filtros
  const [sources, setSources] = useState<string[]>([])
  const [minTimesUsed, setMinTimesUsed] = useState(0)
  const [hasPin, setHasPin] = useState<boolean | null>(null)
  const [lastUsedStart, setLastUsedStart] = useState<string | null>(null)
  const [lastUsedEnd, setLastUsedEnd] = useState<string | null>(null)
  const [minAccuracy, setMinAccuracy] = useState<number | null>(null)
  const [maxAccuracy, setMaxAccuracy] = useState<number | null>(null)

  // Modales
  // biome-ignore lint/suspicious/noExplicitAny: registro seleccionado para editar/eliminar
  const [curatingAddress, setCuratingAddress] = useState<any | null>(null)
  // biome-ignore lint/suspicious/noExplicitAny: registro seleccionado para editar/eliminar
  const [deletingRecord, setDeletingRecord] = useState<any | null>(null)

  const { data, isLoading, refetch } = useAgendaVista2({
    page,
    search,
    sources,
    minTimesUsed,
    hasPin,
    lastUsedStart,
    lastUsedEnd,
    minAccuracy,
    maxAccuracy,
  })

  const editMutation = useEditAddress()
  const deleteMutation = useDeleteAddress()
  const setDefaultMutation = useSetDefaultAddress()

  const items = data?.items ?? []
  const totalItems = data?.total ?? 0
  const totalPages = Math.ceil(totalItems / 50) || 1

  // Resetea página al cambiar filtros
  // biome-ignore lint/correctness/useExhaustiveDependencies: run when filters change
  useEffect(() => {
    setPage(1)
  }, [search, sources, minTimesUsed, hasPin, lastUsedStart, lastUsedEnd, minAccuracy, maxAccuracy])

  function toggleSource(src: string) {
    setSources((prev) => (prev.includes(src) ? prev.filter((s) => s !== src) : [...prev, src]))
  }

  // biome-ignore lint/suspicious/noExplicitAny: coords de AddressCaptureModal
  async function handleSaveEdit(coords: any) {
    if (!curatingAddress) return
    try {
      await editMutation.mutateAsync({
        addressId: curatingAddress.address_id,
        phone: curatingAddress.phone,
        lat: coords.lat,
        lng: coords.lng,
        reference: coords.reference,
        customerName: coords.customerName,
        prevAddress: curatingAddress,
      })
      setCuratingAddress(null)
      refetch()
    } catch (err) {
      console.error(err)
      alert('No se pudo guardar la dirección.')
    }
  }

  async function handleSetDefault(id: string) {
    try {
      await setDefaultMutation.mutateAsync(id)
      refetch()
    } catch (err) {
      console.error(err)
      alert('Error al establecer dirección por defecto.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Panel de Filtros Avanzados */}
      <div className="rounded-2xl bg-surface-container-lowest p-5 border border-outline-variant/15 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Buscador */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Búsqueda:
            </span>
            <div className="relative">
              <Icon
                name="search"
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60"
              />
              <input
                type="text"
                placeholder="Teléfono, nombre, referencia..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface-container rounded-xl border border-outline-variant/30 text-sm font-semibold placeholder:text-on-surface-variant/50 focus:outline-hidden focus:border-primary"
              />
            </div>
          </div>

          {/* Estado del Pin */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Estado del Pin GPS:
            </span>
            <select
              value={hasPin === null ? 'all' : hasPin ? 'yes' : 'no'}
              onChange={(e) => {
                const val = e.target.value
                setHasPin(val === 'all' ? null : val === 'yes')
              }}
              className="w-full rounded-xl bg-surface-container border border-outline-variant/30 px-3 py-2 text-sm font-semibold focus:outline-hidden"
            >
              <option value="all">Todos</option>
              <option value="yes">Con PIN</option>
              <option value="no">Sin PIN</option>
            </select>
          </div>

          {/* Orígenes (Sources) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Origen (Origen de datos):
            </span>
            <div className="flex flex-wrap gap-2">
              {['backfill', 'driver_verified', 'admin_curated'].map((src) => {
                const active = sources.includes(src)
                return (
                  <button
                    type="button"
                    key={src}
                    onClick={() => toggleSource(src)}
                    className={cn(
                      'px-2.5 py-1.5 rounded-xl text-[10px] font-bold tracking-wider uppercase border transition-colors',
                      active
                        ? 'bg-primary text-on-primary border-primary shadow-xs'
                        : 'bg-surface-container text-on-surface-variant border-outline-variant/30 hover:border-outline-variant',
                    )}
                  >
                    {src === 'backfill' && 'backfill'}
                    {src === 'driver_verified' && 'motorizado'}
                    {src === 'admin_curated' && 'curada'}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-outline-variant/10">
          {/* Rangos de Fecha */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Rango de último uso:
            </span>
            <div className="flex gap-2">
              <input
                type="date"
                value={lastUsedStart ?? ''}
                onChange={(e) => setLastUsedStart(e.target.value || null)}
                className="w-1/2 rounded-xl bg-surface-container border border-outline-variant/30 px-2 py-1.5 text-xs font-semibold focus:outline-hidden"
              />
              <input
                type="date"
                value={lastUsedEnd ?? ''}
                onChange={(e) => setLastUsedEnd(e.target.value || null)}
                className="w-1/2 rounded-xl bg-surface-container border border-outline-variant/30 px-2 py-1.5 text-xs font-semibold focus:outline-hidden"
              />
            </div>
          </div>

          {/* Rango de Precisión (accuracy) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Rango Precisión GPS (m):
            </span>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min accuracy"
                value={minAccuracy ?? ''}
                onChange={(e) => {
                  const val = e.target.value
                  setMinAccuracy(val !== '' ? Number(val) : null)
                }}
                className="w-1/2 rounded-xl bg-surface-container border border-outline-variant/30 px-3 py-1.5 text-xs font-semibold focus:outline-hidden"
              />
              <input
                type="number"
                placeholder="Max accuracy"
                value={maxAccuracy ?? ''}
                onChange={(e) => {
                  const val = e.target.value
                  setMaxAccuracy(val !== '' ? Number(val) : null)
                }}
                className="w-1/2 rounded-xl bg-surface-container border border-outline-variant/30 px-3 py-1.5 text-xs font-semibold focus:outline-hidden"
              />
            </div>
          </div>

          {/* Slider Pedidos Mínimos */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Pedidos mínimos:
            </span>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="50"
                value={minTimesUsed}
                onChange={(e) => setMinTimesUsed(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="font-mono text-xs bg-surface-container px-2 py-1 rounded-md font-bold text-primary shrink-0">
                {minTimesUsed} pedidos
              </span>
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
          icon="search_off"
          title="Sin resultados"
          description="Ningún registro coincide con los filtros aplicados."
        />
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/15 overflow-x-auto">
            <table className="w-full text-sm min-w-[950px]">
              <thead className="bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th className="text-left px-4 py-3">Teléfono</th>
                  <th className="text-left px-4 py-3">Nombre</th>
                  <th className="text-left px-4 py-3">Referencia</th>
                  <th className="text-left px-4 py-3">Pedidos</th>
                  <th className="text-left px-4 py-3">Último uso</th>
                  <th className="text-left px-4 py-3">Origen</th>
                  <th className="text-left px-4 py-3">GPS Pin</th>
                  <th className="text-left px-4 py-3">Precisión</th>
                  <th className="text-left px-4 py-3">Default</th>
                  <th className="text-right px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((row: any) => (
                  <tr
                    key={row.address_id}
                    className="border-t border-outline-variant/10 hover:bg-surface-container-low/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-on-surface">
                      +51 {row.phone}
                    </td>
                    <td className="px-4 py-3">
                      {row.customer_name ? (
                        <span className="font-semibold">{row.customer_name}</span>
                      ) : (
                        <span className="italic text-on-surface-variant/50">Sin nombre</span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate" title={row.reference}>
                      {row.reference || '-'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-on-surface-variant">
                      {row.times_used}
                    </td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">
                      {formatRelativeDate(row.last_used_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border',
                          row.source === 'admin_curated' &&
                            'bg-green-500/10 text-green-700 border-green-500/20',
                          row.source === 'driver_verified' &&
                            'bg-blue-500/10 text-blue-700 border-blue-500/20',
                          row.source === 'backfill' &&
                            'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
                        )}
                      >
                        {row.source === 'admin_curated' && 'curada'}
                        {row.source === 'driver_verified' && 'motorizado'}
                        {row.source === 'backfill' && 'backfill'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.lat && row.lng ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-bold">
                          <Icon name="check_circle" size={14} filled />
                          Sí (PIN)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-on-surface-variant/60 text-xs">
                          <Icon name="block" size={14} />
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">
                      {row.accuracy_m ? `~${Math.round(row.accuracy_m)}m` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {row.is_default ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary-container px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-on-primary">
                          Principal
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(row.address_id)}
                          disabled={setDefaultMutation.isPending}
                          className="text-[10px] text-primary hover:underline font-bold uppercase tracking-wider"
                        >
                          Hacer principal
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setCuratingAddress(row)}
                        >
                          <Icon name="edit" size={14} />
                          Editar
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-error hover:bg-error-container/40"
                          onClick={() => setDeletingRecord(row)}
                        >
                          <Icon name="delete" size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
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

      {/* Modal de confirmación de eliminación */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="bg-background rounded-2xl p-6 max-w-md w-full border border-outline-variant/30 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-foreground">¿Eliminar registro de la agenda?</h3>
            <p className="text-sm text-muted-foreground">
              ¿Estás seguro de eliminar la dirección de <strong>+51 {deletingRecord.phone}</strong>?
              Esto NO borrará los pedidos del teléfono, solo eliminará el registro de la agenda.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeletingRecord(null)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                className="bg-red-600 hover:bg-red-700 text-white border-none"
                onClick={async () => {
                  try {
                    await deleteMutation.mutateAsync({
                      addressId: deletingRecord.address_id,
                      phone: deletingRecord.phone,
                      addressData: deletingRecord,
                    })
                    setDeletingRecord(null)
                    refetch()
                  } catch (err) {
                    console.error(err)
                    alert('No se pudo eliminar el registro.')
                  }
                }}
              >
                {deleteMutation.isPending ? 'Eliminando...' : 'Sí, eliminar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Curación */}
      {curatingAddress && (
        <AddressCaptureModal
          open={curatingAddress !== null}
          variant="admin"
          initialLat={curatingAddress.lat}
          initialLng={curatingAddress.lng}
          initialReference={curatingAddress.reference}
          initialCustomerName={curatingAddress.customer_name}
          onSkip={() => setCuratingAddress(null)}
          onConfirmAdmin={handleSaveEdit}
          onConfirm={() => {}}
        />
      )}
    </div>
  )
}
