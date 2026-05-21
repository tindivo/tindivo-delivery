'use client'
import { type Coordinates, buildGoogleMapsDirectionsUrl } from '@tindivo/core'
import { useCallback, useState } from 'react'

type Destination = Coordinates | { address: string }

/**
 * Hook para abrir Google Maps Directions usando la ubicacion actual del
 * usuario como `origin`. Solicita permiso de geolocalizacion al navegador
 * en la primera invocacion; si el usuario rechaza o el GPS tarda mas de
 * 4 s, abre Google Maps sin `origin`.
 *
 * Requisitos: HTTPS o localhost. En `http://192.168.x.x` desde movil real
 * el navegador bloquea geolocation.
 */
export function useGeolocatedNavigation() {
  const [isLocating, setIsLocating] = useState(false)

  const navigate = useCallback(
    async (destination: Destination) => {
      if (isLocating) return
      setIsLocating(true)

      let origin: Coordinates | undefined
      try {
        if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
          origin = await new Promise<Coordinates | undefined>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              () => resolve(undefined),
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
          : buildGoogleMapsDirectionsUrl(destination, { origin, travelMode: 'driving' })

      openExternalMapsUrl(url)
    },
    [isLocating],
  )

  return { navigate, isLocating }
}

/**
 * iOS Safari/PWA bloquea con frecuencia navegaciones `_blank` que ocurren
 * despues de un `await` (por ejemplo, esperar geolocation). En iOS usamos
 * navegacion same-window con Universal Links de Google Maps; en Android y
 * desktop mantenemos `_blank`.
 */
function openExternalMapsUrl(url: string): void {
  if (isIOSLike()) {
    window.location.assign(url)
    return
  }

  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function isIOSLike(): boolean {
  const platform = navigator.platform ?? ''
  const ua = navigator.userAgent ?? ''
  return /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function buildAddressUrl(address: string, origin?: Coordinates): string {
  const params = new URLSearchParams({
    api: '1',
    destination: address,
    travelmode: 'driving',
  })
  if (origin) params.set('origin', `${origin.lat},${origin.lng}`)
  return `https://www.google.com/maps/dir/?${params.toString()}`
}
