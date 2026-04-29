'use client'
import { useCallback, useEffect, useState } from 'react'

type Coords = { lat: number; lng: number }

type DraftState = {
  phone: string
  coords: Coords | null
}

const PHONE_REGEX = /^9\d{8}$/

function storageKey(orderId: string) {
  return `tindivo:driver-pickup-draft:${orderId}`
}

function readDraft(orderId: string): DraftState {
  if (typeof window === 'undefined') return { phone: '', coords: null }
  try {
    const raw = window.localStorage.getItem(storageKey(orderId))
    if (!raw) return { phone: '', coords: null }
    const parsed = JSON.parse(raw) as Partial<DraftState>
    return {
      phone: typeof parsed.phone === 'string' ? parsed.phone : '',
      coords:
        parsed.coords &&
        typeof parsed.coords.lat === 'number' &&
        typeof parsed.coords.lng === 'number'
          ? { lat: parsed.coords.lat, lng: parsed.coords.lng }
          : null,
    }
  } catch {
    return { phone: '', coords: null }
  }
}

/**
 * Maneja el draft de datos del cliente (phone + coords) durante
 * waiting_at_restaurant, persistido en localStorage por orderId. El driver
 * puede cerrar la PWA o refrescar y al volver encuentra lo que ya llenó.
 *
 * Se limpia explícitamente con clearDraft() al confirmar pickup exitoso.
 */
export function usePickupDraft(orderId: string) {
  const [phone, setPhoneState] = useState('')
  const [coords, setCoordsState] = useState<Coords | null>(null)

  useEffect(() => {
    const draft = readDraft(orderId)
    setPhoneState(draft.phone)
    setCoordsState(draft.coords)
  }, [orderId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const draft: DraftState = { phone, coords }
    try {
      window.localStorage.setItem(storageKey(orderId), JSON.stringify(draft))
    } catch {
      // Storage lleno o bloqueado: ignorar — el form sigue en memoria.
    }
  }, [orderId, phone, coords])

  const setPhone = useCallback((value: string) => {
    setPhoneState(value.replace(/\D/g, '').slice(0, 9))
  }, [])

  const setCoords = useCallback((value: Coords | null) => {
    setCoordsState(value)
  }, [])

  const clearDraft = useCallback(() => {
    setPhoneState('')
    setCoordsState(null)
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(storageKey(orderId))
    } catch {
      /* noop */
    }
  }, [orderId])

  const isValid = PHONE_REGEX.test(phone) && coords !== null

  return { phone, setPhone, coords, setCoords, isValid, clearDraft }
}
