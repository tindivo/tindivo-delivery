import type { DeliveryDistanceBandValue } from '../../domain/value-objects/delivery-distance-band'
import type { Money } from '../../domain/value-objects/money'

/**
 * Comisiones que Tindivo cobra al restaurante por pedido entregado, según
 * la banda de distancia declarada por el motorizado al pickup. Vive en
 * `app_settings.delivery_distance_commissions` como JSON `{near, far}`.
 * El use case `MarkPickedUpUseCase` la consulta para ajustar
 * `orders.delivery_fee` al monto correspondiente.
 */
export type DistanceCommissions = {
  near: Money
  far: Money
}

export interface DistanceCommissionsRepository {
  /**
   * Lee las comisiones por banda desde `app_settings`. Devuelve null si
   * la configuración está ausente o malformada — el caller (use case)
   * debe abortar con error explícito en ese caso (no asumir default 0,
   * la comisión es central al modelo de negocio).
   */
  read(): Promise<DistanceCommissions | null>
}

export function feeForBand(
  commissions: DistanceCommissions,
  band: DeliveryDistanceBandValue,
): Money {
  return band === 'near' ? commissions.near : commissions.far
}
