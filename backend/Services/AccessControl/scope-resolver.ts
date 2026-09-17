import { Injectable } from '@nestjs/common';
import { Employee, Role } from '../../Models/employee.entity';
import { Resource, RoleResolver } from './role-resolver';
import { RowScope } from './row-scope';

export interface ScopeRow {
  readonly teamId?: number | null;
  readonly assigneeId?: number | null;
  readonly managerId?: number | null;
}

@Injectable()
export class ScopeResolver {
  constructor(private readonly roleResolver: RoleResolver) {}

  resolve(role: Role, resource: Resource): RowScope {
    return this.roleResolver.scopeFor(resource, role);
  }

  allows(scope: RowScope, caller: Employee, row: ScopeRow): boolean {
    switch (scope) {
      case RowScope.All:
        return true;
      case RowScope.Team:
        return caller.teamId !== null && row.teamId === caller.teamId;
      case RowScope.Own:
        return row.assigneeId === caller.id;
      case RowScope.Unit:
        return row.managerId === caller.id;
      case RowScope.None:
        return false;
    }
  }
}
