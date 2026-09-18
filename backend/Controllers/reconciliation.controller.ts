import { Controller, Get, Query } from '@nestjs/common';
import { ReconciliationQueryDto } from '../DTOs/statements.dto';
import { AccessContext } from '../Services/AccessControl/access-context';
import { Access, CurrentAccess } from '../Services/AccessControl/access.decorator';
import { Operation, Resource } from '../Services/AccessControl/role-resolver';
import { ReconciliationRowView, ReconciliationService } from '../Services/reconciliation.service';

@Controller('reconciliation')
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Get()
  @Access(Resource.Statements, Operation.Read)
  async get(
    @CurrentAccess() access: AccessContext,
    @Query() query: ReconciliationQueryDto,
  ): Promise<{ items: ReconciliationRowView[] }> {
    return { items: await this.reconciliationService.get(access, new Date(query.period)) };
  }
}
