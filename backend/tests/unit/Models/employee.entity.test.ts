import { anEmployee } from '../../support/builders';
import { captureDomainError } from '../../support/domain-errors';
import { EmployeeStatus, Role } from '../../../models/employees/employee.entity';
describe('Employee', () => {
  describe('isTeamLead / isActive', () => {
    it('knows the team-lead role', () => {
      expect(anEmployee({ role: Role.TeamLead }).isTeamLead()).toBe(true);
      expect(anEmployee({ role: Role.Director }).isTeamLead()).toBe(false);
    });
    it('is active only while the status says so', () => {
      expect(anEmployee({ status: EmployeeStatus.Active }).isActive()).toBe(true);
      expect(anEmployee({ status: EmployeeStatus.Terminated }).isActive()).toBe(false);
    });
  });
  describe('assignManager — the reporting chain stays acyclic (employee.manager_cycle)', () => {
    it('accepts a manager who is not downstream of this employee', () => {
      const employee = anEmployee({ id: 12, managerId: null });
      employee.setManager(31, [31, 40, 5]);
      expect(employee.managerId).toBe(31);
    });
    it('reports the whole cycle path when the manager reports to this employee', () => {
      const employee = anEmployee({ id: 12, managerId: null });
      const error = captureDomainError(() => employee.setManager(31, [31, 12, 5]));
      expect(error.code).toBe('employee.manager_cycle');
      expect(error.getStatus()).toBe(400);
      expect(error.details).toEqual({ path: [12, 31, 12] });
    });
    it('reports a self-assignment as a cycle of one', () => {
      const employee = anEmployee({ id: 12 });
      const error = captureDomainError(() => employee.setManager(12, [12]));
      expect(error.code).toBe('employee.manager_cycle');
      expect(error.details).toEqual({ path: [12, 12] });
    });
    it('leaves the assignment untouched when the cycle is refused', () => {
      const employee = anEmployee({ id: 12, managerId: 40 });
      captureDomainError(() => employee.setManager(31, [31, 12]));
      expect(employee.managerId).toBe(40);
    });
    it('clears the manager when assigned null', () => {
      const employee = anEmployee({ id: 12, managerId: 31 });
      employee.setManager(null, []);
      expect(employee.managerId).toBeNull();
    });
  });
  describe('field changes', () => {
    it('changes role, team, name and contact', () => {
      const employee = anEmployee({ id: 12 });
      employee.setRole(Role.Employee);
      employee.setTeam(7);
      employee.setName('Nguyễn Văn Toàn');
      employee.setContact('0909 111 222');
      employee.setPasswordHash('$2b$04$hash');
      expect(employee).toMatchObject({
        role: Role.Employee,
        teamId: 7,
        name: 'Nguyễn Văn Toàn',
        contact: '0909 111 222',
        passwordHash: '$2b$04$hash',
      });
    });
  });
});
