import { Controller, Get } from '@nestjs/common';
import { PlatformDashboardSummaryView } from '../../dtos/platform/platform.response.dto';
import { Access } from '../../services/access-control/access.decorator';
import { Operation, Resource } from '../../services/access-control/role-resolver';
import { PlatformDashboardService } from '../../services/platform/platform-dashboard.service';
@Controller('platform/dashboard')
export class PlatformDashboardController {
  constructor(private readonly platformDashboardService: PlatformDashboardService) {}
  @Get()
  @Access(Resource.PlatformDashboard, Operation.Read)
  get(): Promise<PlatformDashboardSummaryView> {
    return this.platformDashboardService.get();
  }
}
