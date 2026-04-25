import type { Tables } from '@tindivo/supabase'
import { Order, type OrderProps } from '../domain/entities/order'
import { Coordinates } from '../domain/value-objects/coordinates'
import { DriverId } from '../domain/value-objects/driver-id'
import { Money } from '../domain/value-objects/money'
import { OrderId } from '../domain/value-objects/order-id'
import { OrderStatus } from '../domain/value-objects/order-status'
import { PaymentIntent } from '../domain/value-objects/payment-intent'
import { PrepTime } from '../domain/value-objects/prep-time'
import { RestaurantId } from '../domain/value-objects/restaurant-id'
import { ShortId } from '../domain/value-objects/short-id'

type OrderRow = Tables<'orders'>

/**
 * Parsea coordenadas de PostGIS desde el cliente supabase-js.
 * Supabase devuelve POINT como string WKT o GeoJSON según config.
 * Aquí asumimos que usamos select con RPC custom o que el driver
 * parsea como GeoJSON {type:'Point',coordinates:[lng,lat]}.
 */
function parseGeoPoint(value: unknown): { lat: number; lng: number } | null {
  if (!value) return null
  if (typeof value === 'object' && value !== null && 'coordinates' in value) {
    const coords = (value as { coordinates: [number, number] }).coordinates
    return { lng: coords[0], lat: coords[1] }
  }
  return null
}

export const OrderMapper = {
  toDomain(row: OrderRow): Order {
    const deliveryPoint = parseGeoPoint(row.delivery_coordinates)

    const props: OrderProps = {
      id: OrderId.of(row.id),
      shortId: ShortId.of(row.short_id),
      restaurantId: RestaurantId.of(row.restaurant_id),
      driverId: row.driver_id ? DriverId.of(row.driver_id) : null,
      status: OrderStatus.of(row.status),
      prepTime: PrepTime.of(row.prep_minutes),
      payment: PaymentIntent.create(
        row.payment_status,
        Money.pen(Number(row.order_amount)),
        row.client_pays_with != null ? Money.pen(Number(row.client_pays_with)) : null,
      ),
      deliveryFee: Money.pen(Number(row.delivery_fee)),
      appearsInQueueAt: new Date(row.appears_in_queue_at),
      estimatedReadyAt: new Date(row.estimated_ready_at),
      clientPhone: row.client_phone,
      deliveryCoordinates: deliveryPoint
        ? Coordinates.of(deliveryPoint.lat, deliveryPoint.lng)
        : null,
      deliveryMapsUrl: row.delivery_maps_url,
      deliveryAddress: row.delivery_address,
      extensionUsed: row.extension_used,
      readyEarlyUsed: row.ready_early_used,
      notes: row.notes,
      trackingLinkSentAt: row.tracking_link_sent_at ? new Date(row.tracking_link_sent_at) : null,
      trackingLinkSentBy: row.tracking_link_sent_by,
      acceptedAt: row.accepted_at ? new Date(row.accepted_at) : null,
      headingAt: row.heading_at ? new Date(row.heading_at) : null,
      waitingAt: row.waiting_at ? new Date(row.waiting_at) : null,
      receivedAt: row.received_at ? new Date(row.received_at) : null,
      pickedUpAt: row.picked_up_at ? new Date(row.picked_up_at) : null,
      deliveredAt: row.delivered_at ? new Date(row.delivered_at) : null,
      cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : null,
      cancelReason: row.cancel_reason,
      acceptCountdownSeconds: row.accept_countdown_seconds,
      prepExtendedAt: row.prep_extended_at ? new Date(row.prep_extended_at) : null,
      prepExtensionMinutes:
        row.prep_extension_minutes === 5 || row.prep_extension_minutes === 10
          ? row.prep_extension_minutes
          : null,
      readyEarlyAt: row.ready_early_at ? new Date(row.ready_early_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
    return Order.rehydrate(props)
  },

  toInsertRow(order: Order) {
    const p = order.props
    return {
      id: p.id.value,
      short_id: p.shortId.value,
      restaurant_id: p.restaurantId.value,
      driver_id: p.driverId?.value ?? null,
      status: p.status.value,
      prep_minutes: p.prepTime.minutes,
      estimated_ready_at: p.estimatedReadyAt.toISOString(),
      appears_in_queue_at: p.appearsInQueueAt.toISOString(),
      order_amount: p.payment.orderAmount.amount,
      delivery_fee: p.deliveryFee.amount,
      payment_status: p.payment.status,
      client_pays_with: p.payment.clientPaysWith?.amount ?? null,
      change_to_give: p.payment.changeToGive?.amount ?? null,
      notes: p.notes,
      extension_used: p.extensionUsed,
      ready_early_used: p.readyEarlyUsed,
    }
  },

  toUpdateRow(order: Order) {
    const p = order.props
    return {
      driver_id: p.driverId?.value ?? null,
      status: p.status.value,
      estimated_ready_at: p.estimatedReadyAt.toISOString(),
      appears_in_queue_at: p.appearsInQueueAt.toISOString(),
      client_phone: p.clientPhone,
      delivery_coordinates: p.deliveryCoordinates
        ? `POINT(${p.deliveryCoordinates.lng} ${p.deliveryCoordinates.lat})`
        : null,
      delivery_address: p.deliveryAddress,
      extension_used: p.extensionUsed,
      ready_early_used: p.readyEarlyUsed,
      tracking_link_sent_at: p.trackingLinkSentAt?.toISOString() ?? null,
      tracking_link_sent_by: p.trackingLinkSentBy,
      accepted_at: p.acceptedAt?.toISOString() ?? null,
      heading_at: p.headingAt?.toISOString() ?? null,
      waiting_at: p.waitingAt?.toISOString() ?? null,
      received_at: p.receivedAt?.toISOString() ?? null,
      picked_up_at: p.pickedUpAt?.toISOString() ?? null,
      delivered_at: p.deliveredAt?.toISOString() ?? null,
      cancelled_at: p.cancelledAt?.toISOString() ?? null,
      cancel_reason: p.cancelReason,
      accept_countdown_seconds: p.acceptCountdownSeconds,
      prep_extended_at: p.prepExtendedAt?.toISOString() ?? null,
      prep_extension_minutes: p.prepExtensionMinutes,
      ready_early_at: p.readyEarlyAt?.toISOString() ?? null,
    }
  },
}
