import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
@Entity('contract_statuses')
@Unique('contract_statuses_code_key', ['code'])
export class ContractStatusLookup {
  @PrimaryGeneratedColumn('identity')
  id!: number;
  @Column({ type: 'varchar', length: 20 })
  code!: string;
}
