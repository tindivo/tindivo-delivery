'use client'
import { supabase } from '@/lib/supabase/client'
import { useState } from 'react'

const BUCKET = 'restaurant-menu-images'
const MAX_BYTES = 3 * 1024 * 1024
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp']

type Result = { url: string } | { error: string }

export function useUploadBusinessImage() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(file: File, restaurantId: string): Promise<Result> {
    setError(null)
    if (!ALLOWED.includes(file.type)) {
      const msg = 'Formato no permitido. Usa PNG, JPG o WEBP.'
      setError(msg)
      return { error: msg }
    }
    if (file.size > MAX_BYTES) {
      const msg = 'La imagen supera 3 MB.'
      setError(msg)
      return { error: msg }
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
      const path = `${restaurantId}/items/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      })
      if (upErr) {
        const msg = `No se pudo subir la imagen: ${upErr.message}`
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
