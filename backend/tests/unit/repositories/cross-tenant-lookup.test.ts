import { DataSource } from 'typeorm';
import { Employee } from '../../../models/employees/employee.entity';
import { CrossTenantLookup } from '../../../repositories/cross-tenant-lookup';

describe('CrossTenantLookup', () => {
  it('builds a query with no tenant filter — the explicit escape hatch, not an inherited one', () => {
    const builder = { where: jest.fn() };
    const createQueryBuilder = jest.fn(() => builder);
    const dataSource = { manager: { createQueryBuilder } } as unknown as DataSource;
    const lookup = new CrossTenantLookup(dataSource);
    const result = lookup.queryFor(Employee, 'e');
    expect(createQueryBuilder).toHaveBeenCalledWith(Employee, 'e');
    expect(result).toBe(builder);
  });
  it('runs inside a transaction when a manager is passed', () => {
    const builder = {};
    const txCreateQueryBuilder = jest.fn(() => builder);
    const dataSource = { manager: { createQueryBuilder: jest.fn() } } as unknown as DataSource;
    const tx = { createQueryBuilder: txCreateQueryBuilder } as never;
    const lookup = new CrossTenantLookup(dataSource);
    const result = lookup.queryFor(Employee, 'e', tx);
    expect(txCreateQueryBuilder).toHaveBeenCalledWith(Employee, 'e');
    expect(dataSource.manager.createQueryBuilder).not.toHaveBeenCalled();
    expect(result).toBe(builder);
  });
});
