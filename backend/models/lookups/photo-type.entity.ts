import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
@Entity('photo_types')
@Unique('photo_types_code_key', ['code'])
export class PhotoTypeLookup {
  @PrimaryGeneratedColumn('identity')
  id!: number;
  @Column({ type: 'varchar', length: 20 })
  code!: string;
}
