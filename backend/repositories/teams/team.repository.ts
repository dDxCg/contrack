import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityTarget } from 'typeorm';
import { DATA_SOURCE } from '../../data/db-context/data-source';
import { Team } from '../../models/teams/team.entity';
import { TenantScopedRepository } from '../tenant-scoped.repository';
export interface ITeamRepository {
  list(tenantId: number, options?: { teamId?: number }): Promise<Team[]>;
  findById(tenantId: number, id: number): Promise<Team | null>;
  existsCode(tenantId: number, code: string): Promise<boolean>;
  create(team: Team): Promise<Team>;
  update(team: Team): Promise<Team>;
  delete(tenantId: number, id: number): Promise<void>;
}
@Injectable()
export class TeamRepository extends TenantScopedRepository<Team> implements ITeamRepository {
  protected override readonly entity: EntityTarget<Team> = Team;
  constructor(
    @Inject(DATA_SOURCE)
    dataSource: DataSource,
  ) {
    super(dataSource);
  }
  async list(
    tenantId: number,
    options: {
      teamId?: number;
    } = {},
  ): Promise<Team[]> {
    const query = this.scopedTo(tenantId, 't');
    if (options.teamId !== undefined) {
      query.andWhere('t.id = :teamId', { teamId: options.teamId });
    }
    const rows = await query.orderBy('t.id', 'ASC').getMany();
    return rows;
  }
  async findById(tenantId: number, id: number): Promise<Team | null> {
    return this.scopedTo(tenantId, 't').andWhere('t.id = :id', { id }).getOne();
  }
  async existsCode(tenantId: number, code: string): Promise<boolean> {
    const count = await this.scopedTo(tenantId, 't').andWhere('t.code = :code', { code }).getCount();
    return count > 0;
  }
  async create(team: Team): Promise<Team> {
    const saved = await this.dataSource.getRepository(Team).save(team);
    return (await this.findById(saved.tenantId, saved.id)) ?? saved;
  }
  async update(team: Team): Promise<Team> {
    const saved = await this.dataSource.getRepository(Team).save(team);
    return (await this.findById(saved.tenantId, saved.id)) ?? saved;
  }
  async delete(tenantId: number, id: number): Promise<void> {
    await this.dataSource.getRepository(Team).delete({ id, tenantId });
  }
}
