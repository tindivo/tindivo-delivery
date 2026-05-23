import { z } from 'zod'
import {
  AccentColorSchema,
  CoordinatesSchema,
  MoneyPenSchema,
  PhonePeSchema,
  ShortIdSchema,
  TimestampSchema,
  UuidSchema,
} from '../common'
import { CancellationReason, OrderStatus, PaymentStatus, VehicleType } from '../enums'

/* ─────────────── Request DTOs ─────────────── */

/**
 * Dos bandas de distancia que el motorizado declara al recoger el pedido.
 * Tindivo cobra una comisión fija al restaurante según la banda. Es
 * declarativo: confiamos en el juicio del driver (considera tráfico, ruta
 * real, etc.). Los montos por banda están en
 * `app_settings.delivery_distance_commissions` y se aplican al pickup
 * sobre `orders.delivery_fee`.
 */
export const DELIVERY_DISTANCE_BANDS = ['near', 'far'] as const
export const DeliveryDistanceBand = z.enum(DELIVERY_DISTANCE_BANDS)
export type DeliveryDistanceBand = z.infer<typeof DeliveryDistanceBand>

/**
 * Comisiones que Tindivo cobra al restaurante por pedido entregado según
 * la banda de distancia declarada por el motorizado al recoger. Mostrado
 * en la UI del driver para que sepa cuánto cobrará Tindivo antes de
 * elegir la banda. Fuente: `app_settings.delivery_distance_commissions`.
 */
export const DeliveryDistanceCommissionsResponse = z.object({
  near: MoneyPenSchema,
  far: MoneyPenSchema,
})
export type DeliveryDistanceCommissionsResponse = z.infer<
  typeof DeliveryDistanceCommissionsResponse
>

export const CreateOrderRequest = z
  .object({
    prepMinutes: z
      .number()
      .int()
      .min(10)
      .max(50)
      .refine((minutes) => minutes % 5 === 0, 'prepMinutes debe ir en intervalos de 5 minutos'),
    paymentStatus: PaymentStatus,
    orderAmount: MoneyPenSchema,
    yapeAmount: MoneyPenSchema.optional(),
    cashAmount: MoneyPenSchema.optional(),
    clientPaysWith: MoneyPenSchema.optional(),
    notes: z.string().max(300).optional(),
    /**
     * Datos del cliente que el restaurante registra al crear el pedido. Los
     * tres son OBLIGATORIOS porque la card del motorizado los usa como
     * identificación primaria (nombre prominente + dirección/referencia)
     * en lugar del código del pedido. Si el restaurante intenta crear sin
     * ellos, el endpoint rechaza con 400. El driver puede corregirlos en
     * waiting_at_restaurant si hay errores.
     */
    clientName: z.string().trim().min(1, 'El nombre del cliente es obligatorio').max(80),
    clientPhone: PhonePeSchema,
    deliveryReference: z
      .string()
      .trim()
      .min(1, 'La dirección o referencia es obligatoria')
      .max(500),
  })
  .refine(
    (v) =>
      v.paymentStatus !== 'pending_cash' ||
      (v.clientPaysWith !== undefined && v.clientPaysWith >= v.orderAmount),
    {
      message: 'clientPaysWith requerido y ≥ orderAmount cuando paymentStatus es pending_cash',
      path: ['clientPaysWith'],
    },
  )
  .refine(
    (v) => {
      if (v.paymentStatus !== 'pending_mixed') {
        return v.yapeAmount === undefined && v.cashAmount === undefined
      }
      if (v.yapeAmount === undefined || v.cashAmount === undefined) return false
      if (v.yapeAmount <= 0 || v.cashAmount <= 0) return false
      return Math.round((v.yapeAmount + v.cashAmount) * 100) === Math.round(v.orderAmount * 100)
    },
    {
      message:
        'pending_mixed requiere yapeAmount y cashAmount > 0 que sumen orderAmount; otros estados no aceptan estos campos',
      path: ['yapeAmount'],
    },
  )
  .refine(
    (v) =>
      v.paymentStatus !== 'pending_mixed' ||
      v.clientPaysWith === undefined ||
      (v.cashAmount !== undefined && v.clientPaysWith >= v.cashAmount),
    {
      message: 'clientPaysWith debe ser ≥ cashAmount en pending_mixed',
      path: ['clientPaysWith'],
    },
  )
