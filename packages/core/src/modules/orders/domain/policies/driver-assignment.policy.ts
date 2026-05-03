export type DriverAssignmentCandidate = {
  driverId: string
  deliveredToday: number
  activeCount: number
  reservedCount: number
  sameRestaurantWindowCount: number
  operatingDays: string[]
  shiftStart: string
  shiftEnd: string
}

export type AssignmentDecision = {
  driverId: string
  reason: string
}

const FAIRNESS_WEIGHT = 100
const ACTIVE_WEIGHT = 30
const RESERVED_WEIGHT = 20
const SAME_RESTAURANT_BONUS = 60
const OVER_BONUS_THRESHOLD_PENALTY = 300
const BONUS_THRESHOLD = 20

export const DriverAssignmentPolicy = {
  choose(candidates: readonly DriverAssignmentCandidate[]): AssignmentDecision | null {
    if (candidates.length === 0) return null

    const minDelivered = Math.min(...candidates.map((c) => c.deliveredToday))

    const ranked = candidates
      .map((c) => {
        const workload = c.deliveredToday + c.activeCount + c.reservedCount
        const overBonusPenalty =
          c.deliveredToday >= BONUS_THRESHOLD && minDelivered < BONUS_THRESHOLD
            ? OVER_BONUS_THRESHOLD_PENALTY
            : 0
        const score =
          workload * FAIRNESS_WEIGHT +
          c.activeCount * ACTIVE_WEIGHT +
          c.reservedCount * RESERVED_WEIGHT -
          c.sameRestaurantWindowCount * SAME_RESTAURANT_BONUS +
          overBonusPenalty

        return { candidate: c, score }
      })
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score
        if (a.candidate.deliveredToday !== b.candidate.deliveredToday) {
          return a.candidate.deliveredToday - b.candidate.deliveredToday
        }
        return a.candidate.driverId.localeCompare(b.candidate.driverId)
      })

    const selected = ranked[0]?.candidate
    if (!selected) return null
    return {
      driverId: selected.driverId,
      reason:
        selected.sameRestaurantWindowCount > 0
          ? 'same_restaurant_window'
          : 'balanced_daily_workload',
    }
  },
} as const
