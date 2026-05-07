'use client'
import { ApiError } from '@tindivo/api-client'
import { Button, ColorDot, Icon, MoneyInput } from '@tindivo/ui'
import { useEffect, useState } from 'react'
import { useRegisterPayment } from '../hooks/use-admin-payments'

type PaymentMethod = 'yape' | 'plin' | 'bank_transfer' | 'cash' | 'other'

const METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'yape', label: 'Yape', icon: 'qr_code_2' },
  { value: 'plin', label: 'Plin', icon: 'qr_code' },
  { value: 'bank_transfer', label: 'Transferencia', icon: 'account_balance' },
  { value: 'cash', label: 'Efectivo', icon: 'payments' },
  { value: 'other', label: 'Otro', icon: 'more_horiz' },
]

type Props = {
  restaurantId: string
  restaurantName: string
  accentColor: string
  balanceDue: number
  onClose: () => void
}

export function RegisterPaymentSheet({
  restaurantId,
  restaurantName,
  accentColor,
  balanceDue,
  onClose,
}: Props) {
  const [amountText, setAmountText] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('yape')
  const [note, setNote] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const register = useRegisterPayment()

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const amount = Number(amountText.replace(',', '.'))
  const amountValid = !Number.isNaN(amount) && amount > 0 && amount <= balanceDue + 0.001

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setErrorMsg(null)
    if (!amountValid) {
      setErrorMsg(`Ingresa un monto entre S/ 0.01 y S/ ${balanceDue.toFixed(2)}.`)
      return
    }
    try {
      await register.mutateAsync({
        restaurantId,
        amount: Number(amount.toFixed(2)),
        paymentMethod: method,
        paymentNote: note.trim() || undefined,
      })
      onClose()
    } catch (err) {
      setErrorMsg(humanizeError(err))
    }
  }

  return (
    <dialog
      open
      className="fixed inset-0 z-[200] m-0 w-full h-full max-w-none max-h-none flex items-end sm:items-center justify-center bg-transparent"
      style={{ background: 'rgba(0, 0, 0, 0.55)' }}
      aria-label={`Registrar pago de ${restaurantName}`}
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: 'transparent' }}
      />

      <form
        onSubmit={handleSubmit}
        className="relative w-full sm:max-w-md bg-surface-container-lowest rounded-t-[28px] sm:rounded-[28px] p-6"
        style={{ boxShadow: '0 -16px 40px -12px rgba(0, 0, 0, 0.25)' }}
      >
        <header className="flex items-start gap-3 mb-5">
          <ColorDot color={accentColor} size={32} />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-on-surface-variant">
              Registrar pago
            </div>
            <h3 className="font-black text-lg leading-tight mt-0.5 truncate">{restaurantName}</h3>
            <p className="text-on-surface-variant text-xs mt-1">
              Deuda actual: <span className="font-semibold">S/ {balanceDue.toFixed(2)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-container"
            aria-label="Cerrar"
          >
            <Icon name="close" size={20} />
          </button>
        </header>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="payment-amount"
              className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2"
            >
              Monto
            </label>
            <MoneyInput
              id="payment-amount"
              placeholder={`Hasta S/ ${balanceDue.toFixed(2)}`}
              value={amountText}
              onChange={(ev) => setAmountText(ev.target.value)}
              autoFocus
              required
            />
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setAmountText(balanceDue.toFixed(2))}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Pagar todo (S/ {balanceDue.toFixed(2)})
              </button>
            </div>
          </div>

          <div>
            <div className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
              Método
            </div>
            <div className="grid grid-cols-2 gap-2">
              {METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMethod(m.value)}
                  className={`inline-flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-semibold border transition-colors ${
                    method === m.value
                      ? 'bg-primary-container text-on-primary-container border-primary'
                      : 'bg-surface-container border-outline-variant/40 text-on-surface'
                  }`}
                >
                  <Icon name={m.icon} size={18} />
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="payment-note"
              className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2"
            >
              Nota (opcional)
            </label>
            <textarea
              id="payment-note"
              value={note}
              onChange={(ev) => setNote(ev.target.value)}
              rows={2}
              maxLength={300}
              placeholder="Ej: Recibido el 7 de mayo a las 14:30"
              className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-4 py-3 text-sm placeholder:text-on-surface-variant resize-none focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800">
            {errorMsg}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2">
          <Button size="lg" disabled={register.isPending || !amountValid}>
            <Icon name="check_circle" size={20} filled />
            {register.isPending ? 'Registrando…' : 'Registrar pago'}
          </Button>
          <button
            type="button"
            onClick={onClose}
            disabled={register.isPending}
            className="w-full inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface font-bold tracking-wide active:scale-95 disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
      </form>
    </dialog>
  )
}

function humanizeError(err: unknown): string {
  if (err instanceof ApiError) return err.problem.detail ?? err.problem.title
  return 'No se pudo registrar el pago. Intenta de nuevo.'
}