export type CreateOrderRequest = z.infer<typeof CreateOrderRequest>

/**
 * Body para PATCH /restaurant/orders/:id — el restaurante edita campos del
 * pedido antes de que el driver lo recoja. Permitido en estados
 * waiting_driver, heading_to_restaurant, waiting_at_restaurant.
 *
 * Todos los campos son opcionales: si solo viene `clientName`, solo se
 * actualiza el nombre. Si viene `paymentStatus`, deben venir todos los
 * derivados necesarios para ese método (mismas reglas que CreateOrder).
 */
export const EditOrderByRestaurantRequest = z
  .object({
    clientName: z.string().trim().min(1).max(80).nullable().optional(),
    paymentStatus: PaymentStatus.optional(),
    orderAmount: MoneyPenSchema.optional(),
    yapeAmount: MoneyPenSchema.optional(),
    cashAmount: MoneyPenSchema.optional(),
    clientPaysWith: MoneyPenSchema.optional(),
  })
  .refine(
    (v) =>
      v.clientName !== undefined ||
      v.paymentStatus !== undefined ||
      v.orderAmount !== undefined ||
      v.yapeAmount !== undefined ||
      v.cashAmount !== undefined ||
      v.clientPaysWith !== undefined,
    { message: 'Debe enviar al menos un campo a editar' },
  )
  .refine(
    (v) => {
      // Si cambia el método o el monto, el resto de campos derivados se
      // validan según el método final (efectivo requiere clientPaysWith,
      // mixto requiere yape+cash, etc.). El UseCase termina la validación.
      if (v.paymentStatus === 'pending_cash') {
        return v.clientPaysWith !== undefined && v.orderAmount !== undefined
          ? v.clientPaysWith >= v.orderAmount
          : true
      }
      return true
    },
    {
      message: 'clientPaysWith debe ser ≥ orderAmount cuando paymentStatus es pending_cash',
      path: ['clientPaysWith'],
    },
  )
  .refine(
    (v) => {
      if (v.paymentStatus !== 'pending_mixed') return true
      if (v.yapeAmount === undefined || v.cashAmount === undefined || v.orderAmount === undefined)
        return false
      if (v.yapeAmount <= 0 || v.cashAmount <= 0) return false
      return Math.round((v.yapeAmount + v.cashAmount) * 100) === Math.round(v.orderAmount * 100)
    },
    {
      message: 'pending_mixed requiere yapeAmount y cashAmount > 0 que sumen orderAmount',
      path: ['yapeAmount'],
    },
  )
export type EditOrderByRestaurantRequest = z.infer<typeof EditOrderByRestaurantRequest>

export const ChangePaymentMethodRequest = z
  .object({
    paymentStatus: PaymentStatus.refine((s) => s !== 'prepaid', {
      message: 'No se permite convertir a prepaid desde el motorizado',
    }),
    yapeAmount: MoneyPenSchema.optional(),
    cashAmount: MoneyPenSchema.optional(),
    clientPaysWith: MoneyPenSchema.optional(),
  })
  .refine(
    (v) => {
      if (v.paymentStatus !== 'pending_mixed') {
        return v.yapeAmount === undefined && v.cashAmount === undefined
      }
      if (v.yapeAmount === undefined || v.cashAmount === undefined) return false
      return v.yapeAmount > 0 && v.cashAmount > 0
    },
    {
      message:
        'pending_mixed requiere yapeAmount y cashAmount > 0; otros estados no aceptan estos campos',
      path: ['yapeAmount'],
    },
  )
  .refine(
    (v) =>
      v.paymentStatus !== 'pending_mixed' ||
      v.clientPaysWith === undefined ||
      (v.cashAmount !== undefined && v.clientPaysWith >= v.cashAmount),
    {
      message: 'clientPaysWith debe ser ≥ cashAmount en pending_mixed',
      path: ['clientPaysWith'],
    },
  )
