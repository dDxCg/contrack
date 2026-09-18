import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
export enum PhotoType {
  Before = 'before',
  After = 'after',
}
@Entity('shift_photos')
export class ShiftPhoto {
  @PrimaryGeneratedColumn('identity')
  id!: number;
  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId!: number;
  @Column({ name: 'shift_id', type: 'integer' })
  shiftId!: number;
  @Column({ name: 'type_id', type: 'integer' })
  typeId!: number;
  @Column({ type: 'varchar', length: 500 })
  url!: string;
  @Column({ name: 'captured_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  capturedAt!: Date;
  type!: PhotoType;
}
