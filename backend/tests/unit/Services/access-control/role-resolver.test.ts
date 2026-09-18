import { anEmployee } from '../../../support/builders';
import { captureDomainError } from '../../../support/domain-errors';
import { EmployeeStatus, Role } from '../../../../models/employees/employee.entity';
import { Operation, Resource, RoleResolver } from '../../../../services/access-control/role-resolver';
import { RowScope } from '../../../../services/access-control/row-scope';
describe('RoleResolver — 05-api.md §8', () => {
  const resolver = new RoleResolver();
  describe('rolesFor', () => {
    it('customers: R C U D for director, R C for manager, R for accountant', () => {
      expect(resolver.rolesFor(Resource.Customers, Operation.Read)).toEqual([
        Role.Director,
        Role.Manager,
        Role.Accountant,
      ]);
      expect(resolver.rolesFor(Resource.Customers, Operation.Create)).toEqual([Role.Director, Role.Manager]);
      expect(resolver.rolesFor(Resource.Customers, Operation.Update)).toEqual([Role.Director, Role.Manager]);
      expect(resolver.rolesFor(Resource.Customers, Operation.Delete)).toEqual([Role.Director]);
    });
    it('employees: director only, for every operation', () => {
      for (const operation of [Operation.Read, Operation.Create, Operation.Update, Operation.Delete]) {
        expect(resolver.rolesFor(Resource.Employees, operation)).toEqual([Role.Director]);
      }
    });
    it('teams: R C U D for director, R for manager and team lead', () => {
      expect(resolver.rolesFor(Resource.Teams, Operation.Read)).toEqual([
        Role.Director,
        Role.Manager,
        Role.TeamLead,
      ]);
      expect(resolver.rolesFor(Resource.Teams, Operation.Create)).toEqual([Role.Director]);
      expect(resolver.rolesFor(Resource.Teams, Operation.Update)).toEqual([Role.Director]);
      expect(resolver.rolesFor(Resource.Teams, Operation.Delete)).toEqual([Role.Director]);
    });
    it('contracts: R C U D for director, R C for manager, R for accountant', () => {
      expect(resolver.rolesFor(Resource.Contracts, Operation.Read)).toEqual([
        Role.Director,
        Role.Manager,
        Role.Accountant,
      ]);
      expect(resolver.rolesFor(Resource.Contracts, Operation.Create)).toEqual([Role.Director, Role.Manager]);
      expect(resolver.rolesFor(Resource.Contracts, Operation.Update)).toEqual([Role.Director]);
      expect(resolver.rolesFor(Resource.Contracts, Operation.Delete)).toEqual([Role.Director]);
    });
    it('shifts: R U for director/manager/team lead, R for accountant/employee', () => {
      expect(resolver.rolesFor(Resource.Shifts, Operation.Read)).toEqual([
        Role.Director,
        Role.Manager,
        Role.Accountant,
        Role.TeamLead,
        Role.Employee,
      ]);
      expect(resolver.rolesFor(Resource.Shifts, Operation.Update)).toEqual([
        Role.Director,
        Role.Manager,
        Role.TeamLead,
      ]);
      expect(resolver.rolesFor(Resource.Shifts, Operation.Create)).toEqual([Role.Director]);
      expect(resolver.rolesFor(Resource.Shifts, Operation.Delete)).toEqual([Role.Director]);
    });
    it('statements: R for director, R C U for accountant', () => {
      expect(resolver.rolesFor(Resource.Statements, Operation.Read)).toEqual([
        Role.Director,
        Role.Accountant,
      ]);
      expect(resolver.rolesFor(Resource.Statements, Operation.Create)).toEqual([Role.Accountant]);
      expect(resolver.rolesFor(Resource.Statements, Operation.Update)).toEqual([Role.Accountant]);
    });
    it('contract_costs: R for director, R U for accountant', () => {
      expect(resolver.rolesFor(Resource.ContractCosts, Operation.Read)).toEqual([
        Role.Director,
        Role.Accountant,
      ]);
      expect(resolver.rolesFor(Resource.ContractCosts, Operation.Update)).toEqual([Role.Accountant]);
      expect(resolver.rolesFor(Resource.ContractCosts, Operation.Create)).toEqual([]);
    });
    it('alerts: R U for director, R U for manager, R for team lead', () => {
      expect(resolver.rolesFor(Resource.Alerts, Operation.Read)).toEqual([
        Role.Director,
        Role.Manager,
        Role.TeamLead,
      ]);
      expect(resolver.rolesFor(Resource.Alerts, Operation.Update)).toEqual([Role.Director, Role.Manager]);
    });
    it('dashboard: R for director only', () => {
      expect(resolver.rolesFor(Resource.Dashboard, Operation.Read)).toEqual([Role.Director]);
      expect(resolver.rolesFor(Resource.Dashboard, Operation.Update)).toEqual([]);
    });
    it('has no granting role for a role the matrix leaves blank', () => {
      expect(resolver.rolesFor(Resource.Employees, Operation.Read)).not.toContain(Role.TeamLead);
      expect(resolver.rolesFor(Resource.Teams, Operation.Create)).not.toContain(Role.Manager);
    });
  });
  describe('scopeFor', () => {
    it('resolves the row scope column of the matrix', () => {
      expect(resolver.scopeFor(Resource.Customers, Role.Director)).toBe(RowScope.All);
      expect(resolver.scopeFor(Resource.Customers, Role.Manager)).toBe(RowScope.All);
      expect(resolver.scopeFor(Resource.Customers, Role.Accountant)).toBe(RowScope.All);
      expect(resolver.scopeFor(Resource.Teams, Role.Manager)).toBe(RowScope.All);
      expect(resolver.scopeFor(Resource.Teams, Role.TeamLead)).toBe(RowScope.Team);
      expect(resolver.scopeFor(Resource.Employees, Role.Director)).toBe(RowScope.All);
      expect(resolver.scopeFor(Resource.Shifts, Role.TeamLead)).toBe(RowScope.Team);
      expect(resolver.scopeFor(Resource.Shifts, Role.Employee)).toBe(RowScope.Own);
      expect(resolver.scopeFor(Resource.Shifts, Role.Manager)).toBe(RowScope.All);
      expect(resolver.scopeFor(Resource.Alerts, Role.Manager)).toBe(RowScope.Unit);
    });
    it('answers none where the role has no grant at all', () => {
      expect(resolver.scopeFor(Resource.Employees, Role.Manager)).toBe(RowScope.None);
      expect(resolver.scopeFor(Resource.Teams, Role.Accountant)).toBe(RowScope.None);
      expect(resolver.scopeFor(Resource.Customers, Role.TeamLead)).toBe(RowScope.None);
      expect(resolver.scopeFor(Resource.Customers, Role.Employee)).toBe(RowScope.None);
    });
  });
  describe('requireRole — 403 auth.forbidden_role, never 404', () => {
    it('lets a granted role through', () => {
      expect(() => resolver.requireRole(Resource.Customers, Operation.Read, Role.Accountant)).not.toThrow();
      expect(() => resolver.requireRole(Resource.Teams, Operation.Read, Role.TeamLead)).not.toThrow();
    });
    it('names every role that would have been accepted', () => {
      const error = captureDomainError(() =>
        resolver.requireRole(Resource.Customers, Operation.Create, Role.Accountant),
      );
      expect(error.code).toBe('auth.forbidden_role');
      expect(error.getStatus()).toBe(403);
      expect(error.details).toEqual({ required_role: 'director, manager' });
    });
    it('refuses a role the matrix marks as no access', () => {
      const error = captureDomainError(() =>
        resolver.requireRole(Resource.Employees, Operation.Read, Role.Manager),
      );
      expect(error.code).toBe('auth.forbidden_role');
      expect(error.details).toEqual({ required_role: 'director' });
    });
    it('refuses a deactivated employee before any scope is resolved', () => {
      const terminated = anEmployee({ role: Role.Manager, status: EmployeeStatus.Terminated });
      const error = captureDomainError(() =>
        resolver.requireRole(Resource.Employees, Operation.Read, terminated.role),
      );
      expect(error.code).toBe('auth.forbidden_role');
    });
  });
});
