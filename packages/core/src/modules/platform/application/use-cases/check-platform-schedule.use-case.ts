import { Result } from '../../../../shared/kernel/result'
import type { UseCase } from '../../../../shared/kernel/use-case'
import type { Clock } from '../../../orders/application/ports/clock'
import {
  DEFAULT_PLATFORM_SCHEDULE,
  PlatformSchedulePolicy,
  type PlatformScheduleStatus,
} from '../../domain/policies/platform-schedule.policy'
import type { PlatformSettingsRepository } from '../ports/platform-settings.repository'

export type CheckPlatformScheduleResult = PlatformScheduleStatus

export class CheckPlatformScheduleUseCase
  implements UseCase<void, CheckPlatformScheduleResult, never>
{
  constructor(
    private readonly settings: PlatformSettingsRepository,
    private readonly clock: Clock,
  ) {}

  async execute(): Promise<Result<CheckPlatformScheduleResult, never>> {
    const stored = await this.settings.read()
    const schedule = stored ?? DEFAULT_PLATFORM_SCHEDULE
    return Result.ok(PlatformSchedulePolicy.evaluate(schedule, this.clock.now()))
  }
}
