'use client'
import { ColorDot, Icon, Skeleton } from '@tindivo/ui'
import { useAdminPaymentsHistory } from '../hooks/use-admin-payments'

const METHOD_LABEL: Record<string, { label: string; icon: string }> = {
  yape: { label: 'Yape', icon: 'qr_code_2' },
  plin: { label: 'Plin', icon: 'qr_code' },
  bank_transfer: { label: 'Transferencia', icon: 'account_balance' },
  cash: { label: 'Efectivo', icon: 'payments' },
  other: { label: 'Otro', icon: 'more_horiz' },
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function PaymentsHistoryList() {
  const { data, isLoading } = useAdminPaymentsHistory()
  const items = data?.items ?? []

  return (
    <section className="space-y-4">
      <header>
        <h2 className="bleed-text font-black text-xl text-on-surface">Historial de pagos</h2>
        <p className="text-on-surface-variant text-xs mt-1">
          Pagos manuales registrados, ordenados del más reciente al más antiguo.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl p-10 text-center bg-surface-container-lowest border border-outline-variant/15">
          <Icon name="receipt_long" size={28} className="text-on-surface-variant/60" />
          <p className="mt-3 text-on-surface-variant text-sm">
            Aún no se han registrado pagos manuales.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/15 overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead className="bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-left px-4 py-3">Restaurante</th>
                <th className="text-left px-4 py-3">Método</th>
                <th className="text-right px-4 py-3">Monto</th>
                <th className="text-left px-4 py-3">Nota</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => {
                const m = METHOD_LABEL[p.paymentMethod] ?? {
                  label: p.paymentMethod,
                  icon: 'payments',
                }
                return (
                  <tr
                    key={p.id}
                    className="border-t border-outline-variant/10 hover:bg-surface-container-low/50"
                  >
                    <td className="px-4 py-3 text-xs text-on-surface-variant whitespace-nowrap">
                      {formatDate(p.paidAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <ColorDot color={p.restaurantAccentColor} size={14} />
                        <span className="font-semibold">{p.restaurantName}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs">
                        <Icon name={m.icon} size={14} />
                        {m.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-emerald-700 whitespace-nowrap">
                      S/ {p.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant max-w-xs truncate">
                      {p.paymentNote ?? <span className="text-on-surface-variant/50">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
