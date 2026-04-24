import { DomainError } from '../../../../shared/errors/domain-error'
import type { OrderStatusValue } from '../value-objects/order-status'

export class OrderNotFound extends DomainError {
  readonly code = 'ORDER_NOT_FOUND'
  readonly message = 'Pedido no encontrado'
  constructor(orderId: string) {
    super({ orderId })
  }
}

export class InvalidStateTransition extends DomainError {
  readonly code = 'INVALID_STATE_TRANSITION'
  readonly message = 'Transición de estado no permitida'
  constructor(from: OrderStatusValue, to: OrderStatusValue) {
    super({ from, to })
  }
}

export class OrderNotCancellable extends DomainError {
  readonly code = 'ORDER_NOT_CANCELLABLE'
  readonly message = 'El pedido no puede cancelarse en su estado actual'
  constructor(status: OrderStatusValue) {
    super({ status })
  }
}

export class OrderAlreadyAccepted extends DomainError {
  readonly code = 'ORDER_ALREADY_ACCEPTED'
  readonly message = 'El pedido ya fue aceptado por otro motorizado'
}

export class RaceCondition extends DomainError {
  readonly code = 'RACE_CONDITION'
  readonly message = 'Operación no aplicable por cambio concurrente'
  constructor(orderId: string) {
    super({ orderId })
  }
}

export class OutsideOperatingHours extends DomainError {
  readonly code = 'OUTSIDE_OPERATING_HOURS'
  readonly message = 'Fuera del horario operativo del servicio'
}

export class DriverCapacityExceeded extends DomainError {
  readonly code = 'DRIVER_CAPACITY_EXCEEDED'
  readonly message = 'El motorizado excede su capacidad de pedidos activos'
}

export class PrepTimeExtensionLimit extends DomainError {
  readonly code = 'PREP_TIME_EXTENSION_LIMIT'
  readonly message = 'Ya se usó la prórroga de tiempo para este pedido'
}

export class NoPrepTimeToReduce extends DomainError {
  readonly code = 'NO_PREP_TIME_TO_REDUCE'
  readonly message = 'El pedido ya está a ≤ 10 min; no hay tiempo para reducir'
}

export class DriverNotAssigned extends DomainError {
  readonly code = 'DRIVER_NOT_ASSIGNED'
  readonly message = 'El pedido no tiene driver asignado'
}

export class RestaurantBlocked extends DomainError {
  readonly code = 'RESTAURANT_BLOCKED'
  readonly message = 'El restaurante está bloqueado'
  constructor(restaurantId: string, reason: string | null) {
    super({ restaurantId, reason })
  }
}
