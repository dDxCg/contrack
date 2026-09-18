import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { TeamHasMembersException, TeamLeadConflictException } from '../domain-errors';
import { Employee } from '../employees/employee.entity';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('identity')
  id!: number;

  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId!: number;

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
