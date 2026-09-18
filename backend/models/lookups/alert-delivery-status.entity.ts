import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
@Entity('alert_delivery_statuses')
@Unique('alert_delivery_statuses_code_key', ['code'])
export class AlertDeliveryStatusLookup {
  @PrimaryGeneratedColumn('identity')
  id!: number;
  @Column({ type: 'varchar', length: 20 })
  code!: string;
}
