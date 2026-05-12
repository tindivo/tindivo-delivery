import type { DomainError } from '../../../../shared/errors/domain-error'
import { Result } from '../../../../shared/kernel/result'
import type { UseCase } from '../../../../shared/kernel/use-case'
import type { CustomerProfile, CustomerProfileUpdate } from '../../domain/entities/customer-profile'
import type { CustomerProfileRepository } from '../ports/customer-profile.repository'

export type UpdateMyProfileCommand = { userId: string; update: CustomerProfileUpdate }

export class UpdateMyProfileUseCase
  implements UseCase<UpdateMyProfileCommand, CustomerProfile, DomainError>
{
  constructor(private readonly repo: CustomerProfileRepository) {}

  async execute(cmd: UpdateMyProfileCommand): Promise<Result<CustomerProfile, DomainError>> {
    const updated = await this.repo.update(cmd.userId, cmd.update)
    return Result.ok(updated)
  }
}
