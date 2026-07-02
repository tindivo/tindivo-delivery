'use client'
import { Button, Icon, IconButton, cn } from '@tindivo/ui'
import { useEffect, useState } from 'react'
import type { HistoricalAddress } from '../hooks/use-customer-historical-addresses'

interface AddressSuggestionPopupProps {
  isOpen: boolean
  phone: string
  addresses: HistoricalAddress[]
  onConfirm: (
    selected: { delivery_reference: string; client_name: string; address_id: string } | null,
  ) => void
  onClose: () => void
}

function getRelativeTimeString(dateStr: string): string {
  if (!dateStr) return ''
  const past = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - past.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60))
      return `hace ${Math.max(1, diffMins)} min`
    }
    return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`
  }
  if (diffDays === 1) return 'ayer'
  if (diffDays < 7) return `hace ${diffDays} días`
  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 4) return `hace ${diffWeeks} ${diffWeeks === 1 ? 'semana' : 'semanas'}`
  const diffMonths = Math.floor(diffDays / 30)
  return `hace ${diffMonths} ${diffMonths === 1 ? 'mes' : 'meses'}`
}

export function AddressSuggestionPopup({
  isOpen,
  phone,
  addresses,
  onConfirm,
  onClose,
}: AddressSuggestionPopupProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | 'new'>(0)

  // Listen for Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || addresses.length === 0) return null

  const isMultiple = addresses.length >= 2
  const clientName = addresses[0]?.customer_name || 'Cliente'

  const handleApplySingle = () => {
    const addr = addresses[0]
    if (addr) {
      onConfirm({
        delivery_reference: addr.reference,
        client_name: addr.customer_name || 'Cliente',
        address_id: addr.address_id,
      })
    }
  }

  const handleApplyMultiple = () => {
    if (selectedIndex === 'new') {
      onConfirm(null)
    } else {
      const addr = addresses[selectedIndex]
      if (addr) {
        onConfirm({
          delivery_reference: addr.reference,
          client_name: addr.customer_name || 'Cliente',
          address_id: addr.address_id,
        })
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Container */}
      <div
        className={cn(
          'relative bg-surface-container-lowest rounded-[28px] border border-outline-variant/15 shadow-2xl w-full flex flex-col overflow-hidden max-h-[90vh] animate-in fade-in zoom-in-95 duration-200',
          isMultiple ? 'max-w-md' : 'max-w-sm',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3 border-b border-outline-variant/10">
          <div className="flex items-center gap-2">
            <Icon
              name={isMultiple ? 'fact_check' : 'contact_phone'}
              className="text-primary"
              size={24}
            />
            <h3 className="text-base font-black text-on-surface tracking-tight">
              {isMultiple
                ? 'Este cliente tiene varias direcciones'
                : 'Cliente frecuente encontrado'}
            </h3>
          </div>
          <IconButton onClick={onClose} variant="ghost" size="sm" aria-label="Cerrar">
            <Icon name="close" />
          </IconButton>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Subtitle with client details */}
          <div className="p-3 bg-surface-container-low rounded-2xl flex items-center gap-3 border border-outline-variant/5">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
              {clientName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-on-surface-variant font-bold">Cliente</p>
              <h4 className="text-sm font-black text-on-surface truncate">{clientName}</h4>
              <p className="text-[11px] text-on-surface-variant font-medium">Celular: {phone}</p>
            </div>
          </div>

          {!isMultiple ? (
            /* CASE A: Single historical address */
            <div className="space-y-4">
              <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider">
                    <Icon name="location_on" size={14} />
                    <span>Dirección registrada</span>
                  </div>
                  {addresses[0]?.is_default && (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300/30">
                      <Icon name="star" size={10} filled />
                      Principal
                    </span>
                  )}
                </div>
                <p className="text-sm font-black text-on-surface leading-snug whitespace-pre-wrap break-words">
                  {addresses[0]?.reference}
                </p>
                <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-bold mt-1">
                  {addresses[0]?.last_used_at && (
                    <span>Último pedido: {getRelativeTimeString(addresses[0].last_used_at)}</span>
                  )}
                  {addresses[0]?.has_gps && (
                    <span className="text-primary flex items-center gap-0.5">
                      <Icon name="gps_fixed" size={11} />
                      Ubicación GPS
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button onClick={handleApplySingle} className="w-full" size="lg">
                  <Icon name="check" size={18} />
                  Usar esta dirección
                </Button>
                <Button
                  onClick={() => onConfirm(null)}
                  variant="secondary"
                  className="w-full"
                  size="lg"
                >
                  Escribir otra
                </Button>
              </div>
            </div>
          ) : (
            /* CASE B: Multiple historical addresses */
            <div className="space-y-4">
              <p className="text-xs text-on-surface-variant font-semibold">
                Selecciona la dirección donde desea recibir el pedido actual:
              </p>

              <div className="space-y-2.5 max-h-[35vh] overflow-y-auto pr-1">
                {addresses.map((addr, idx) => {
                  const isSelected = selectedIndex === idx
                  return (
                    <label
                      key={`${addr.reference}-${idx}`}
                      className={cn(
                        'flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer select-none',
                        isSelected
                          ? 'bg-primary/5 border-primary/40 shadow-xs'
                          : addr.is_default
                            ? 'bg-amber-50/20 border-amber-200/50 hover:border-amber-300'
                            : 'bg-surface border-outline-variant/10 hover:border-outline-variant/30',
                      )}
                    >
                      <input
                        type="radio"
                        name="suggested-address"
                        checked={isSelected}
                        onChange={() => setSelectedIndex(idx)}
                        className="mt-0.5 h-4 w-4 shrink-0 text-primary focus:ring-primary border-outline-variant/40"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-black text-on-surface leading-snug break-words flex-1">
                            {addr.reference}
                          </p>
                          {addr.is_default && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300/20 shrink-0">
                              <Icon name="star" size={8} filled />
                              Principal
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-bold text-on-surface-variant">
                          <span>{addr.customer_name || 'Sin nombre'}</span>
                          {addr.last_used_at && (
                            <>
                              <span className="text-outline-variant">•</span>
                              <span>{getRelativeTimeString(addr.last_used_at)}</span>
                            </>
                          )}
                          <span className="text-outline-variant">•</span>
                          <span className="text-primary/80">
                            {addr.times_used} {addr.times_used === 1 ? 'pedido' : 'pedidos'}
                          </span>
                          {addr.has_gps && (
                            <>
                              <span className="text-outline-variant">•</span>
                              <span className="text-primary flex items-center gap-0.5">
                                <Icon name="gps_fixed" size={10} />
                                GPS
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </label>
                  )
                })}

                {/* Option for writing a new address */}
                <label
                  className={cn(
                    'flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer select-none',
                    selectedIndex === 'new'
                      ? 'bg-primary/5 border-primary/40 shadow-xs'
                      : 'bg-surface border-outline-variant/10 hover:border-outline-variant/30',
                  )}
                >
                  <input
                    type="radio"
                    name="suggested-address"
                    checked={selectedIndex === 'new'}
                    onChange={() => setSelectedIndex('new')}
                    className="h-4 w-4 shrink-0 text-primary focus:ring-primary border-outline-variant/40"
                  />
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon name="add" size={16} className="text-on-surface-variant shrink-0" />
                    <span className="text-xs font-black text-on-surface">
                      Escribir dirección nueva
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={onClose} variant="secondary" className="flex-1" size="lg">
                  Cancelar
                </Button>
                <Button onClick={handleApplyMultiple} className="flex-1" size="lg">
                  Confirmar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
