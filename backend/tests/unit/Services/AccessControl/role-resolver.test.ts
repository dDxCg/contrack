import { anEmployee } from '../../../support/builders';
import { captureDomainError } from '../../../support/domain-errors';
import { EmployeeStatus, Role } from '../../../../Models/employee.entity';
import { Operation, Resource, RoleResolver } from '../../../../Services/AccessControl/role-resolver';
import { RowScope } from '../../../../Services/AccessControl/row-scope';

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
      expect(resolver.rolesFor(Resource.Teams, Operation.Read)).toEqual([Role.Director, Role.Manager, Role.TeamLead]);
      expect(resolver.rolesFor(Resource.Teams, Operation.Create)).toEqual([Role.Director]);
      expect(resolver.rolesFor(Resource.Teams, Operation.Update)).toEqual([Role.Director]);
      expect(resolver.rolesFor(Resource.Teams, Operation.Delete)).toEqual([Role.Director]);
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
      const error = captureDomainError(() => resolver.requireRole(Resource.Customers, Operation.Create, Role.Accountant));

      expect(error.code).toBe('auth.forbidden_role');
      expect(error.getStatus()).toBe(403);
      expect(error.details).toEqual({ required_role: 'director, manager' });
    });

    it('refuses a role the matrix marks as no access', () => {
      const error = captureDomainError(() => resolver.requireRole(Resource.Employees, Operation.Read, Role.Manager));

      expect(error.code).toBe('auth.forbidden_role');
      expect(error.details).toEqual({ required_role: 'director' });
    });

    it('refuses a deactivated employee before any scope is resolved', () => {
      const terminated = anEmployee({ role: Role.Manager, status: EmployeeStatus.Terminated });

      const error = captureDomainError(() => resolver.requireRole(Resource.Employees, Operation.Read, terminated.role));

      // The caller's status is the guard's business; requireRole only reads the role it is handed.
      expect(error.code).toBe('auth.forbidden_role');
    });
  });
});
