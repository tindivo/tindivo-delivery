'use client'
import { orders } from '@/lib/api/client'
import { useMutation } from '@tanstack/react-query'
import { normalizeToE164Pe } from '@tindivo/core'
import { Badge, Icon, WaLinkButton } from '@tindivo/ui'

type Props = {
  orderId: string
  phone: string
  shortId: string
  trackingUrl: string
  restaurantName: string
  driverFirstName: string
  alreadySentAt: string | null
}

export function SendTrackingButton({
  orderId,
  phone,
  shortId,
  trackingUrl,
  restaurantName,
  driverFirstName,
  alreadySentAt,
}: Props) {
  const e164 = normalizeToE164Pe(phone) ?? phone
  const message = `Hola! Tu pedido #${shortId} de ${restaurantName} ya está en camino con ${driverFirstName}. Sigue la entrega en vivo aquí: ${trackingUrl}`

  const logSent = useMutation({
    mutationFn: () => orders.logTrackingLinkSent(orderId),
  })

  if (alreadySentAt) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="success">
          <Icon name="check_circle" size={14} filled /> Enviado
        </Badge>
        <span className="text-xs text-on-surface-variant">
          {new Date(alreadySentAt).toLocaleString('es-PE')}
        </span>
      </div>
    )
  }

  return (
    <>
      <p className="text-sm text-on-surface-variant">
        Abre WhatsApp Web/App con el mensaje pre-rellenado para el cliente.
      </p>
      <WaLinkButton
        phoneE164={e164}
        message={message}
        label="Enviar link al cliente"
        onSent={() => logSent.mutate()}
      />
    </>
  )
}
