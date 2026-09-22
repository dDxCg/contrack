import { Controller, Get, HttpCode, Param, ParseIntPipe, Post } from '@nestjs/common';
import { AccessContext } from '../../services/access-control/access-context';
import { Access, CurrentAccess } from '../../services/access-control/access.decorator';
import { Operation, Resource } from '../../services/access-control/role-resolver';
import { AlertView } from '../../dtos/alerts/alerts.response.dto';
import { AlertService } from '../../services/alerts/alert.service';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertService: AlertService) {}

  @Get()
  @Access(Resource.Alerts, Operation.Read)
  async list(
    @CurrentAccess()
    access: AccessContext,
  ): Promise<{
    items: AlertView[];
  }> {
    return { items: await this.alertService.list(access) };
  }

  @Post(':id/send')
  @HttpCode(202)
  @Access(Resource.Alerts, Operation.Update)
  async resend(
    @CurrentAccess()
    access: AccessContext,
    @Param('id', ParseIntPipe)
    id: number,
  ): Promise<{
    job_id: string;
  }> {
    await this.alertService.resend(access, id);

    return { job_id: `alert-resend-${id}` };
  }
}
