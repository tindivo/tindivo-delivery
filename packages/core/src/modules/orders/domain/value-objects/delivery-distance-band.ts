import { ValueObject } from '../../../../shared/kernel/value-object'

export type DeliveryDistanceBandValue = 'near' | 'far'
const BANDS: readonly DeliveryDistanceBandValue[] = ['near', 'far'] as const

type Props = { band: DeliveryDistanceBandValue }

/**
 * Banda de distancia declarada por el motorizado al recoger el pedido. Es
 * la base para diferenciar comisiones al restaurante: lejos cuesta más.
 * Es declarativo (no se deriva de coords) porque la distancia percibida por
 * el driver — que considera tráfico, ruta real, accesibilidad — es más
 * justa que la lineal sobre coords (muchos pedidos no tienen coords).
 */
export class DeliveryDistanceBand extends ValueObject<Props> {
  private constructor(band: DeliveryDistanceBandValue) {
    super({ band })
  }

  static of(value: string): DeliveryDistanceBand {
    if (!BANDS.includes(value as DeliveryDistanceBandValue))
      throw new Error(`DeliveryDistanceBand inválido: ${value} (válidos: ${BANDS.join('|')})`)
    return new DeliveryDistanceBand(value as DeliveryDistanceBandValue)
  }

  get value(): DeliveryDistanceBandValue {
    return this.props.band
  }
}
