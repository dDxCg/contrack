import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { TeamHasMembersException, TeamLeadConflictException } from '../domain-errors';
import { Employee } from '../employees/employee.entity';
import { Tenant } from '../tenants/tenant.entity';

@Entity('teams')
@Unique('uq_teams_tenant_code', ['tenantId', 'code'])
@Unique('uq_teams_id_tenant', ['id', 'tenantId'])
export class Team {
  @PrimaryGeneratedColumn('identity')
  id!: number;

  @Index('idx_teams_tenant')
  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId!: number;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id', foreignKeyConstraintName: 'fk_teams_tenant' })
  tenant?: Tenant;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 20 })
  code!: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  members: Employee[] = [];

  setMembers(members: readonly Employee[]): this {
    this.members = [...members];

    return this;
  }

  lead(): Employee | null {
    return this.members.find((member) => member.isTeamLead()) ?? null;
  }

  memberCount(): number {
    return this.members.length;
  }

  addMember(employee: Employee): void {
    const existingLead = this.lead();

    if (employee.isTeamLead() && existingLead !== null) {
      throw new TeamLeadConflictException(existingLead.id);
    }

    this.members.push(employee);
  }

  assertDeletable(): void {
    if (this.memberCount() > 0) {
      throw new TeamHasMembersException(this.members.map((member) => member.id));
    }
  }

  setName(name: string): void {
    this.name = name;
  }

  setCode(code: string): void {
    this.code = code;
  }
}
