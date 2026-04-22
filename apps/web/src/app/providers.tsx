'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { RealtimeAuthBridge } from '@/features/auth/components/realtime-auth-bridge'

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 15_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  )
  return (
    <QueryClientProvider client={client}>
      <RealtimeAuthBridge />
      {children}
    </QueryClientProvider>
  )
}
