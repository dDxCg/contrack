import { anEmployee } from '../../../support/builders';
import { Role } from '../../../../models/employees/employee.entity';
import { Resource, RoleResolver } from '../../../../services/access-control/role-resolver';
import { RowScope } from '../../../../services/access-control/row-scope';
import { ScopeResolver } from '../../../../services/access-control/scope-resolver';

describe('ScopeResolver', () => {
  const resolver = new ScopeResolver(new RoleResolver());
  const teamLeadOfSeven = anEmployee({ id: 12, role: Role.TeamLead, teamId: 7 });
  describe('resolve', () => {
    it('reads the scope the role holds on the resource', () => {
      expect(resolver.resolve(Role.TeamLead, Resource.Teams)).toBe(RowScope.Team);
      expect(resolver.resolve(Role.Manager, Resource.Teams)).toBe(RowScope.All);
      expect(resolver.resolve(Role.Accountant, Resource.Customers)).toBe(RowScope.All);
    });
    it('answers none for a role with no grant on the resource', () => {
      expect(resolver.resolve(Role.TeamLead, Resource.Employees)).toBe(RowScope.None);
    });
  });
  describe('allows', () => {
    it('all scope reaches every row of the tenant', () => {
      expect(resolver.allows(RowScope.All, teamLeadOfSeven, { teamId: 999 })).toBe(true);
    });
    it('team scope reaches exactly the caller’s team (employees.team_id)', () => {
      expect(resolver.allows(RowScope.Team, teamLeadOfSeven, { teamId: 7 })).toBe(true);
      expect(resolver.allows(RowScope.Team, teamLeadOfSeven, { teamId: 8 })).toBe(false);
      expect(resolver.allows(RowScope.Team, anEmployee({ teamId: null }), { teamId: 7 })).toBe(false);
      expect(resolver.allows(RowScope.Team, teamLeadOfSeven, { teamId: null })).toBe(false);
    });
    it('own scope reaches exactly the caller’s own rows', () => {
      const employee = anEmployee({ id: 12, role: Role.Employee, teamId: 7 });
      expect(resolver.allows(RowScope.Own, employee, { assigneeId: 12 })).toBe(true);
      expect(resolver.allows(RowScope.Own, employee, { assigneeId: 31 })).toBe(false);
    });
    it('unit scope reaches employees reporting to the caller (employees.manager_id)', () => {
      const manager = anEmployee({ id: 12, role: Role.Manager });
      expect(resolver.allows(RowScope.Unit, manager, { managerId: 12 })).toBe(true);
      expect(resolver.allows(RowScope.Unit, manager, { managerId: 31 })).toBe(false);
    });
    it('none reaches nothing', () => {
      expect(resolver.allows(RowScope.None, teamLeadOfSeven, { teamId: 7 })).toBe(false);
      expect(resolver.allows(RowScope.None, anEmployee({ role: Role.Director }), {})).toBe(false);
    });
  });
});
