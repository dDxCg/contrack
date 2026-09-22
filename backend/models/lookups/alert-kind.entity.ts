import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('alert_kinds')
@Unique('alert_kinds_code_key', ['code'])
export class AlertKindLookup {
  @PrimaryGeneratedColumn('identity')
  id!: number;

  @Column({ type: 'varchar', length: 30 })
  code!: string;
}
