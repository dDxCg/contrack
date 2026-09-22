import { Inject, Injectable } from '@nestjs/common';
import { ShiftPage, ShiftView } from '../../dtos/shifts/shifts.response.dto';
import { pageOf } from '../../dtos/page.dto';
import { AuthOutOfScopeException } from '../../models/domain-errors';
import { ShiftStatus } from '../../models/shifts/shift.entity';
import {
  IShiftRepository,
  ShiftListFilters,
  ShiftRepository,
  ShiftScopeFilter,
} from '../../repositories/shifts/shift.repository';
import { toShiftView } from '../../dtos/shifts/shifts.mapper';
import { AccessContext } from '../access-control/access-context';
import { RowScope } from '../access-control/row-scope';
import { ScopeResolver } from '../access-control/scope-resolver';

export interface ShiftListQuery {
  from?: string;
  to?: string;
  status?: ShiftStatus;
  assigneeId?: number;
  contractId?: number;
  teamId?: number;
  managerId?: number;
}

@Injectable()
export class ShiftsService {
  constructor(
    @Inject(ShiftRepository)
    private readonly shiftRepository: IShiftRepository,
    private readonly scopeResolver: ScopeResolver,
  ) {}

  async list(
    access: AccessContext,
    query: ShiftListQuery,
    page: { limit: number; offset: number },
  ): Promise<ShiftPage> {
    const filters: ShiftListFilters = query;
    const { items, total } = await this.shiftRepository.list(
      access.tenantId,
      scopeFilterFor(access),
      filters,
      page,
    );

    return pageOf(items.map(toShiftView), total, page);
  }

  async get(access: AccessContext, id: number): Promise<ShiftView> {
    const found = await this.shiftRepository.findByIdWithScopeContext(access.tenantId, id);

    if (found === null || !this.scopeResolver.allows(access.scope, access.employee, found.scope)) {
      throw new AuthOutOfScopeException();
    }

    return toShiftView(found.shift);
  }
}

function scopeFilterFor(access: AccessContext): ShiftScopeFilter {
  switch (access.scope) {
    case RowScope.All:
      return { kind: 'all' };
    case RowScope.Own:
      return { kind: 'own', assigneeId: access.employee.id };
    case RowScope.Team:
      return access.employee.teamId === null
        ? { kind: 'none' }
        : { kind: 'team', teamId: access.employee.teamId };
    case RowScope.Unit:
      return { kind: 'unit', managerId: access.employee.id };
    case RowScope.None:
      return { kind: 'none' };
  }
}
