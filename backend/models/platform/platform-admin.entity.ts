import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
@Entity('platform_admins')
@Unique('platform_admins_username_key', ['username'])
export class PlatformAdmin {
  @PrimaryGeneratedColumn('identity')
  id!: number;
  @Column({ type: 'varchar', length: 255 })
  name!: string;
  @Column({ type: 'varchar', length: 100 })
  username!: string;
  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;
  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
