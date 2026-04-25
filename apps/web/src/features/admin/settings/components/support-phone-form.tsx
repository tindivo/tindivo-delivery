'use client'
import { ApiError } from '@tindivo/api-client'
import { Button, Icon, Input, Label } from '@tindivo/ui'
import { useEffect, useState } from 'react'
import { useSupportPhoneAdmin, useUpdateSupportPhone } from '../hooks/use-support-phone-admin'

/**
 * Form para editar el teléfono de soporte Tindivo. Es el número que aparece
 * en el botón "Llamar al ..." que ve el restaurante cuando un pedido queda
 * sin driver al vencer el prep_time. 9 dígitos peruanos sin +51.
 */
export function SupportPhoneForm() {
  const { data, isLoading } = useSupportPhoneAdmin()
  const update = useUpdateSupportPhone()
  const [phone, setPhone] = useState('')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Sincroniza el input con el valor de servidor solo cuando llega data fresca.
  useEffect(() => {
    if (data) {
      setPhone(data.phone ?? '')
      setSavedAt(data.updatedAt)
    }
  }, [data])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned !== '' && !/^9\d{8}$/.test(cleaned)) {
      setErrorMsg('Ingresa un celular peruano válido (9 dígitos empezando en 9) o déjalo vacío.')
      return
    }
    try {
      const res = await update.mutateAsync(cleaned)
      setSavedAt(res.updatedAt)
    } catch (err) {
      setErrorMsg(humanize(err))
    }
  }

  return (
    <section className="max-w-xl space-y-4 rounded-2xl bg-surface-container-lowest p-6 border border-outline-variant/15">
      <div>
        <h2 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">
          Teléfono de soporte Tindivo
        </h2>
        <p className="text-xs text-on-surface-variant mt-1">
          Aparece como botón "Llamar al {phone || '...'}" en la PWA del restaurante cuando un pedido
          queda sin motorizado tras vencer el tiempo de preparación. Déjalo vacío para ocultar la
          opción de llamada.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="support-phone">Celular (9 dígitos, sin +51)</Label>
          <div className="flex items-stretch gap-2">
            <span className="inline-flex items-center px-3 rounded-xl bg-surface-container border border-outline-variant/30 text-sm font-semibold text-on-surface-variant">
              +51
            </span>
            <Input
              id="support-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
              inputMode="numeric"
              pattern="\d{9}"
              placeholder="987654321"
              className="font-mono"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMsg}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={update.isPending || isLoading} size="lg">
            <Icon name="check" />
            {update.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
          {savedAt && !update.isPending && (
            <span className="text-xs text-on-surface-variant">
              Última actualización: {formatSavedAt(savedAt)}
            </span>
          )}
        </div>
      </form>
    </section>
  )
}

function humanize(err: unknown): string {
  if (err instanceof ApiError) return err.problem.detail ?? err.problem.title
  return 'No se pudo guardar el número. Intenta de nuevo.'
}

function formatSavedAt(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Lima',
  })
}
