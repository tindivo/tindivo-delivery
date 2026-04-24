'use client'
import { Icon, Skeleton } from '@tindivo/ui'
import { useSettlementsSummary } from '../hooks/use-admin-collections'

type Props = {
  onSelectRestaurant: (restaurantId: string) => void
}

export function RestaurantDebtSummary({ onSelectRestaurant }: Props) {
  const { data, isLoading } = useSettlementsSummary()
  const items = data?.items ?? []

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl p-10 text-center bg-surface-container-lowest border border-outline-variant/15">
        <Icon name="storefront" size={32} className="text-on-surface-variant/60" />
        <p className="mt-3 text-on-surface-variant">No hay restaurantes activos.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {items.map((r) => (
        <div
          key={r.restaurantId}
          className="rounded-2xl bg-surface-container-lowest border border-outline-variant/15 p-5 space-y-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="inline-block w-8 h-8 rounded-xl border border-black/10 shrink-0"
                style={{ background: `#${r.accentColor}` }}
              />
              <div>
                <h3 className="font-bold text-lg leading-tight">{r.restaurantName}</h3>
                <p className="text-xs text-on-surface-variant font-mono">
                  {r.yapeNumber ? `Yape +51 ${r.yapeNumber}` : 'Sin Yape registrado'}
                </p>
              </div>
            </div>
            {r.qrUrl && (
              <a
                href={r.qrUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline shrink-0"
              >
                <Icon name="qr_code" size={14} />
                Ver QR
              </a>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <MiniStat
              label="Deuda total"
              value={`S/ ${r.balanceDue.toFixed(2)}`}
              tone={r.balanceDue > 0 ? 'warn' : 'muted'}
            />
            <MiniStat
              label="Pendiente"
              value={`S/ ${r.pendingAmount.toFixed(2)}`}
              hint={`${r.pendingCount} liquidaciones`}
              tone={r.pendingCount > 0 ? 'warn' : 'muted'}
            />
            <MiniStat
              label="Vencido"
              value={`S/ ${r.overdueAmount.toFixed(2)}`}
              hint={r.overdueCount > 0 ? `${r.overdueCount} vencidas` : 'Sin atrasos'}
              tone={r.overdueCount > 0 ? 'danger' : 'muted'}
            />
            <MiniStat label="Último pago" value={formatDate(r.lastPaidAt)} tone="muted" />
          </div>

          <div>
            <button
              type="button"
              onClick={() => onSelectRestaurant(r.restaurantId)}
              className="inline-flex items-center gap-1 text-primary font-bold text-xs hover:underline"
            >
              Ver liquidaciones
              <Icon name="chevron_right" size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function MiniStat({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string
  tone: 'warn' | 'danger' | 'muted'
}) {
  const color =
    tone === 'danger'
      ? 'text-red-700'
      : tone === 'warn'
        ? 'text-on-surface'
        : 'text-on-surface-variant'
  return (
    <div className="rounded-xl bg-surface-container-low/40 border border-outline-variant/10 p-3">
      <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">{label}</p>
      <p className={`font-bold text-base ${color}`}>{value}</p>
      {hint && <p className="text-[11px] text-on-surface-variant mt-0.5">{hint}</p>}
    </div>
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' })
  } catch {
    return '—'
  }
}
