type Props = {
  color: string // hex sin #
  size?: number
  label?: string
}

/**
 * Punto de color (accent color del restaurante).
 * Ayuda al driver a identificar visualmente de qué negocio es el pedido.
 */
export function ColorDot({ color, size = 12, label }: Props) {
  return (
    <span
      aria-label={label ?? `Color ${color}`}
      className="inline-block rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.12)]"
      style={{
        backgroundColor: `#${color}`,
        width: `${size}px`,
        height: `${size}px`,
      }}
    />
  )
}
