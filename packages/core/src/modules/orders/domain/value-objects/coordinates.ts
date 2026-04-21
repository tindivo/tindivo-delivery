import { ValueObject } from '../../../../shared/kernel/value-object'

type Props = { lat: number; lng: number }

export class Coordinates extends ValueObject<Props> {
  private constructor(lat: number, lng: number) {
    super({ lat, lng })
  }

  static of(lat: number, lng: number): Coordinates {
    if (lat < -90 || lat > 90) throw new Error(`Latitud fuera de rango: ${lat}`)
    if (lng < -180 || lng > 180) throw new Error(`Longitud fuera de rango: ${lng}`)
    return new Coordinates(lat, lng)
  }

  get lat(): number {
    return this.props.lat
  }

  get lng(): number {
    return this.props.lng
  }

  toJSON() {
    return { lat: this.props.lat, lng: this.props.lng }
  }

  override toString(): string {
    return `${this.props.lat},${this.props.lng}`
  }
}
