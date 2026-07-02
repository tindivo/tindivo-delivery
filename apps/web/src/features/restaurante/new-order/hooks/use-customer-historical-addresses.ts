'use client'
import { api } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'

export type HistoricalAddress = {
  address_id: string
  customer_name: string | null
  reference: string
  is_default: boolean
  times_used: number
  last_used_at: string | null
  has_gps: boolean
}

export type HistoricalAddressesResponse = {
  phone: string
  addresses: HistoricalAddress[]
}

export function useCustomerHistoricalAddresses(phone: string, enabled: boolean) {
  return useQuery({
    queryKey: ['customer-historical-addresses', phone],
    queryFn: async () => {
      if (!phone || phone.length !== 9) return null
      try {
        const res = await api.get<HistoricalAddressesResponse>(
          `/restaurant/customers/${phone}/addresses`
        )
        return res
      } catch (err) {
        console.error('Error fetching historical customer addresses:', err)
        return null
      }
    },
    enabled: enabled && phone.length === 9,
    staleTime: 5 * 60 * 1000, // 5 minutes stale time
    gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
  })
}
