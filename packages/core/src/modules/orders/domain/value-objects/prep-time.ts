import { ValueObject } from '../../../../shared/kernel/value-object'

export type PrepTimeOptionValue = 'fast' | 'normal' | 'slow'

type Props = { option: PrepTimeOptionValue }

const MINUTES: Record<PrepTimeOptionValue, number> = {
  fast: 10,
  normal: 15,
  slow: 20,
}

/**
 * Tiempo de preparación (no es la hora estimada de listo).
 * 'fast' 10 min | 'normal' 15 min | 'slow' 20 min.
 */
export class PrepTime extends ValueObject<Props> {
  private constructor(option: PrepTimeOptionValue) {
    super({ option })
  }

  static of(option: PrepTimeOptionValue): PrepTime {
    return new PrepTime(option)
  }

  static fast = () => new PrepTime('fast')
  static normal = () => new PrepTime('normal')
  static slow = () => new PrepTime('slow')

  get option(): PrepTimeOptionValue {
    return this.props.option
  }

  get minutes(): number {
    return MINUTES[this.props.option]
  }

  /**
   * Calcula cuándo el pedido aparece en la bandeja de drivers.
   * Regla de negocio: el pedido aparece 10 min antes de estar listo
   * (o inmediatamente si el prep time es ≤ 10 min).
   */
  computeAppearsInQueueAt(createdAt: Date): Date {
    const prep = this.minutes * 60 * 1000
    const advance = Math.min(10 * 60 * 1000, prep)
    return new Date(createdAt.getTime() + prep - advance)
  }

  computeEstimatedReadyAt(createdAt: Date): Date {
    return new Date(createdAt.getTime() + this.minutes * 60 * 1000)
  }
}
