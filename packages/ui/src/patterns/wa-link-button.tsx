import { buildWaMeUrl } from '@tindivo/core'
import type { ReactNode } from 'react'
import { Icon } from '../icons/icon'
import { cn } from '../lib/cn'

type Props = {
  phoneE164: string
  message: string
  label?: ReactNode
  onSent?: () => void
  disabled?: boolean
  className?: string
}

export function WaLinkButton({ phoneE164, message, label, onSent, disabled, className }: Props) {
  const url = buildWaMeUrl(phoneE164, message)

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        if (!disabled) onSent?.()
      }}
      aria-disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl',
        'bg-emerald-500 text-white font-bold tracking-wide',
        'shadow-[0_4px_20px_rgba(16,185,129,0.25)]',
        'hover:shadow-[0_10px_40px_rgba(16,185,129,0.35)]',
        'transition-all duration-300 active:scale-95',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      <Icon name="chat" size={20} filled />
      {label ?? 'Enviar por WhatsApp'}
    </a>
  )
}
