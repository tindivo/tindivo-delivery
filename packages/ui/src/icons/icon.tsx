import { cn } from '../lib/cn'

type Props = {
  name: string
  filled?: boolean
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700
  grade?: -25 | 0 | 200
  opticalSize?: 20 | 24 | 40 | 48
  size?: number
  className?: string
  'aria-label'?: string
}

/**
 * Wrapper de Material Symbols Outlined.
 * - Variable font axes: FILL, wght, GRAD, opsz.
 * - IMPORTANT: set los 4 axes completos en `font-variation-settings`. Si no,
 *   el browser usa defaults axis-por-axis que pueden chocar con la clase CSS
 *   y renderizar `.notdef` ("N" placeholder).
 */
export function Icon({
  name,
  filled = false,
  weight = 400,
  grade = 0,
  opticalSize = 24,
  size = 24,
  className,
  'aria-label': ariaLabel,
}: Props) {
  const label = ariaLabel ?? name.replace(/_/g, ' ')
  return (
    <span
      className={cn(
        'material-symbols-outlined inline-block select-none leading-none',
        className,
      )}
      style={{
        fontSize: `${size}px`,
        lineHeight: `${size}px`,
        width: `${size}px`,
        height: `${size}px`,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opticalSize}`,
      }}
      role="img"
      aria-label={label}
    >
      {name}
    </span>
  )
}
