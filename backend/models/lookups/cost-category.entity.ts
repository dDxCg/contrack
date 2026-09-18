import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
@Entity('cost_categories')
@Unique('cost_categories_code_key', ['code'])
export class CostCategoryLookup {
  @PrimaryGeneratedColumn('identity')
  id!: number;
  @Column({ type: 'varchar', length: 20 })
  code!: string;
}
