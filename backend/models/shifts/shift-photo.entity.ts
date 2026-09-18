import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PhotoTypeLookup } from '../lookups/photo-type.entity';
import { Tenant } from '../tenants/tenant.entity';
import { Shift } from './shift.entity';
export enum PhotoType {
  Before = 'before',
  After = 'after',
}
@Entity('shift_photos')
export class ShiftPhoto {
  @PrimaryGeneratedColumn('identity')
  id!: number;
  @Index('idx_shift_photos_tenant')
  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId!: number;
  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id', foreignKeyConstraintName: 'fk_shift_photos_tenant' })
  tenant?: Tenant;
  @Index('idx_shift_photos_shift')
  @Column({ name: 'shift_id', type: 'integer' })
  shiftId!: number;
  @ManyToOne(() => Shift, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'shift_id', referencedColumnName: 'id', foreignKeyConstraintName: 'fk_shift_photos_shift' },
    {
      name: 'tenant_id',
      referencedColumnName: 'tenantId',
      foreignKeyConstraintName: 'fk_shift_photos_shift',
    },
  ])
  shift?: Shift;
  @Index('idx_shift_photos_type')
  @Column({ name: 'type_id', type: 'integer' })
  typeId!: number;
  @ManyToOne(() => PhotoTypeLookup)
  @JoinColumn({ name: 'type_id', foreignKeyConstraintName: 'fk_shift_photos_type' })
  typeLookup?: PhotoTypeLookup;
  @Column({ type: 'varchar', length: 500 })
  url!: string;
  @Column({ name: 'captured_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  capturedAt!: Date;
  type!: PhotoType;
}
