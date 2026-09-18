import { DataSource, EntityManager, EntityTarget, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
export interface Page {
  limit: number;
  offset: number;
}
export interface PageOf<T> {
  items: T[];
  total: number;
}
export abstract class TenantScopedRepository<T extends ObjectLiteral> {
  protected abstract readonly entity: EntityTarget<T>;
  protected constructor(protected readonly dataSource: DataSource) {}
  protected mgr(tx?: EntityManager): EntityManager {
    return tx ?? this.dataSource.manager;
  }
  protected scopedTo(tenantId: number, alias = 'entity', tx?: EntityManager): SelectQueryBuilder<T> {
    return this.scopedQuery(this.entity, tenantId, alias, tx);
  }
  protected unscopedTo(alias = 'entity', tx?: EntityManager): SelectQueryBuilder<T> {
    return this.mgr(tx).createQueryBuilder(this.entity, alias);
  }
  protected scopedQuery<E extends ObjectLiteral>(
    entity: EntityTarget<E>,
    tenantId: number,
    alias: string,
    tx?: EntityManager,
  ): SelectQueryBuilder<E> {
    return this.mgr(tx)
      .createQueryBuilder(entity, alias)
      .where(`${alias}.tenant_id = :tenantId`, { tenantId });
  }
  protected scopedIds(
    table: string,
    tenantId: number,
    alias: string,
    tx?: EntityManager,
  ): SelectQueryBuilder<ObjectLiteral> {
    return this.mgr(tx)
      .createQueryBuilder()
      .select(`${alias}.id`, 'id')
      .from(table, alias)
      .where(`${alias}.tenant_id = :tenantId`, { tenantId });
  }
  protected async lookupId(table: string, code: string, tx?: EntityManager): Promise<number> {
    const row = await this.mgr(tx)
      .createQueryBuilder()
      .select('t.id', 'id')
      .from(table, 't')
      .where('t.code = :code', { code })
      .getRawOne<{
        id: number;
      }>();
    if (row === undefined || row === null) {
      throw new Error(`Lookup ${table}.code='${code}' does not exist`);
    }
    return row.id;
  }
}
