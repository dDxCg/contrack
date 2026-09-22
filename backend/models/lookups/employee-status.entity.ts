import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('employee_statuses')
@Unique('employee_statuses_code_key', ['code'])
export class EmployeeStatusLookup {
  @PrimaryGeneratedColumn('identity')
  id!: number;

  @Column({ type: 'varchar', length: 20 })
  code!: string;
}
