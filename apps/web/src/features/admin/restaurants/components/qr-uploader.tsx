'use client'
import { Icon } from '@tindivo/ui'
import { useRef, useState } from 'react'
import { useUploadQr } from '../hooks/use-upload-qr'

type Props = {
  value: string | null
  onChange: (url: string | null) => void
  restaurantId?: string | null
}

/**
 * Uploader del QR Yape/Plin del restaurante.
 *
 * - Click / drop → sube al bucket `restaurant-qr-codes` de Supabase Storage
 * - Preview inline + botón "Cambiar / Quitar"
 * - Errores inline (formato inválido, tamaño, network)
 *
 * El caller guarda la URL resultante en `qrUrl` del formulario de crear/editar.
 */
export function QrUploader({ value, onChange, restaurantId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { upload, uploading, error } = useUploadQr()
  const [dragging, setDragging] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    const result = await upload(file, restaurantId)
    if ('url' in result) onChange(result.url)
  }

  function handleDrop(ev: React.DragEvent<HTMLElement>) {
    ev.preventDefault()
    setDragging(false)
    handleFile(ev.dataTransfer.files[0])
  }

  if (value) {
    return (
      <div className="space-y-3">
        <div
          className="relative overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest"
          style={{ aspectRatio: '1 / 1', maxWidth: 240 }}
        >
          <img
            src={value}
            alt="QR Yape/Plin"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container text-sm font-semibold hover:bg-surface-container-high disabled:opacity-50"
          >
            <Icon name="refresh" size={16} />
            {uploading ? 'Subiendo...' : 'Cambiar'}
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            <Icon name="delete" size={16} />
            Quitar
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {error && <p className="text-xs text-red-700">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className="w-full rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors"
        style={{
          borderColor: dragging ? '#FF6B35' : 'rgba(225, 191, 181, 0.5)',
          background: dragging ? 'rgba(255, 107, 53, 0.05)' : 'rgba(255, 255, 255, 0.4)',
        }}
      >
        <Icon
          name={uploading ? 'progress_activity' : 'qr_code_2'}
          size={40}
          className={uploading ? 'animate-spin text-primary' : 'text-on-surface-variant'}
        />
        <p className="mt-3 text-sm font-semibold text-on-surface">
          {uploading ? 'Subiendo QR...' : 'Arrastra el QR aquí o toca para elegir'}
        </p>
        <p className="text-xs text-on-surface-variant mt-1">PNG, JPG o WEBP · máx 2 MB</p>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  )
}
