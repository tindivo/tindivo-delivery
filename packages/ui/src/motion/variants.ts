import type { Variants } from 'motion/react'

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.2, 0.8, 0.2, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
}

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
}

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.94 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] } },
  exit: { opacity: 0, scale: 0.94, transition: { duration: 0.2 } },
}

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
}

export const listItem: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.2, 0.8, 0.2, 1] } },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.18 } },
}

export const slideInFromRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, x: 20, transition: { duration: 0.2 } },
}

export const pulseGlow: Variants = {
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(255,107,53,0.4)',
      '0 0 0 12px rgba(255,107,53,0)',
      '0 0 0 0 rgba(255,107,53,0)',
    ],
    transition: { duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: 'easeOut' },
  },
}
