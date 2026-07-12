/**
 * Utilidades puras para generar URLs de mapas y WhatsApp.
 * Zero dependencias externas — aptas para dominio y UI.
 */

export type Coordinates = { lat: number; lng: number }

export type TravelMode = 'driving' | 'walking' | 'bicycling' | 'two-wheeler'

/**
 * Calcula la distancia en metros entre dos coordenadas usando la fórmula
 * de Haversine. Precisión típica ~0.3% para distancias terrestres.
 */
export function haversineDistance(a: Coordinates, b: Coordinates): number {
  const toRad = (x: number) => (x * Math.PI) / 180
  const R = 6371e3 // Earth radius in meters
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const aVal =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal))
  return Math.round(R * c)
}

/**
 * Genera URL de Google Maps Directions para navegar al destino.
 * Formato: https://www.google.com/maps/dir/?api=1&destination=lat,lng&travelmode=driving
 */
export function buildGoogleMapsDirectionsUrl(
  destination: Coordinates,
  opts: { travelMode?: TravelMode; origin?: Coordinates } = {},
): string {
  const travelmode = opts.travelMode ?? 'driving'
  const params = new URLSearchParams({
    api: '1',
    destination: `${destination.lat},${destination.lng}`,
    travelmode,
  })
  if (opts.origin) {
    params.set('origin', `${opts.origin.lat},${opts.origin.lng}`)
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

/**
 * Genera URL de Google Maps Search (punto fijo, sin ruta).
 */
export function buildGoogleMapsSearchUrl(coords: Coordinates): string {
  return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`
}

/**
 * Genera URL wa.me para enviar mensaje pre-rellenado al cliente.
 */
export function buildWaMeUrl(phoneE164: string, message: string): string {
  const cleanPhone = phoneE164.replace(/[^\d]/g, '')
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
}
