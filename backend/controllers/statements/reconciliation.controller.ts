import { Controller, Get, Query } from '@nestjs/common';
import { ReconciliationQueryDto } from '../../dtos/statements/statements.dto';
import { ReconciliationRowView } from '../../dtos/statements/statements.response.dto';
import { AccessContext } from '../../services/access-control/access-context';
import { Access, CurrentAccess } from '../../services/access-control/access.decorator';
import { Operation, Resource } from '../../services/access-control/role-resolver';
import { ReconciliationService } from '../../services/statements/reconciliation.service';

@Controller('reconciliation')
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Get()
  @Access(Resource.Statements, Operation.Read)
  async get(
    @CurrentAccess()
    access: AccessContext,
    @Query()
    query: ReconciliationQueryDto,
  ): Promise<{
    items: ReconciliationRowView[];
  }> {
    return { items: await this.reconciliationService.get(access, new Date(query.period)) };
  }
}
