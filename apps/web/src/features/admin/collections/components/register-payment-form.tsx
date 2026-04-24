'use client'
import { ApiError } from '@tindivo/api-client'
import { Button, Icon, Label } from '@tindivo/ui'
import { useState } from 'react'
import { useMarkSettlementPaid } from '../hooks/use-admin-collections'

type PaymentMethod = 'yape' | 'plin' | 'bank_transfer' | 'cash' | 'other'

const METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'yape', label: 'Yape', icon: 'smartphone' },
  { value: 'plin', label: 'Plin', icon: 'smartphone' },
  { value: 'bank_transfer', label: 'Transferencia', icon: 'account_balance' },
  { value: 'cash', label: 'Efectivo', icon: 'payments' },
  { value: 'other', label: 'Otro', icon: 'more_horiz' },
]

type Props = {
  settlementId: string
  amount: number
  onSuccess: () => void
  onCancel: () => void
}

export function RegisterPaymentForm({ settlementId, amount, onSuccess, onCancel }: Props) {
  const markPaid = useMarkSettlementPaid()
  const [method, setMethod] = useState<PaymentMethod>('yape')
  const [note, setNote] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    try {
      await markPaid.mutateAsync({
        id: settlementId,
        body: {
          paymentMethod: method,
          paymentNote: note.trim() || undefined,
        },
      })
      onSuccess()
    } catch (err) {
      setErrorMsg(humanizeError(err))
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl p-4 bg-white border border-outline-variant/30"
    >
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-sm">
          Registrar pago de <span className="font-mono">S/ {amount.toFixed(2)}</span>
        </h4>
        <button
          type="button"
          onClick={onCancel}
          className="text-on-surface-variant hover:text-on-surface"
          aria-label="Cerrar"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      <div>
        <Label>Método de pago</Label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2">
          {METHODS.map((m) => {
            const active = method === m.value
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => setMethod(m.value)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-colors ${
                  active
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-outline-variant/40 bg-surface-container-lowest hover:bg-surface-container-low'
                }`}
              >
                <Icon name={m.icon} size={20} />
                <span className="text-xs">{m.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <Label htmlFor={`note-${settlementId}`}>Nota del pago (opcional)</Label>
        <textarea
          id={`note-${settlementId}`}
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 300))}
          maxLength={300}
          rows={2}
          placeholder="ID de transacción, operación Yape, etc."
          className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-4 py-2 text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 resize-none"
        />
        <p className="text-xs text-on-surface-variant mt-1">{note.length}/300</p>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
          {errorMsg}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="md" disabled={markPaid.isPending}>
          <Icon name="check" />
          {markPaid.isPending ? 'Guardando…' : 'Confirmar pago'}
        </Button>
        <Button type="button" variant="secondary" size="md" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

function humanizeError(err: unknown): string {
  if (err instanceof ApiError) return err.problem.detail ?? err.problem.title
  return 'No se pudo registrar el pago. Intenta de nuevo.'
}
