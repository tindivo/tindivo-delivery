'use client'
import { driver } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'

/**
 * Carga los montos S/ que Tindivo cobra al restaurante por banda de
 * distancia. Lo usa el modal de pickup para mostrar la comisión al lado
 * de cada botón ("Cerca · S/ 3.00" / "Lejos · S/ 3.50"). Cache largo
 * (10 min) porque la config cambia muy poco.
 */
export function useDistanceCommissions() {
  return useQuery({
    queryKey: ['driver', 'distance-commissions'],
    queryFn: () => driver.getDistanceCommissions(),
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  })
}
