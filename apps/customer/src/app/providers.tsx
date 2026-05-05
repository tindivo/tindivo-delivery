'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useState } from 'react'

/**
 * Providers de `apps/customer`. A diferencia de `apps/web`, no incluimos
 * `RealtimeAuthBridge` — el cliente es anónimo y el tracking se suscribe
 * con anon key sin necesidad de sincronizar JWT con el WebSocket.
 *
 * Cuando agreguemos cuentas de cliente (rol `customer`), agregar aquí
 * el bridge equivalente.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 15_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
