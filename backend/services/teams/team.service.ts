import { Injectable } from '@nestjs/common';
import { TeamView, TeamPage } from '../../dtos/teams/teams.response.dto';
import { AuthOutOfScopeException, TeamCodeTakenException } from '../../models/domain-errors';
import { Team } from '../../models/teams/team.entity';
import { EmployeeRepository } from '../../repositories/employees/employee.repository';
import { TeamRepository } from '../../repositories/teams/team.repository';
import { AccessContext } from '../access-control/access-context';
import { RowScope } from '../access-control/row-scope';

export interface TeamCreateCommand {
  name: string;
  code: string;
}

export interface TeamUpdateCommand {
  name?: string;
  code?: string;
}

@Injectable()
export class TeamService {
  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly employeeRepository: EmployeeRepository,
  ) {}

  async list(access: AccessContext): Promise<TeamPage> {
    const onlyTeamId = access.scope === RowScope.Team ? access.employee.teamId : null;
    if (access.scope === RowScope.Team && onlyTeamId === null) {
      return { items: [] };
    }

    const teams = await this.teamRepository.list(
      access.tenantId,
      onlyTeamId === null ? {} : { teamId: onlyTeamId },
    );

    return { items: await this.toViews(access, teams) };
  }

  async get(access: AccessContext, id: number): Promise<TeamView> {
    const [view] = await this.toViews(access, [await this.requireTeam(access, id)]);

    return view;
  }

  async create(access: AccessContext, command: TeamCreateCommand): Promise<TeamView> {
    if (await this.teamRepository.existsCode(access.tenantId, command.code)) {
      throw new TeamCodeTakenException(command.code);
    }

    const team = new Team();
    team.tenantId = access.tenantId;
    team.setName(command.name);
    team.setCode(command.code);

    return this.toView(await this.teamRepository.create(team), []);
  }

  async update(access: AccessContext, id: number, command: TeamUpdateCommand): Promise<TeamView> {
    const team = await this.requireTeam(access, id);

    if (command.code !== undefined && command.code !== team.code) {
      if (await this.teamRepository.existsCode(access.tenantId, command.code)) {
        throw new TeamCodeTakenException(command.code);
      }
      team.setCode(command.code);
    }
    if (command.name !== undefined) {
      team.setName(command.name);
    }

    const [view] = await this.toViews(access, [await this.teamRepository.update(team)]);

    return view;
  }

  async delete(access: AccessContext, id: number): Promise<void> {
    const team = await this.requireTeam(access, id);
    team.setMembers(await this.employeeRepository.findByTeamIds(access.tenantId, [id])).assertDeletable();

    await this.teamRepository.delete(access.tenantId, id);
  }

  private async requireTeam(access: AccessContext, id: number): Promise<Team> {
    const team = await this.teamRepository.findById(access.tenantId, id);
    if (team === null || (access.scope === RowScope.Team && team.id !== access.employee.teamId)) {
      throw new AuthOutOfScopeException();
    }

    return team;
  }

  private async toViews(access: AccessContext, teams: Team[]): Promise<TeamView[]> {
    const members = await this.employeeRepository.findByTeamIds(
      access.tenantId,
      teams.map((team) => team.id),
    );

    return teams.map((team) =>
      this.toView(
        team,
        members.filter((member) => member.teamId === team.id),
      ),
    );
  }

  private toView(team: Team, members: Parameters<Team['setMembers']>[0]): TeamView {
    const hydrated = team.setMembers(members);

    return {
      id: hydrated.id,
      name: hydrated.name,
      code: hydrated.code,
      lead: hydrated.lead()?.name ?? null,
      member_count: hydrated.memberCount(),
    };
  }
}
