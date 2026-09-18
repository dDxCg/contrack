import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { EmployeeHasAssignedShiftsException, EmployeeManagerCycleException } from '../domain-errors';
import { EmployeeStatusLookup } from '../lookups/employee-status.entity';
import { RoleLookup } from '../lookups/role.entity';
import { Team } from '../teams/team.entity';
import { Tenant } from '../tenants/tenant.entity';
export enum Role {
  Director = 'director',
  Accountant = 'accountant',
  Manager = 'manager',
  TeamLead = 'team_lead',
  Employee = 'employee',
}
export enum EmployeeStatus {
  Active = 'active',
  Terminated = 'terminated',
}
@Entity('employees')
@Unique('uq_employees_email', ['email'])
export class Employee {
  @PrimaryGeneratedColumn('identity')
  id!: number;
  @Index('idx_employees_tenant')
  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId!: number;
  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id', foreignKeyConstraintName: 'fk_employees_tenant' })
  tenant?: Tenant;
  @Column({ type: 'varchar', length: 255 })
  name!: string;
  @Column({ type: 'varchar', length: 255, nullable: true })
  contact!: string | null;
  @Column({ type: 'varchar', length: 255 })
  email!: string;
  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string | null;
  @Index('idx_employees_manager')
  @Column({ name: 'manager_id', type: 'integer', nullable: true })
  managerId!: number | null;
  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'manager_id', foreignKeyConstraintName: 'fk_employees_manager' })
  manager?: Employee;
  @Index('idx_employees_team')
  @Column({ name: 'team_id', type: 'integer', nullable: true })
  teamId!: number | null;
  @ManyToOne(() => Team)
  @JoinColumn({ name: 'team_id', foreignKeyConstraintName: 'fk_employees_team' })
  team?: Team;
  @Column({ name: 'role_id', type: 'integer' })
  roleId!: number;
  @ManyToOne(() => RoleLookup)
  @JoinColumn({ name: 'role_id', foreignKeyConstraintName: 'fk_employees_role' })
  roleLookup?: RoleLookup;
  @Index('idx_employees_status')
  @Column({ name: 'status_id', type: 'integer', default: 1 })
  statusId!: number;
  @ManyToOne(() => EmployeeStatusLookup)
  @JoinColumn({ name: 'status_id', foreignKeyConstraintName: 'fk_employees_status' })
  statusLookup?: EmployeeStatusLookup;
  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
  role!: Role;
  status!: EmployeeStatus;
  isTeamLead(): boolean {
    return this.role === Role.TeamLead;
  }
  isActive(): boolean {
    return this.status === EmployeeStatus.Active;
  }
  setManager(managerId: number | null, managerChainIds: readonly number[] = []): void {
    if (managerId === null) {
      this.managerId = null;
      return;
    }
    const path = managerId === this.id ? [this.id, this.id] : this.cyclePathThrough(managerChainIds);
    if (path !== null) {
      throw new EmployeeManagerCycleException(path);
    }
    this.managerId = managerId;
  }
  setTeam(teamId: number | null): void {
    this.teamId = teamId;
  }
  setRole(role: Role): void {
    this.role = role;
  }
  setName(name: string): void {
    this.name = name;
  }
  setContact(contact: string | null): void {
    this.contact = contact;
  }
  setPasswordHash(passwordHash: string): void {
    this.passwordHash = passwordHash;
  }
  setStatus(status: EmployeeStatus): void {
    this.status = status;
  }
  deactivate(futureShiftIds: readonly number[]): void {
    if (futureShiftIds.length > 0) {
      throw new EmployeeHasAssignedShiftsException(futureShiftIds);
    }
    this.status = EmployeeStatus.Terminated;
  }
  private cyclePathThrough(managerChainIds: readonly number[]): number[] | null {
    const index = managerChainIds.indexOf(this.id);
    return index < 0 ? null : [this.id, ...managerChainIds.slice(0, index + 1)];
  }
}
