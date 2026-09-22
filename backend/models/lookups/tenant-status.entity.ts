import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('tenant_statuses')
@Unique('tenant_statuses_code_key', ['code'])
export class TenantStatusLookup {
  @PrimaryGeneratedColumn('identity')
  id!: number;

  @Column({ type: 'varchar', length: 20 })
  code!: string;
}
