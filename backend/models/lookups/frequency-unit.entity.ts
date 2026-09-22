import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('frequency_units')
@Unique('frequency_units_code_key', ['code'])
export class FrequencyUnitLookup {
  @PrimaryGeneratedColumn('identity')
  id!: number;

  @Column({ type: 'varchar', length: 20 })
  code!: string;
}
