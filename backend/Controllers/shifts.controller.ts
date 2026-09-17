import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ShiftDisputeBodyDto, ShiftReassignBodyDto } from '../DTOs/shifts.dto';
import { AccessContext } from '../Services/AccessControl/access-context';
import { Access, CurrentAccess } from '../Services/AccessControl/access.decorator';
import { Operation, Resource } from '../Services/AccessControl/role-resolver';
import { DispatchService, ReassignCommand, ShiftView } from '../Services/dispatch.service';
import { DisputeCommand, DisputeService } from '../Services/dispute.service';
import { FieldLinkService, FieldLinkView } from '../Services/field-link.service';

@Controller('shifts')
export class ShiftsController {
  constructor(
    private readonly dispatchService: DispatchService,
    private readonly disputeService: DisputeService,
    private readonly fieldLinkService: FieldLinkService,
  ) {}

  @Patch(':id')
  @Access(Resource.Shifts, Operation.Update)
  reassign(
    @CurrentAccess() access: AccessContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ShiftReassignBodyDto,
  ): Promise<ShiftView> {
    return this.dispatchService.reassign(access, id, toReassignCommand(body));
  }

  @Post(':id/dispute')
  @HttpCode(200)
  @Access(Resource.Shifts, Operation.Update)
  dispute(
    @CurrentAccess() access: AccessContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ShiftDisputeBodyDto,
  ): Promise<ShiftView> {
    return this.disputeService.mark(access, id, toDisputeCommand(body));
  }

  @Post(':id/dispute:resolve')
  @HttpCode(200)
  @Access(Resource.Shifts, Operation.Update)
  resolveDispute(
    @CurrentAccess() access: AccessContext,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ShiftView> {
    return this.disputeService.resolve(access, id);
  }

  @Get(':id/link')
  @Access(Resource.Shifts, Operation.Read)
  link(
    @CurrentAccess() access: AccessContext,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<FieldLinkView> {
    return this.fieldLinkService.issue(access, id);
  }
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
