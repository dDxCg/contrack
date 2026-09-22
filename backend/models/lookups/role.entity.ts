import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('roles')
@Unique('roles_code_key', ['code'])
export class RoleLookup {
  @PrimaryGeneratedColumn('identity')
  id!: number;

  @Column({ type: 'varchar', length: 50 })
  code!: string;
}
