import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('statement_statuses')
@Unique('statement_statuses_code_key', ['code'])
export class StatementStatusLookup {
  @PrimaryGeneratedColumn('identity')
  id!: number;

  @Column({ type: 'varchar', length: 20 })
  code!: string;
}
