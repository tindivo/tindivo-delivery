/**
 * Perfil del cliente final que se registró en tindivo.com. Tipo simple
 * (no aggregate root) porque la lógica de mutación es trivial: el cliente
 * solo edita sus propios datos. Reglas de invariante validadas en el VO
 * y a nivel BD (CHECK constraints).
 */
export type CustomerProfile = {
  userId: string
  fullName: string
  phone: string | null
  defaultAddress: string | null
  defaultReference: string | null
  defaultCoordinates: { lat: number; lng: number } | null
  defaultLocationAccuracyM: number | null
  createdAt: Date
  updatedAt: Date
}

export type CustomerProfileUpdate = Partial<
  Pick<
    CustomerProfile,
    | 'fullName'
    | 'phone'
    | 'defaultAddress'
    | 'defaultReference'
    | 'defaultCoordinates'
    | 'defaultLocationAccuracyM'
  >
>
