import { ValueObject } from '../../../../shared/kernel/value-object'

type Props = { slots: number }

const ABSOLUTE_MIN = 1
const ABSOLUTE_MAX = 10

/**
 * Cantidad de slots que ocupa un pedido en la mochila del motorizado.
 * El driver lo declara al recoger el pedido (`markPickedUp`). Default 1.
 *
 * El máximo permitido por pedido lo decide el admin via
 * `assignment_rules.maxOccupancySlotsPerOrder`. Aquí enforcement es:
 *  - rango absoluto [1, 10] (alineado con el CHECK de la columna SQL).
 *  - el caller pasa `max` desde rules; si `slots > max`, falla.
 */
export class OccupancySlots extends ValueObject<Props> {
  private constructor(slots: number) {
    super({ slots })
  }

  static of(slots: number, max: number = ABSOLUTE_MAX): OccupancySlots {
    if (!Number.isInteger(slots)) throw new Error('OccupancySlots.slots debe ser entero')
    if (slots < ABSOLUTE_MIN || slots > ABSOLUTE_MAX)
      throw new Error(`OccupancySlots fuera de rango absoluto (${ABSOLUTE_MIN}-${ABSOLUTE_MAX})`)
    if (slots > max)
      throw new Error(`OccupancySlots excede el cap configurado (max=${max}, recibido=${slots})`)
    return new OccupancySlots(slots)
  }

  static default(): OccupancySlots {
    return new OccupancySlots(1)
  }

  get value(): number {
    return this.props.slots
  }
}