export type ChangePaymentMethodRequest = z.infer<typeof ChangePaymentMethodRequest>

/**
 * Payload del endpoint `POST /driver/orders/[id]/delivered`.
 *
 * Permite al motorizado registrar el método real al entregar:
 * - `unchanged`: el plan original se cumplió (default si no se manda body).
 * - `cash_exact`: el cliente pagó exacto y el driver mantiene el vuelto
 *   adelantado por el restaurante (caso pending_cash/mixed con change > 0).
 * - `change_to`: cambio total de método (mismos campos que ChangePaymentMethod).
 */
export const MarkDeliveredRequest = z
  .object({
    payment: z
      .discriminatedUnion('kind', [
        z.object({ kind: z.literal('unchanged') }),
        z.object({ kind: z.literal('cash_exact') }),
        z.object({
          kind: z.literal('change_to'),
          paymentStatus: PaymentStatus,
          yapeAmount: MoneyPenSchema.optional(),
          cashAmount: MoneyPenSchema.optional(),
          clientPaysWith: MoneyPenSchema.optional(),
        }),
      ])
      .default({ kind: 'unchanged' }),
  })
  .superRefine((data, ctx) => {
    if (data.payment.kind !== 'change_to') return
    const p = data.payment
    if (p.paymentStatus === 'prepaid') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['payment', 'paymentStatus'],
        message: 'No se permite convertir a prepaid desde el motorizado',
      })
      return
    }
    if (p.paymentStatus === 'pending_mixed') {
      if (
        p.yapeAmount === undefined ||
        p.cashAmount === undefined ||
        p.yapeAmount <= 0 ||
        p.cashAmount <= 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['payment', 'yapeAmount'],
          message: 'pending_mixed requiere yapeAmount y cashAmount > 0',
        })
      }
      if (
        p.clientPaysWith !== undefined &&
        p.cashAmount !== undefined &&
        p.clientPaysWith < p.cashAmount
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['payment', 'clientPaysWith'],
          message: 'clientPaysWith debe ser ≥ cashAmount en pending_mixed',
        })
      }
    } else {
      if (p.yapeAmount !== undefined || p.cashAmount !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['payment', 'yapeAmount'],
          message: 'yapeAmount/cashAmount solo aplican en pending_mixed',
        })
      }
    }
  })
export type MarkDeliveredRequest = z.infer<typeof MarkDeliveredRequest>

export const RequestExtensionRequest = z.object({
  additionalMinutes: z.union([z.literal(5), z.literal(10)]),
})
export type RequestExtensionRequest = z.infer<typeof RequestExtensionRequest>

export const CancelOrderRequest = z.object({
  reason: z.string().min(3).max(300),
  reasonCode: CancellationReason.optional(),
})
export type CancelOrderRequest = z.infer<typeof CancelOrderRequest>

export const MarkArrivedRequest = z.object({
  readyOnArrival: z.boolean().optional(),
})
export type MarkArrivedRequest = z.infer<typeof MarkArrivedRequest>

/**
 * Razones predefinidas con las que el driver puede rechazar una asignación.
 * Mantener sincronizada con la UI (`reject-assignment-sheet.tsx`).
 */
export const REJECTION_REASONS = [
  'too_far',
  'backpack_full',
  'not_convenient',
  'mechanical_issue',
  'other',
] as const

export const RejectionReason = z.enum(REJECTION_REASONS)
export type RejectionReason = z.infer<typeof RejectionReason>

export const RejectAssignmentRequest = z.object({
  reason: RejectionReason,
})
export type RejectAssignmentRequest = z.infer<typeof RejectAssignmentRequest>

/**
 * Razones predefinidas con las que el motorizado puede transferir su pedido
 * activo a otro compañero. Mantener sincronizada con la UI
 * (`transfer-order-sheet.tsx`).
 */
