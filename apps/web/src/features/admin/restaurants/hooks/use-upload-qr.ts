'use client'
import { supabase } from '@/lib/supabase/client'
import { useState } from 'react'

const BUCKET = 'restaurant-qr-codes'
const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp']

type Result = { url: string } | { error: string }

/**
 * Sube la imagen QR de Yape/Plin al bucket público `restaurant-qr-codes`
 * y devuelve la URL pública. El path usa un prefijo `pending/` cuando aún
 * no hay restaurant_id (al crear); posteriormente se puede mover a
 * `restaurants/{id}/qr.{ext}` pero para MVP no es necesario — la URL es
 * self-contained.
 */
export function useUploadQr() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(file: File, restaurantId?: string | null): Promise<Result> {
    setError(null)

    if (!ALLOWED.includes(file.type)) {
      const msg = 'Formato no permitido. Usa PNG, JPG o WEBP.'
      setError(msg)
      return { error: msg }
    }
    if (file.size > MAX_BYTES) {
      const msg = 'La imagen supera 2 MB.'
      setError(msg)
      return { error: msg }
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
      const prefix = restaurantId ? `restaurants/${restaurantId}` : 'pending'
      const path = `${prefix}/qr-${Date.now()}.${ext}`

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      })

      if (upErr) {
        const msg = `No se pudo subir el QR: ${upErr.message}`
        setError(msg)
        return { error: msg }
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
      return { url: data.publicUrl }
    } finally {
      setUploading(false)
    }
  }

  return { upload, uploading, error }
}
