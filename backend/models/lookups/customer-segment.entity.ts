import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
@Entity('customer_segments')
@Unique('customer_segments_code_key', ['code'])
export class CustomerSegmentLookup {
  @PrimaryGeneratedColumn('identity')
  id!: number;
  @Column({ type: 'varchar', length: 20 })
  code!: string;
}
