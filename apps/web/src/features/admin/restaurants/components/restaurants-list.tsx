'use client'
import { Button, Icon, Skeleton } from '@tindivo/ui'
import Link from 'next/link'
import { useAdminRestaurants } from '../hooks/use-admin-restaurants'

export function RestaurantsList() {
  const { data, isLoading } = useAdminRestaurants()
  const items = data?.items ?? []

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="bleed-text font-black text-2xl md:text-3xl text-on-surface">
            Restaurantes
          </h1>
          <p className="text-on-surface-variant text-xs md:text-sm mt-1">
            Crea, edita y gestiona los restaurantes afiliados.
          </p>
        </div>
        <Link href="/admin/restaurants/new" className="shrink-0">
          <Button size="md">
            <Icon name="add" />
            Nuevo restaurante
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
          <Icon name="restaurant" size={32} className="text-on-surface-variant/60" />
          <p className="mt-3 text-on-surface-variant">Aún no hay restaurantes registrados.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/15 overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">Color</th>
                <th className="text-left px-4 py-3">Teléfono</th>
                <th className="text-left px-4 py-3">Yape / QR</th>
                <th className="text-left px-4 py-3">Deuda</th>
                <th className="text-right px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-outline-variant/10 hover:bg-surface-container-low/50"
                >
                  <td className="px-4 py-3 font-bold">{r.name}</td>
                  <td className="px-4 py-3">
                    <span
                      aria-label={`color ${r.accent_color}`}
                      className="inline-block w-5 h-5 rounded-md border border-black/10"
                      style={{ background: `#${r.accent_color}` }}
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">+51 {r.phone}</td>
                  <td className="px-4 py-3">
                    {r.qr_url ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 text-xs">
                        <Icon name="check_circle" size={14} filled />
                        QR cargado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-on-surface-variant text-xs">
                        <Icon name="block" size={14} />
                        Sin QR
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold">S/ {Number(r.balance_due).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/restaurants/${r.id}`}
                      className="inline-flex items-center gap-1 text-primary font-bold text-xs hover:underline"
                    >
                      Editar
                      <Icon name="chevron_right" size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
