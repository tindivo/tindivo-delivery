'use client'

export type Coords = { lat: number; lng: number }
export type LocateResult = { coords: Coords; accuracy: number }

/**
 * Wrapper Promise sobre `navigator.geolocation.getCurrentPosition`. Necesario
 * para que la PWA pueda capturar la ubicación del cliente en el checkout y
 * mandarla como `delivery_coordinates` (PostGIS POINT en BD via la columna
 * generada `delivery_lat`/`delivery_lng`).
 *
 * Timeout 12s + maximumAge 60s para tolerar GPS lento en dispositivos
 * modestos (común en San Jacinto).
 */
export async function locate(): Promise<LocateResult> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error('Geolocalización no soportada en este dispositivo')
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          coords: { lat: position.coords.latitude, lng: position.coords.longitude },
          accuracy: position.coords.accuracy,
        }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    )
  })
}
