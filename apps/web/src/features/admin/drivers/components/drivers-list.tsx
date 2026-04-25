'use client'
import { Button, Icon, Skeleton } from '@tindivo/ui'
import Link from 'next/link'
import { useAdminDrivers } from '../hooks/use-admin-drivers'

const VEHICLE_LABEL: Record<string, { icon: string; label: string }> = {
  moto: { icon: 'two_wheeler', label: 'Moto' },
  bicicleta: { icon: 'pedal_bike', label: 'Bicicleta' },
  pie: { icon: 'directions_walk', label: 'A pie' },
  auto: { icon: 'directions_car', label: 'Auto' },
}

export function DriversList() {
  const { data, isLoading } = useAdminDrivers()
  const items = data?.items ?? []

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="bleed-text font-black text-2xl md:text-3xl text-on-surface">
            Motorizados
          </h1>
          <p className="text-on-surface-variant text-xs md:text-sm mt-1">
            Gestiona la flota, edita turnos y revisa disponibilidad en tiempo real.
          </p>
        </div>
        <Link href="/admin/drivers/new" className="shrink-0">
          <Button size="md">
            <Icon name="add" />
            Nuevo motorizado
          </Button>
        </Link>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl p-10 text-center bg-surface-container-lowest border border-outline-variant/15">
          <Icon name="two_wheeler" size={32} className="text-on-surface-variant/60" />
          <p className="mt-3 text-on-surface-variant">Aún no hay motorizados registrados.</p>
          <Link href="/admin/drivers/new" className="inline-block mt-4">
            <Button size="sm">
              <Icon name="add" />
              Registrar el primero
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/15 overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">Teléfono</th>
                <th className="text-left px-4 py-3">Vehículo</th>
                <th className="text-left px-4 py-3">Placa</th>
                <th className="text-left px-4 py-3">Turno</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((d) => {
                const vehicle = VEHICLE_LABEL[d.vehicle_type] ?? {
                  icon: 'pedal_bike',
                  label: d.vehicle_type,
                }
                const available = d.driver_availability?.is_available === true
                return (
                  <tr
                    key={d.id}
                    className="border-t border-outline-variant/10 hover:bg-surface-container-low/50"
                  >
                    <td className="px-4 py-3 font-bold">{d.full_name}</td>
                    <td className="px-4 py-3 font-mono text-xs">+51 {d.phone}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs">
                        <Icon name={vehicle.icon} size={16} />
                        {vehicle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {d.license_plate ?? <span className="text-on-surface-variant">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {d.shift_start.slice(0, 5)}–{d.shift_end.slice(0, 5)}
                    </td>
                    <td className="px-4 py-3">
                      {available ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          En línea
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-on-surface-variant text-xs">
                          <span className="w-2 h-2 rounded-full bg-outline-variant" />
                          Offline
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/drivers/${d.id}`}
                        className="inline-flex items-center gap-1 text-primary font-bold text-xs hover:underline"
                      >
                        Editar
                        <Icon name="chevron_right" size={14} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