export const TRANSFER_REASONS = [
  'accident',
  'mechanical_issue',
  'personal_emergency',
  'other',
] as const
export const TransferReason = z.enum(TRANSFER_REASONS)
export type TransferReason = z.infer<typeof TransferReason>

export const TransferOrderRequest = z.object({
  toDriverId: UuidSchema,
  reason: TransferReason,
})
export type TransferOrderRequest = z.infer<typeof TransferOrderRequest>

export const DriverPeerItem = z.object({
  driverId: UuidSchema,
  fullName: z.string(),
  vehicleType: VehicleType,
  activeSlots: z.number().int().min(0),
  reservedSlots: z.number().int().min(0),
})
export type DriverPeerItem = z.infer<typeof DriverPeerItem>

export const ListPeersResponse = z.object({
  items: z.array(DriverPeerItem),
})
export type ListPeersResponse = z.infer<typeof ListPeersResponse>

/**
 * Body para POST /driver/orders/:id/picked-up. El driver declara:
 *   - occupancySlots: ocupación en su mochila (1..N, default 1, max
 *     configurable por admin via assignment_rules.maxOccupancySlotsPerOrder).
 *   - deliveryDistanceBand: qué tan lejos está el cliente (near/medium/far).
 *     Obligatorio para diferenciar comisiones al restaurante.
 */
export const MarkPickedUpRequest = z.object({
  occupancySlots: z.number().int().min(1).max(10),
  deliveryDistanceBand: DeliveryDistanceBand,
})
export type MarkPickedUpRequest = z.infer<typeof MarkPickedUpRequest>

/**
 * Body para POST /driver/orders/:id/customer-data — el driver guarda los
 * datos del cliente mientras espera en el local. NO transiciona el status.
 *
 * Regla "al menos uno": el driver debe marcar el destino en el mapa
 * (deliveryCoordinates) o escribir una referencia textual
 * (deliveryReference). Ambos individualmente son opcionales pero al menos
 * uno es obligatorio — resuelve el caso de drivers que no logran ubicar
 * la dirección exacta en el mapa con el tiempo en contra.
 */
export const SaveCustomerDataRequest = z
  .object({
    clientPhone: PhonePeSchema,
    deliveryCoordinates: CoordinatesSchema.optional(),
    deliveryAddress: z.string().max(200).optional(),
    deliveryReference: z.string().trim().min(1).max(500).optional(),
  })
  .refine((v) => v.deliveryCoordinates !== undefined || v.deliveryReference !== undefined, {
    message: 'Debes marcar el destino en el mapa o escribir una referencia',
    path: ['deliveryReference'],
  })
export type SaveCustomerDataRequest = z.infer<typeof SaveCustomerDataRequest>

export const EditClientPhoneRequest = z.object({
  clientPhone: PhonePeSchema,
  reason: z.string().min(3).max(300),
})
export type EditClientPhoneRequest = z.infer<typeof EditClientPhoneRequest>

export const ReassignOrderRequest = z.object({
  newDriverId: UuidSchema,
  reason: z.string().min(3).max(300),
})
export type ReassignOrderRequest = z.infer<typeof ReassignOrderRequest>

export const AdminOrderFiltersRequest = z.object({
  status: OrderStatus.optional(),
  restaurantId: UuidSchema.optional(),
  driverId: UuidSchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  search: z.string().max(100).optional(),
})
export type AdminOrderFiltersRequest = z.infer<typeof AdminOrderFiltersRequest>

/* ─────────────── Response DTOs ─────────────── */

