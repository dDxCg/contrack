import { DataSource, EntityTarget, ObjectLiteral, SelectQueryBuilder } from 'typeorm';

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

  protected scopedTo(tenantId: number, alias = 'entity'): SelectQueryBuilder<T> {
    return this.scopedQuery(this.entity, tenantId, alias);
  }

  protected unscopedTo(alias = 'entity'): SelectQueryBuilder<T> {
    return this.dataSource.createQueryBuilder(this.entity, alias);
  }

  protected scopedQuery<E extends ObjectLiteral>(
    entity: EntityTarget<E>,
    tenantId: number,
    alias: string,
  ): SelectQueryBuilder<E> {
    return this.dataSource
      .createQueryBuilder(entity, alias)
      .where(`${alias}.tenant_id = :tenantId`, { tenantId });
  }

  protected scopedIds(table: string, tenantId: number, alias: string): SelectQueryBuilder<ObjectLiteral> {
    return this.dataSource
      .createQueryBuilder()
      .select(`${alias}.id`, 'id')
      .from(table, alias)
      .where(`${alias}.tenant_id = :tenantId`, { tenantId });
  }

  protected async lookupId(table: string, code: string): Promise<number> {
    const row = await this.dataSource
      .createQueryBuilder()
      .select('t.id', 'id')
      .from(table, 't')
      .where('t.code = :code', { code })
      .getRawOne<{ id: number }>();

    if (row === undefined || row === null) {
      throw new Error(`Lookup ${table}.code='${code}' does not exist`);
    }

    return row.id;
  }
}
