import { aTeam, anEmployee } from '../../support/builders';
import { captureDomainError } from '../../support/domain-errors';
import { Role } from '../../../Models/employee.entity';

describe('Team', () => {
  describe('lead / memberCount — both derived from employees, never stored', () => {
    it('reports no lead for an empty team', () => {
      expect(aTeam().lead()).toBeNull();
      expect(aTeam().memberCount()).toBe(0);
    });

    it('reports the member holding the team-lead role', () => {
      const lead = anEmployee({ id: 31, role: Role.TeamLead, teamId: 7 });
      const team = aTeam({ members: [lead, anEmployee({ id: 40, role: Role.Employee, teamId: 7 })] });

      expect(team.lead()).toBe(lead);
      expect(team.memberCount()).toBe(2);
    });
  });

  describe('addMember — one team-lead per team (team.lead_conflict)', () => {
    it('accepts a second field employee', () => {
      const team = aTeam({ members: [anEmployee({ id: 31, role: Role.TeamLead, teamId: 7 })] });

      expect(() => team.addMember(anEmployee({ id: 40, role: Role.Employee, teamId: 7 }))).not.toThrow();
    });

    it('refuses a second team lead and names the member who already holds it', () => {
      const existingLead = anEmployee({ id: 31, role: Role.TeamLead, teamId: 7 });
      const team = aTeam({ members: [existingLead] });

      const error = captureDomainError(() => team.addMember(anEmployee({ id: 40, role: Role.TeamLead, teamId: 7 })));

      expect(error.code).toBe('team.lead_conflict');
      expect(error.getStatus()).toBe(409);
      expect(error.details).toEqual({ employee_id: 31 });
    });

    it('allows the first team lead into a leadless team', () => {
      const team = aTeam();

      expect(() => team.addMember(anEmployee({ id: 40, role: Role.TeamLead, teamId: 7 }))).not.toThrow();
      expect(team.lead()?.id).toBe(40);
    });
  });

  describe('assertDeletable — a team with members is not deleted (team.has_members)', () => {
    it('allows deleting an empty team', () => {
      expect(() => aTeam().assertDeletable()).not.toThrow();
    });

    it('refuses with the member ids', () => {
      const team = aTeam({ members: [anEmployee({ id: 31 }), anEmployee({ id: 40 })] });

      const error = captureDomainError(() => team.assertDeletable());

      expect(error.code).toBe('team.has_members');
      expect(error.getStatus()).toBe(409);
      expect(error.details).toEqual({ employee_ids: [31, 40] });
    });
  });

  describe('field changes', () => {
    it('changes name and code', () => {
      const team = aTeam();

      team.rename('Tổ 3 — PCCC');
      team.changeCode('T3');

      expect(team).toMatchObject({ name: 'Tổ 3 — PCCC', code: 'T3' });
    });
  });
});
