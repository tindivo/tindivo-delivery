'use client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Antes esta ruta mostraba el form de datos del cliente. Ahora ese form vive
// inline en el detalle del pedido durante el estado waiting_at_restaurant
// para eliminar tiempo muerto del driver. Mantenemos el redirect para
// preservar bookmarks y notificaciones antiguas.
export default function PickupPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  useEffect(() => {
    router.replace(`/motorizado/pedidos/${params.id}`)
  }, [params.id, router])

  return null
}
