import { Controller, Get, Query } from '@nestjs/common';
import { DashboardQueryDto } from '../../dtos/dashboard/dashboard.dto';
import { DashboardSummaryView } from '../../dtos/dashboard/dashboard.response.dto';
import { AccessContext } from '../../services/access-control/access-context';
import { Access, CurrentAccess } from '../../services/access-control/access.decorator';
import { Operation, Resource } from '../../services/access-control/role-resolver';
import { DashboardService } from '../../services/dashboard/dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @Access(Resource.Dashboard, Operation.Read)
  get(
    @CurrentAccess()
    access: AccessContext,
    @Query()
    query: DashboardQueryDto,
  ): Promise<DashboardSummaryView> {
    return this.dashboardService.get(access, query);
  }
}
