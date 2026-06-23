'use client'
import { supabase } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'

export function useCustomerAddresses(phone: string, enabled: boolean) {
  return useQuery({
    queryKey: ['customer-addresses', phone],
    queryFn: async () => {
      if (!phone) return []
      const { data, error } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('phone', phone)
        .order('last_used_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: enabled && phone.length === 9,
  })
}