export const OrderSummaryResponse = z.object({
  id: UuidSchema,
  shortId: ShortIdSchema,
  status: OrderStatus,
  restaurantId: UuidSchema,
  restaurantName: z.string(),
  restaurantAccentColor: AccentColorSchema,
  driverId: UuidSchema.nullable(),
  driverName: z.string().nullable(),
  orderAmount: MoneyPenSchema,
  deliveryFee: MoneyPenSchema,
  paymentStatus: PaymentStatus,
  yapeAmount: MoneyPenSchema.nullable(),
  cashAmount: MoneyPenSchema.nullable(),
  prepMinutes: z.number().int(),
  estimatedReadyAt: TimestampSchema,
  appearsInQueueAt: TimestampSchema,
  clientPhone: PhonePeSchema.nullable(),
  clientName: z.string().nullable(),
  /**
   * Dirección o referencia textual del destino, opcional para pedidos
   * legacy (~28% son NULL en producción) pero obligatorio para pedidos
   * nuevos creados desde el restaurante. La card del motorizado lo muestra
   * como subtítulo bajo el nombre del cliente.
   */
  deliveryReference: z.string().nullable(),
  trackingLinkSentAt: TimestampSchema.nullable(),
  /**
   * Cola "Urgente": null = no urgente, timestamp = momento en que entró a la
   * cola urgente (post-timeout o post-rechazo). Frontend muestra badge rojo
   * en pedidos con valor; el ordenamiento del endpoint los pone primero.
   */
  urgentSince: TimestampSchema.nullable(),
  createdAt: TimestampSchema,
})
export type OrderSummaryResponse = z.infer<typeof OrderSummaryResponse>

export const OrderStatusChangeResponse = z.object({
  status: OrderStatus,
  changedAt: TimestampSchema,
  changedBy: UuidSchema.nullable(),
  notes: z.string().nullable(),
})
export type OrderStatusChangeResponse = z.infer<typeof OrderStatusChangeResponse>

export const OrderDetailResponse = OrderSummaryResponse.extend({
  clientPaysWith: MoneyPenSchema.nullable(),
  changeToGive: MoneyPenSchema.nullable(),
  deliveryCoordinates: CoordinatesSchema.nullable(),
  deliveryMapsUrl: z.string().url().nullable(),
  deliveryAddress: z.string().nullable(),
  deliveryReference: z.string().nullable(),
  cancelReason: z.string().nullable(),
  extensionUsed: z.boolean(),
  readyEarlyUsed: z.boolean(),
  statusHistory: z.array(OrderStatusChangeResponse),
  acceptedAt: TimestampSchema.nullable(),
  headingAt: TimestampSchema.nullable(),
  waitingAt: TimestampSchema.nullable(),
  receivedAt: TimestampSchema.nullable(),
  pickedUpAt: TimestampSchema.nullable(),
  deliveredAt: TimestampSchema.nullable(),
  cancelledAt: TimestampSchema.nullable(),
  acceptCountdownSeconds: z.number().int().nullable(),
  prepExtendedAt: TimestampSchema.nullable(),
  prepExtensionMinutes: z.union([z.literal(5), z.literal(10)]).nullable(),
  readyEarlyAt: TimestampSchema.nullable(),
})
export type OrderDetailResponse = z.infer<typeof OrderDetailResponse>

export const CreateOrderResponse = z.object({
  id: UuidSchema,
  shortId: ShortIdSchema,
  status: OrderStatus,
  estimatedReadyAt: TimestampSchema,
  appearsInQueueAt: TimestampSchema,
  changeToGive: MoneyPenSchema.nullable(),
})
export type CreateOrderResponse = z.infer<typeof CreateOrderResponse>

export const AcceptOrderResponse = z.object({
  id: UuidSchema,
  status: OrderStatus,
  acceptedAt: TimestampSchema,
})
export type AcceptOrderResponse = z.infer<typeof AcceptOrderResponse>

export const ClaimUrgentOrderResponse = z.object({
  id: UuidSchema,
  status: OrderStatus,
  acceptedAt: TimestampSchema,
  driverId: UuidSchema,
})
export type ClaimUrgentOrderResponse = z.infer<typeof ClaimUrgentOrderResponse>

/* ─────────────── Equipo (request-based transfer) ─────────────── */

