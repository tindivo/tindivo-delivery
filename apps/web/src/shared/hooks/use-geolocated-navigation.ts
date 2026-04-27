'use client'
import { type Coordinates, buildGoogleMapsDirectionsUrl } from '@tindivo/core'
import { useCallback, useState } from 'react'

type Destination = Coordinates | { address: string }

/**
 * Hook para abrir Google Maps Directions usando la ubicación actual del
 * usuario como `origin`. Solicita permiso de geolocalización al navegador
 * en la primera invocación; si el usuario rechaza o el GPS tarda más de
 * 4 s, abre Google Maps sin `origin` (Google detecta la ubicación por su
 * cuenta — fallback gracioso).
 *
 * Requisitos: HTTPS o localhost. En `http://192.168.x.x` desde móvil real
 * el navegador bloquea geolocation.
 *
 * Uso:
 *   const { navigate, isLocating } = useGeolocatedNavigation()
 *   <button onClick={() => navigate({ lat, lng })} disabled={isLocating}>...
 */
export function useGeolocatedNavigation() {
  const [isLocating, setIsLocating] = useState(false)

  const navigate = useCallback(
    async (destination: Destination) => {
      if (isLocating) return // guard: previene doble apertura por doble-click
      setIsLocating(true)

      let origin: Coordinates | undefined
      try {
        if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
          origin = await new Promise<Coordinates | undefined>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              () => resolve(undefined), // permiso denegado / timeout / unavailable → fallback
              { enableHighAccuracy: true, timeout: 4000, maximumAge: 30_000 },
            )
          })
        }
      } finally {
        setIsLocating(false)
      }

      const url =
        'address' in destination
          ? buildAddressUrl(destination.address, origin)
          : buildGoogleMapsDirectionsUrl(destination, { origin, travelMode: 'two-wheeler' })

      openInNewTab(url)
    },
    [isLocating],
  )

  return { navigate, isLocating }
}

/**
 * `window.open(_, '_blank')` falla silenciosamente en iOS Safari standalone
 * (PWA instalada) — el sistema bloquea la apertura sin error. El patrón que
 * sí respeta el gesto del usuario es disparar un click sintético sobre un
 * `<a target="_blank">` creado al vuelo: Safari lo trata como navegación
 * iniciada por el usuario y deep-linkea a Google Maps app si está instalada
 * (Universal Links). En Android y desktop también funciona.
 */
function openInNewTab(url: string): void {
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/**
 * Variante para destino por dirección de texto (cuando no tenemos
 * coordenadas precisas del destino). `buildGoogleMapsDirectionsUrl` solo
 * acepta Coordinates, así que construimos la URL aquí.
 */
function buildAddressUrl(address: string, origin?: Coordinates): string {
  const params = new URLSearchParams({
    api: '1',
    destination: address,
    travelmode: 'driving',
  })
  if (origin) params.set('origin', `${origin.lat},${origin.lng}`)
  return `https://www.google.com/maps/dir/?${params.toString()}`
}
