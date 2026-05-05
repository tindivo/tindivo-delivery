import type { DomainError } from '../../../../shared/errors/domain-error'
import { Result } from '../../../../shared/kernel/result'
import type { UseCase } from '../../../../shared/kernel/use-case'
import type {
  CustomerOrderHistoryItem,
  CustomerProfileRepository,
} from '../ports/customer-profile.repository'

export type ListMyOrdersCommand = { userId: string; limit?: number }

export class ListMyOrdersUseCase
  implements UseCase<ListMyOrdersCommand, CustomerOrderHistoryItem[], DomainError>
{
  constructor(private readonly repo: CustomerProfileRepository) {}

  async execute(
    cmd: ListMyOrdersCommand,
  ): Promise<Result<CustomerOrderHistoryItem[], DomainError>> {
    const items = await this.repo.listOrders(cmd.userId, Math.min(50, Math.max(1, cmd.limit ?? 20)))
    return Result.ok(items)
  }
}
