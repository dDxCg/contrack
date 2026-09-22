import { DataSource, EntityManager, EntityTarget, ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export class CrossTenantLookup {
  constructor(private readonly dataSource: DataSource) {}

  queryFor<E extends ObjectLiteral>(
    entity: EntityTarget<E>,
    alias: string,
    tx?: EntityManager,
  ): SelectQueryBuilder<E> {
    return (tx ?? this.dataSource.manager).createQueryBuilder(entity, alias);
  }
}
