import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ShiftAssignTeamBodyDto,
  ShiftDisputeBodyDto,
  ShiftListQueryDto,
  ShiftReassignBodyDto,
} from '../../dtos/shifts/shifts.dto';
import { ShiftPage, ShiftView } from '../../dtos/shifts/shifts.response.dto';
import { FieldLinkView } from '../../dtos/field/field.response.dto';
import { AccessContext } from '../../services/access-control/access-context';
import { Access, CurrentAccess } from '../../services/access-control/access.decorator';
import { Operation, Resource } from '../../services/access-control/role-resolver';
import { DispatchService, ReassignCommand } from '../../services/shifts/dispatch.service';
import { DisputeCommand, DisputeService } from '../../services/shifts/dispute.service';
import { ShiftListQuery, ShiftsService } from '../../services/shifts/shifts.service';
import { FieldLinkService } from '../../services/field/field-link.service';
@Controller('shifts')
export class ShiftsController {
  constructor(
    private readonly shiftsService: ShiftsService,
    private readonly dispatchService: DispatchService,
    private readonly disputeService: DisputeService,
    private readonly fieldLinkService: FieldLinkService,
  ) {}
  @Get()
  @Access(Resource.Shifts, Operation.Read)
  list(
    @CurrentAccess()
    access: AccessContext,
    @Query()
    query: ShiftListQueryDto,
  ): Promise<ShiftPage> {
    return this.shiftsService.list(access, toListQuery(query), { limit: query.limit, offset: query.offset });
  }
  @Get(':id')
  @Access(Resource.Shifts, Operation.Read)
  get(
    @CurrentAccess()
    access: AccessContext,
    @Param('id', ParseIntPipe)
    id: number,
  ): Promise<ShiftView> {
    return this.shiftsService.get(access, id);
  }
  @Patch(':id')
  @Access(Resource.Shifts, Operation.Update)
  reassign(
    @CurrentAccess()
    access: AccessContext,
    @Param('id', ParseIntPipe)
    id: number,
    @Body()
    body: ShiftReassignBodyDto,
  ): Promise<ShiftView> {
    return this.dispatchService.reassign(access, id, toReassignCommand(body));
  }
  @Patch(':id/team')
  @Access(Resource.Shifts, Operation.Update)
  assignTeam(
    @CurrentAccess()
    access: AccessContext,
    @Param('id', ParseIntPipe)
    id: number,
    @Body()
    body: ShiftAssignTeamBodyDto,
  ): Promise<ShiftView> {
    return this.dispatchService.assignTeam(access, id, body.team_id ?? null);
  }
  @Post(':id/dispute')
  @HttpCode(200)
  @Access(Resource.Shifts, Operation.Update)
  dispute(
    @CurrentAccess()
    access: AccessContext,
    @Param('id', ParseIntPipe)
    id: number,
    @Body()
    body: ShiftDisputeBodyDto,
  ): Promise<ShiftView> {
    return this.disputeService.mark(access, id, toDisputeCommand(body));
  }
  @Post(':id/dispute:resolve')
  @HttpCode(200)
  @Access(Resource.Shifts, Operation.Update)
  resolveDispute(
    @CurrentAccess()
    access: AccessContext,
    @Param('id', ParseIntPipe)
    id: number,
  ): Promise<ShiftView> {
    return this.disputeService.resolve(access, id);
  }
  @Get(':id/link')
  @Access(Resource.Shifts, Operation.Read)
  link(
    @CurrentAccess()
    access: AccessContext,
    @Param('id', ParseIntPipe)
    id: number,
  ): Promise<FieldLinkView> {
    return this.fieldLinkService.issue(access, id);
  }
}
function toListQuery(query: ShiftListQueryDto): ShiftListQuery {
  return {
    from: query.from,
    to: query.to,
    status: query.status,
    assigneeId: query.assignee_id,
    contractId: query.contract_id,
    teamId: query.team_id,
    managerId: query.manager_id,
  };
}
function toReassignCommand(body: ShiftReassignBodyDto): ReassignCommand {
  return {
    assigneeId: body.assignee_id ?? null,
    scheduledDate: body.scheduled_date === undefined ? undefined : new Date(body.scheduled_date),
  };
}
function toDisputeCommand(body: ShiftDisputeBodyDto): DisputeCommand {
  return {
    reason: body.reason,
    reportedVia: body.reported_via,
    reportedBy: body.reported_by,
    reportedAt: body.reported_at === undefined ? undefined : new Date(body.reported_at),
    description: body.description,
  };
}