/** Item de la pestaña Equipo: order activo de OTRO driver con datos del owner. */
export const TeamOrderItem = z.object({
  id: UuidSchema,
  shortId: ShortIdSchema,
  status: OrderStatus,
  restaurantId: UuidSchema,
  restaurantName: z.string(),
  restaurantAccentColor: AccentColorSchema,
  driverId: UuidSchema,
  driverFullName: z.string(),
  driverVehicleType: VehicleType,
  orderAmount: MoneyPenSchema,
  paymentStatus: PaymentStatus,
  prepMinutes: z.number().int(),
  estimatedReadyAt: TimestampSchema,
  appearsInQueueAt: TimestampSchema,
  clientName: z.string().nullable(),
  clientPhone: PhonePeSchema.nullable(),
  /** Dirección o referencia del cliente — usada por la card del motorizado. */
  deliveryReference: z.string().nullable(),
  occupancySlots: z.number().int().min(1),
  createdAt: TimestampSchema,
  /** Si el driver autenticado ya tiene una solicitud pending para este order. */
  hasPendingRequest: z.boolean(),
})
export type TeamOrderItem = z.infer<typeof TeamOrderItem>

export const RequestOrderTransferResponse = z.object({
  transferRequestId: UuidSchema,
  expiresAt: TimestampSchema,
})
export type RequestOrderTransferResponse = z.infer<typeof RequestOrderTransferResponse>

/** Solicitud RECIBIDA por el dueño (para mostrar banner de respuesta). */
export const ReceivedTransferRequest = z.object({
  id: UuidSchema,
  orderId: UuidSchema,
  shortId: ShortIdSchema,
  restaurantName: z.string(),
  /** Driver que solicita el pedido (el "to" en BD). */
  requesterDriverId: UuidSchema,
  requesterFullName: z.string(),
  expiresAt: TimestampSchema,
  createdAt: TimestampSchema,
})
export type ReceivedTransferRequest = z.infer<typeof ReceivedTransferRequest>

export const AcceptTransferRequestResponse = z.object({
  id: UuidSchema, // order id
  status: OrderStatus,
  newDriverId: UuidSchema,
  acceptedAt: TimestampSchema,
})
export type AcceptTransferRequestResponse = z.infer<typeof AcceptTransferRequestResponse>

export const RejectTransferRequestResponse = z.object({
  id: UuidSchema, // transfer request id
  status: z.literal('rejected'),
})
export type RejectTransferRequestResponse = z.infer<typeof RejectTransferRequestResponse>

export const MarkReceivedResponse = z.object({
  id: UuidSchema,
  status: OrderStatus,
  receivedAt: TimestampSchema,
})
export type MarkReceivedResponse = z.infer<typeof MarkReceivedResponse>

export const PickedUpResponse = z.object({
  id: UuidSchema,
  status: OrderStatus,
  pickedUpAt: TimestampSchema,
  deliveryMapsUrl: z.string().url().nullable(),
  trackingUrl: z.string().url(),
  occupancySlots: z.number().int().min(1).max(10),
})
export type PickedUpResponse = z.infer<typeof PickedUpResponse>

export const RejectAssignmentResponse = z.object({
  id: UuidSchema,
  status: OrderStatus,
  rejectedAt: TimestampSchema,
})
export type RejectAssignmentResponse = z.infer<typeof RejectAssignmentResponse>

export const TransferOrderResponse = z.object({
  id: UuidSchema,
  status: OrderStatus,
  newDriverId: UuidSchema,
})
export type TransferOrderResponse = z.infer<typeof TransferOrderResponse>

export const SaveCustomerDataResponse = z.object({
  id: UuidSchema,
  status: OrderStatus,
  clientPhone: PhonePeSchema,
  deliveryCoordinates: CoordinatesSchema.nullable(),
  deliveryAddress: z.string().nullable(),
  deliveryReference: z.string().nullable(),
})
export type SaveCustomerDataResponse = z.infer<typeof SaveCustomerDataResponse>

export const ChangePaymentMethodResponse = z.object({
  id: UuidSchema,
  paymentStatus: PaymentStatus,
  orderAmount: MoneyPenSchema,
  yapeAmount: MoneyPenSchema.nullable(),
  cashAmount: MoneyPenSchema.nullable(),
  clientPaysWith: MoneyPenSchema.nullable(),
  changeToGive: MoneyPenSchema.nullable(),
})
export type ChangePaymentMethodResponse = z.infer<typeof ChangePaymentMethodResponse>
