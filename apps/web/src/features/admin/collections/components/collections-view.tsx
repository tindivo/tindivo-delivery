'use client'
import { ApiError } from '@tindivo/api-client'
import { Button, EmptyState, Icon } from '@tindivo/ui'
import { useMemo, useState } from 'react'
import {
  useAdminSettlements,
  useGenerateSettlements,
  useSettlementsSummary,
} from '../hooks/use-admin-collections'
import { CollectionsTabs, type TabKey } from './collections-tabs'
import { RestaurantDebtSummary } from './restaurant-debt-summary'
import { SettlementsTable } from './settlements-table'

export function CollectionsView() {
  const [tab, setTab] = useState<TabKey>('pending')
  const [filterRestaurantId, setFilterRestaurantId] = useState<string | undefined>(undefined)

  const pending = useAdminSettlements('pending', filterRestaurantId)
  const overdue = useAdminSettlements('overdue', filterRestaurantId)
  const paid = useAdminSettlements('paid', filterRestaurantId)
  const summary = useSettlementsSummary()
  const generate = useGenerateSettlements()

  const [genError, setGenError] = useState<string | null>(null)
  const [genSuccess, setGenSuccess] = useState<string | null>(null)

  const tabs = useMemo(
    () => [
      {
        key: 'pending' as const,
        label: 'Pendientes',
        icon: 'schedule',
        count: pending.data?.items.length ?? 0,
        amount: sumAmount(pending.data?.items),
      },
      {
        key: 'overdue' as const,
        label: 'Vencidas',
        icon: 'warning',
        count: overdue.data?.items.length ?? 0,
        amount: sumAmount(overdue.data?.items),
      },
      {
        key: 'paid' as const,
        label: 'Pagadas',
        icon: 'check_circle',
        count: paid.data?.items.length ?? 0,
      },
      {
        key: 'by_restaurant' as const,
        label: 'Por restaurante',
        icon: 'storefront',
        count: summary.data?.items.length ?? 0,
      },
    ],
    [pending.data, overdue.data, paid.data, summary.data],
  )

  async function handleGenerate() {
    setGenError(null)
    setGenSuccess(null)
    try {
      const res = await generate.mutateAsync(undefined)
      const count = res.generated.length
      setGenSuccess(
        count === 0
          ? 'No había pedidos entregados la semana anterior.'
          : `Se ${count === 1 ? 'generó' : 'generaron'} ${count} liquidacion${count === 1 ? '' : 'es'}.`,
      )
    } catch (err) {
      setGenError(humanizeError(err))
    }
  }

  const activeQuery =
    tab === 'pending' ? pending : tab === 'overdue' ? overdue : tab === 'paid' ? paid : null

  const showingRestaurantFilter = tab !== 'by_restaurant' && filterRestaurantId

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="bleed-text font-black text-3xl text-on-surface">Cobros</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Gestiona las liquidaciones semanales de comisión y registra los pagos recibidos.
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={generate.isPending} size="md">
          <Icon name="refresh" />
          {generate.isPending ? 'Generando…' : 'Generar liquidaciones'}
        </Button>
      </header>

      {(genError || genSuccess) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            genError
              ? 'border-red-300 bg-red-50 text-red-800'
              : 'border-emerald-300 bg-emerald-50 text-emerald-800'
          }`}
        >
          {genError ?? genSuccess}
        </div>
      )}

      <CollectionsTabs active={tab} onChange={setTab} tabs={tabs} />

      {showingRestaurantFilter && (
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <Icon name="filter_alt" size={14} />
          <span>Filtrando por restaurante.</span>
          <button
            type="button"
            onClick={() => setFilterRestaurantId(undefined)}
            className="text-primary font-bold hover:underline"
          >
            Quitar filtro
          </button>
        </div>
      )}

      {tab === 'by_restaurant' ? (
        <RestaurantDebtSummary
          onSelectRestaurant={(id) => {
            setFilterRestaurantId(id)
            setTab('pending')
          }}
        />
      ) : activeQuery && (activeQuery.data?.items.length ?? 0) === 0 && !activeQuery.isLoading ? (
        <EmptyState
          icon={tab === 'paid' ? 'history' : 'payments'}
          title={
            tab === 'paid'
              ? 'Aún no has registrado pagos'
              : tab === 'overdue'
                ? 'Ninguna liquidación vencida'
                : 'No hay liquidaciones pendientes'
          }
          description={
            tab === 'pending'
              ? 'Si aún no has generado la liquidación de la semana, usa el botón "Generar liquidaciones".'
              : undefined
          }
        />
      ) : activeQuery ? (
        <SettlementsTable
          items={activeQuery.data?.items ?? []}
          isLoading={activeQuery.isLoading}
          mode={tab as 'pending' | 'overdue' | 'paid'}
        />
      ) : null}
    </div>
  )
}

function sumAmount(items?: { total_amount: number }[]): number {
  if (!items || items.length === 0) return 0
  return items.reduce((acc, it) => acc + Number(it.total_amount), 0)
}

function humanizeError(err: unknown): string {
  if (err instanceof ApiError) return err.problem.detail ?? err.problem.title
  return 'No se pudo generar las liquidaciones.'
}
