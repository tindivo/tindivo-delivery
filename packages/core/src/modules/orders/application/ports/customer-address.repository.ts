export interface CustomerAddress {
  addressId: string
  phone: string
  lat: number | null
  lng: number | null
  reference: string | null
  accuracyM: number | null
  source: 'driver_verified' | 'admin_curated' | 'backfill'
  isDefault: boolean
  lastUsedAt: Date | null
  timesUsed: number
  customerName?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface AddressCaptureEvent {
  id?: string
  orderId: string | null
  driverId: string | null
  phone: string | null
  action:
    | 'shown'
    | 'confirmed'
    | 'dragged'
    | 'omitted'
    | 'navigate_clicked'
    | 'admin_captured'
    | 'admin_edited'
  accuracyReported: number | null
  distanceDraggedM: number | null
  metadata?: Record<string, any>
  createdAt?: Date
}

export interface CustomerAddressRepository {
  findById(addressId: string): Promise<CustomerAddress | null>
  findByPhone(phone: string): Promise<CustomerAddress[]>
  findDefaultByPhone(phone: string): Promise<CustomerAddress | null>
  insert(
    address: Omit<CustomerAddress, 'addressId' | 'createdAt' | 'updatedAt'>,
  ): Promise<CustomerAddress>
  update(address: CustomerAddress): Promise<void>
  logEvent(event: AddressCaptureEvent): Promise<void>
}
