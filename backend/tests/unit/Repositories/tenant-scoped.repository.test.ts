import { DataSource, EntityTarget, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { Customer } from '../../../models/customers/customer.entity';
import { Employee } from '../../../models/employees/employee.entity';
import { TenantScopedRepository } from '../../../repositories/tenant-scoped.repository';
class FakeSelectQueryBuilder {
  readonly calls: Array<{
    method: string;
    args: unknown[];
  }> = [];
  private readonly raw: unknown;
  constructor(raw: unknown = undefined) {
    this.raw = raw;
  }
  select(...args: unknown[]): this {
    this.calls.push({ method: 'select', args });
    return this;
  }
  from(...args: unknown[]): this {
    this.calls.push({ method: 'from', args });
    return this;
  }
  where(...args: unknown[]): this {
    this.calls.push({ method: 'where', args });
    return this;
  }
  async getRawOne(): Promise<unknown> {
    return this.raw;
  }
}
class TestCustomerRepository extends TenantScopedRepository<Customer> {
  protected readonly entity: EntityTarget<Customer> = Customer;
  constructor(dataSource: DataSource) {
    super(dataSource);
  }
  byTenant(tenantId: number): SelectQueryBuilder<Customer> {
    return this.scopedTo(tenantId);
  }
  byTenantOn<E extends ObjectLiteral>(
    entity: EntityTarget<E>,
    tenantId: number,
    alias: string,
  ): SelectQueryBuilder<E> {
    return this.scopedQuery(entity, tenantId, alias);
  }
  async roleIdFor(code: string): Promise<number> {
    return this.lookupId('roles', code);
  }
}
describe('TenantScopedRepository', () => {
  const builder = new FakeSelectQueryBuilder();
  const dataSource = { createQueryBuilder: jest.fn(() => builder) } as unknown as DataSource;
  const repository = new TestCustomerRepository(dataSource);
  beforeEach(() => {
    jest.clearAllMocks();
    builder.calls.length = 0;
  });
  describe('scopedTo', () => {
    it('filters on the tenant_id column of the repository entity, before anything else can be added', () => {
      repository.byTenant(7);
      expect(dataSource.createQueryBuilder).toHaveBeenCalledWith(Customer, 'entity');
      expect(builder.calls).toEqual([
        { method: 'where', args: ['entity.tenant_id = :tenantId', { tenantId: 7 }] },
      ]);
    });
    it('binds the tenant as a query parameter, never as interpolated SQL', () => {
      repository.byTenant(7);
      const [, params] = builder.calls[0].args as [string, Record<string, unknown>];
      expect(params).toEqual({ tenantId: 7 });
    });
  });
  describe('scopedQuery', () => {
    it('filters any entity a repository has to reach across, still by tenant_id', () => {
      repository.byTenantOn(Employee, 7, 'e');
      expect(dataSource.createQueryBuilder).toHaveBeenCalledWith(Employee, 'e');
      expect(builder.calls).toEqual([
        { method: 'where', args: ['e.tenant_id = :tenantId', { tenantId: 7 }] },
      ]);
    });
  });
  describe('lookupId', () => {
    it('resolves a lookup row so the API can name a code and the schema can store an id', async () => {
      const lookupBuilder = new FakeSelectQueryBuilder({ id: 3 });
      (dataSource.createQueryBuilder as jest.Mock).mockReturnValueOnce(lookupBuilder);
      await expect(repository.roleIdFor('director')).resolves.toBe(3);
      expect(lookupBuilder.calls).toEqual([
        { method: 'select', args: ['t.id', 'id'] },
        { method: 'from', args: ['roles', 't'] },
        { method: 'where', args: ['t.code = :code', { code: 'director' }] },
      ]);
    });
    it('fails loudly when a lookup code has no row', async () => {
      const lookupBuilder = new FakeSelectQueryBuilder(undefined);
      (dataSource.createQueryBuilder as jest.Mock).mockReturnValueOnce(lookupBuilder);
      await expect(repository.roleIdFor('nope')).rejects.toThrow(/roles/);
    });
  });
});
