import { problemCode } from '@/lib/http/problem'

export function restaurantCatalogMoved() {
  return problemCode(
    'BUSINESS_CATALOG_MOVED',
    410,
    'La gestion del catalogo publico se movio a tindivo.com. Usa una cuenta de negocio para administrar menu, fotos y agregados.',
  )
}
