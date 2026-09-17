import { Injectable } from '@nestjs/common';
import { Role } from '../../Models/employee.entity';
import { AuthForbiddenRoleException } from '../../Models/domain-errors';
import { RowScope } from './row-scope';

export enum Resource {
  Customers = 'customers',
  Employees = 'employees',
  Teams = 'teams',
  Contracts = 'contracts',
}

export enum Operation {
  Read = 'read',
  Create = 'create',
  Update = 'update',
  Delete = 'delete',
}

export interface Grant {
  readonly operations: readonly Operation[];
  readonly scope: RowScope;
}

const ALL_OPERATIONS: readonly Operation[] = [
  Operation.Read,
  Operation.Create,
  Operation.Update,
  Operation.Delete,
];

const ROLE_COLUMN_ORDER: readonly Role[] = [
  Role.Director,
  Role.Manager,
  Role.Accountant,
  Role.TeamLead,
  Role.Employee,
];

const GRANTS: Readonly<Record<Resource, Partial<Record<Role, Grant>>>> = {
  [Resource.Customers]: {
    [Role.Director]: { operations: ALL_OPERATIONS, scope: RowScope.All },
    [Role.Manager]: { operations: [Operation.Read, Operation.Create, Operation.Update], scope: RowScope.All },
    [Role.Accountant]: { operations: [Operation.Read], scope: RowScope.All },
  },
  [Resource.Employees]: {
    [Role.Director]: { operations: ALL_OPERATIONS, scope: RowScope.All },
  },
  [Resource.Teams]: {
    [Role.Director]: { operations: ALL_OPERATIONS, scope: RowScope.All },
    [Role.Manager]: { operations: [Operation.Read], scope: RowScope.All },
    [Role.TeamLead]: { operations: [Operation.Read], scope: RowScope.Team },
  },
  [Resource.Contracts]: {
    [Role.Director]: { operations: ALL_OPERATIONS, scope: RowScope.All },
    [Role.Manager]: { operations: [Operation.Read, Operation.Create], scope: RowScope.All },
    [Role.Accountant]: { operations: [Operation.Read], scope: RowScope.All },
  },
};

@Injectable()
export class RoleResolver {
  rolesFor(resource: Resource, operation: Operation): Role[] {
    return ROLE_COLUMN_ORDER.filter(
      (role) => GRANTS[resource][role]?.operations.includes(operation) === true,
    );
  }

  grantFor(resource: Resource, role: Role): Grant | null {
    return GRANTS[resource][role] ?? null;
  }

  scopeFor(resource: Resource, role: Role): RowScope {
    return this.grantFor(resource, role)?.scope ?? RowScope.None;
  }

  requireRole(resource: Resource, operation: Operation, role: Role): void {
    if (this.grantFor(resource, role)?.operations.includes(operation) === true) {
      return;
    }

    throw new AuthForbiddenRoleException(this.rolesFor(resource, operation));
  }
}
