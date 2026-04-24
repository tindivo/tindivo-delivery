import { ValueObject } from '../../../../shared/kernel/value-object'

type Props = { minutes: number }

const MIN_MINUTES = 5
const MAX_MINUTES = 120
const QUEUE_WINDOW_MS = 10 * 60 * 1000

/**
 * Tiempo de preparación del pedido (minutos enteros, rango 5-120).
 * No confundir con `estimatedReadyAt` (hora concreta calculada a partir de
 * createdAt + minutes).
 */
export class PrepTime extends ValueObject<Props> {
  private constructor(minutes: number) {
    super({ minutes })
  }

  static of(minutes: number): PrepTime {
    if (!Number.isInteger(minutes)) throw new Error('PrepTime.minutes debe ser entero')
    if (minutes < MIN_MINUTES || minutes > MAX_MINUTES)
      throw new Error(`PrepTime.minutes fuera de rango (${MIN_MINUTES}-${MAX_MINUTES})`)
    return new PrepTime(minutes)
  }

  get minutes(): number {
    return this.props.minutes
  }

  /**
   * Regla de negocio: el pedido aparece en la bandeja de drivers 10 min antes
   * de estar listo (o inmediatamente si el prep time es ≤ 10 min).
   */
  computeAppearsInQueueAt(createdAt: Date): Date {
    const prepMs = this.minutes * 60 * 1000
    const advance = Math.min(QUEUE_WINDOW_MS, prepMs)
    return new Date(createdAt.getTime() + prepMs - advance)
  }

  computeEstimatedReadyAt(createdAt: Date): Date {
    return new Date(createdAt.getTime() + this.minutes * 60 * 1000)
  }
}
