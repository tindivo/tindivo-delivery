import type { ServerClient } from '@tindivo/supabase'
import { PersistenceError } from '../../../shared/errors/domain-error'
import type {
  AddressCaptureEvent,
  CustomerAddress,
  CustomerAddressRepository,
} from '../application/ports/customer-address.repository'

export class SupabaseCustomerAddressRepository implements CustomerAddressRepository {
  constructor(private readonly sb: ServerClient) {}

  private mapToDomain(row: any): CustomerAddress {
    return {
      addressId: row.address_id,
      phone: row.phone,
      lat: row.lat,
      lng: row.lng,
      reference: row.reference,
      accuracyM: row.accuracy_m,
      source: row.source,
      isDefault: row.is_default,
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : null,
      timesUsed: row.times_used,
      customerName: row.customer_name,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }

  async findById(addressId: string): Promise<CustomerAddress | null> {
    const { data, error } = await this.sb
      .from('customer_addresses')
      .select('*')
      .eq('address_id', addressId)
      .maybeSingle()

    if (error) {
      throw new PersistenceError(error.message, error)
    }
    return data ? this.mapToDomain(data) : null
  }

  async findByPhone(phone: string): Promise<CustomerAddress[]> {
    const { data, error } = await this.sb
      .from('customer_addresses')
      .select('*')
      .eq('phone', phone)
      .order('created_at', { ascending: false })

    if (error) {
      throw new PersistenceError(error.message, error)
    }
    return (data ?? []).map((row) => this.mapToDomain(row))
  }

  async findDefaultByPhone(phone: string): Promise<CustomerAddress | null> {
    const { data, error } = await this.sb
      .from('customer_addresses')
      .select('*')
      .eq('phone', phone)
      .eq('is_default', true)
      .maybeSingle()

    if (error) {
      throw new PersistenceError(error.message, error)
    }
    return data ? this.mapToDomain(data) : null
  }

  async insert(
    address: Omit<CustomerAddress, 'addressId' | 'createdAt' | 'updatedAt'>,
  ): Promise<CustomerAddress> {
    const { data, error } = await this.sb
      .from('customer_addresses')
      .insert({
        phone: address.phone,
        lat: address.lat,
        lng: address.lng,
        reference: address.reference,
        accuracy_m: address.accuracyM,
        source: address.source,
        is_default: address.isDefault,
        last_used_at: address.lastUsedAt?.toISOString() ?? null,
        times_used: address.timesUsed,
        customer_name: address.customerName ?? null,
      })
      .select()
      .single()

    if (error) {
      throw new PersistenceError(error.message, error)
    }
    return this.mapToDomain(data)
  }

  async update(address: CustomerAddress): Promise<void> {
    const { error } = await this.sb
      .from('customer_addresses')
      .update({
        lat: address.lat,
        lng: address.lng,
        reference: address.reference,
        accuracy_m: address.accuracyM,
        source: address.source,
        is_default: address.isDefault,
        last_used_at: address.lastUsedAt?.toISOString() ?? null,
        times_used: address.timesUsed,
        customer_name: address.customerName ?? null,
      })
      .eq('address_id', address.addressId)

    if (error) {
      throw new PersistenceError(error.message, error)
    }
  }

  async logEvent(event: AddressCaptureEvent): Promise<void> {
    const { error } = await this.sb.from('address_capture_events').insert({
      order_id: event.orderId,
      driver_id: event.driverId,
      phone: event.phone,
      action: event.action,
      accuracy_reported: event.accuracyReported,
      distance_dragged_m: event.distanceDraggedM,
      metadata: event.metadata ?? {},
    })

    if (error) {
      throw new PersistenceError(error.message, error)
    }
  }
}
