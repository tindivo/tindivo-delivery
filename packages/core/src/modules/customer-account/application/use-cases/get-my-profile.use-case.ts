import type { DomainError } from '../../../../shared/errors/domain-error'
import { Result } from '../../../../shared/kernel/result'
import type { UseCase } from '../../../../shared/kernel/use-case'
import type { CustomerProfile } from '../../domain/entities/customer-profile'
import type { CustomerProfileRepository } from '../ports/customer-profile.repository'

export type GetMyProfileCommand = { userId: string }

export class GetMyProfileUseCase
  implements UseCase<GetMyProfileCommand, CustomerProfile | null, DomainError>
{
  constructor(private readonly repo: CustomerProfileRepository) {}

  async execute(cmd: GetMyProfileCommand): Promise<Result<CustomerProfile | null, DomainError>> {
    const profile = await this.repo.findByUserId(cmd.userId)
    return Result.ok(profile)
  }
}
