import type { ReactNode } from 'react'
import { Icon } from '../icons/icon'

type Props = {
  icon?: string
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon = 'inbox', title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="relative flex items-center justify-center w-32 h-32 mb-6">
        <div className="absolute inset-0 bg-primary-container/10 rounded-full blur-2xl" />
        <div className="relative w-24 h-24 bg-surface-container-lowest rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(171,53,0,0.04)] border border-outline-variant/15">
          <Icon name={icon} size={48} className="text-on-surface-variant" />
        </div>
      </div>
      <h3 className="font-black text-2xl tracking-tight text-on-surface mb-2">{title}</h3>
      {description && (
        <p className="text-on-surface-variant max-w-sm mb-6">{description}</p>
      )}
      {action}
    </div>
  )
}
