import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('shift_statuses')
@Unique('shift_statuses_code_key', ['code'])
export class ShiftStatusLookup {
  @PrimaryGeneratedColumn('identity')
  id!: number;

  @Column({ type: 'varchar', length: 20 })
  code!: string;
}
