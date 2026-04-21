// Utilities
export { cn } from './lib/cn'

// Icons
export { Icon } from './icons/icon'

// Primitives
export { Button, buttonVariants, type ButtonProps } from './primitives/button'
export { IconButton, iconButtonVariants, type IconButtonProps } from './primitives/icon-button'
export { Input, type InputProps } from './primitives/input'
export { Label } from './primitives/label'
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './primitives/card'
export { Badge, type BadgeProps } from './primitives/badge'
export { Skeleton } from './primitives/skeleton'

// Patterns
export { GlassTopBar } from './patterns/glass-top-bar'
export { StatusChip } from './patterns/status-chip'
export { ColorDot } from './patterns/color-dot'
export { EmptyState } from './patterns/empty-state'
export { MoneyInput } from './patterns/money-input'
export { PhoneInputPe } from './patterns/phone-input-pe'
export { OrderCard } from './patterns/order-card'
export { Timeline, type TimelineStep } from './patterns/timeline'
// InteractiveMap se importa con next/dynamic (ssr:false) desde cada app,
// ya que Leaflet toca `window` en su top-level. Subpath export disponible:
// import('@tindivo/ui/patterns/interactive-map')
export { WaLinkButton } from './patterns/wa-link-button'
export { BottomNav, type BottomNavItem } from './patterns/bottom-nav'
export { HeroBadge } from './patterns/hero-badge'
export { SolarCTA } from './patterns/solar-cta'
export { BottomActionBar } from './patterns/bottom-action-bar'

// Motion
export {
  fadeIn,
  fadeInUp,
  scaleIn,
  staggerContainer,
  listItem,
  slideInFromRight,
  pulseGlow,
} from './motion/variants'
