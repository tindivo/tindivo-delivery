'use client'
import { DebtSummaryList } from './debt-summary-list'
import { PaymentsHistoryList } from './payments-history-list'

export function PaymentsView() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="bleed-text font-black text-2xl md:text-3xl text-on-surface">Cobros</h1>
        <p className="text-on-surface-variant text-xs md:text-sm mt-1">
          Liquida la deuda de cada restaurante con un pago manual. El monto se descuenta
          inmediatamente del balance.
        </p>
      </header>

      <DebtSummaryList />
      <PaymentsHistoryList />
    </div>
  )
}
