'use client'
import { Icon, cn } from '@tindivo/ui'
import { useState } from 'react'
import { EventosCapturaView } from './eventos-captura-view'
import { PorCurarView } from './por-curar-view'
import { TodosRegistrosView } from './todos-registros-view'

export function AgendaTabs() {
  const [activeTab, setActiveTab] = useState<'curar' | 'todos' | 'eventos'>('curar')

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <h1 className="bleed-text font-black text-2xl md:text-3xl text-on-surface">
          Agenda de Clientes
        </h1>
        <p className="text-on-surface-variant text-xs md:text-sm max-w-2xl">
          Cura las ubicaciones de los clientes recurrentes, gestiona las direcciones de la agenda, y
          audita los eventos de captura de GPS.
        </p>
      </header>

      {/* Tabs Switcher Header */}
      <div className="flex border-b border-outline-variant/15 gap-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('curar')}
          className={cn(
            'flex items-center gap-2 pb-3 text-sm font-bold border-b-2 transition-all px-1 whitespace-nowrap',
            activeTab === 'curar'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface',
          )}
        >
          <Icon name="cleaning_services" size={18} />
          Por curar
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('todos')}
          className={cn(
            'flex items-center gap-2 pb-3 text-sm font-bold border-b-2 transition-all px-1 whitespace-nowrap',
            activeTab === 'todos'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface',
          )}
        >
          <Icon name="contacts" size={18} />
          Todos los registros
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('eventos')}
          className={cn(
            'flex items-center gap-2 pb-3 text-sm font-bold border-b-2 transition-all px-1 whitespace-nowrap',
            activeTab === 'eventos'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface',
          )}
        >
          <Icon name="history" size={18} />
          Eventos de captura
        </button>
      </div>

      {/* Content Area */}
      <div className="pt-2">
        {activeTab === 'curar' && <PorCurarView />}
        {activeTab === 'todos' && <TodosRegistrosView />}
        {activeTab === 'eventos' && <EventosCapturaView />}
      </div>
    </div>
  )
}
