import { DataSource } from 'typeorm';
import { anAccessContext, anEmployee } from '../../support/builders';
import { captureDomainErrorAsync } from '../../support/domain-errors';
import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedTenant } from '../../support/seed';
import { Customer, CustomerSegment } from '../../../models/customers/customer.entity';
import { Role } from '../../../models/employees/employee.entity';
import { CustomerRepository } from '../../../repositories/customers/customer.repository';
import { CustomerService } from '../../../services/customers/customer.service';

async function world() {
  const dataSource = await createTestDataSource();
  const repository = new CustomerRepository(dataSource);
  const tenant = await seedTenant(dataSource);
  const otherTenant = await seedTenant(dataSource, { name: 'Other Tenant' });
  const director = anEmployee({ id: 12, tenantId: tenant.id, role: Role.Director });

  const keangnam = await repository.create(
    draftCustomer({
      tenantId: tenant.id,
      name: 'Keangnam Landmark 72',
      companyName: 'Keangnam',
      contact: 'Chị Lan · 0912 345 678',
      address: 'Hà Nội',
    }),
  );
  const goldenPark = await repository.create(
    draftCustomer({
      tenantId: tenant.id,
      name: 'Chung cư Golden Park',
      companyName: null,
      contact: null,
      address: null,
    }),
  );
  const otherTenantCustomer = await repository.create(
    draftCustomer({ tenantId: otherTenant.id, name: 'Công ty của tenant khác' }),
  );

  return {
    dataSource,
    repository,
    service: new CustomerService(repository),
    access: anAccessContext(director, { tenantId: tenant.id }),
    keangnam,
    goldenPark,
    otherTenantCustomer,
  };
}

function draftCustomer(overrides: Partial<Customer>): Customer {
  const customer = new Customer();
  customer.setName('');
  customer.setCompanyName(null);
  customer.setContact(null);
  customer.setAddress(null);
  customer.setSegment(CustomerSegment.Regular);
  Object.assign(customer, overrides);

  return customer;
}

async function seedActiveContract(
  dataSource: DataSource,
  tenantId: number,
  customerId: number,
): Promise<number> {
  const [row] = (await dataSource.query(
    `INSERT INTO contracts (tenant_id, customer_id, signed_at, expires_at) VALUES ($1, $2, '2024-01-01', '2024-12-31') RETURNING id`,
    [tenantId, customerId],
  )) as { id: number }[];

  return row.id;
}

describe('CustomerService.list — FR21', () => {
  it('answers the collection envelope with only the caller’s tenant', async () => {
    const { service, access, keangnam, goldenPark } = await world();

    const page = await service.list(access, { limit: 25, offset: 0 });

    expect(page.total).toBe(2);
    expect(page.limit).toBe(25);
    expect(page.offset).toBe(0);
    expect(page.items.map((customer) => customer.id)).toEqual([keangnam.id, goldenPark.id]);
  });

  it('pages without leaking the total of other tenants', async () => {
    const { service, access, goldenPark } = await world();

    const page = await service.list(access, { limit: 1, offset: 1 });

    expect(page.items.map((customer) => customer.id)).toEqual([goldenPark.id]);
    expect(page.total).toBe(2);
  });

  it('returns the schema shape — snake_case columns, ISO timestamp, nullable columns kept', async () => {
    const { service, access, keangnam } = await world();

    const page = await service.list(access, { limit: 25, offset: 0 });

    expect(page.items[0]).toEqual({
      id: keangnam.id,
      name: 'Keangnam Landmark 72',
      company_name: 'Keangnam',
      contact: 'Chị Lan · 0912 345 678',
      address: 'Hà Nội',
      segment: CustomerSegment.Regular,
      created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) as string,
    });
  });
});

describe('CustomerService.get', () => {
  it('returns a customer of the caller’s tenant', async () => {
    const { service, access, keangnam } = await world();

    await expect(service.get(access, keangnam.id)).resolves.toMatchObject({
      id: keangnam.id,
      name: 'Keangnam Landmark 72',
    });
  });

  it('answers 404 auth.out_of_scope for another tenant’s customer — indistinguishable from a missing one', async () => {
    const { service, access, otherTenantCustomer } = await world();

    const otherTenant = await captureDomainErrorAsync(() => service.get(access, otherTenantCustomer.id));
    const missing = await captureDomainErrorAsync(() => service.get(access, 999999));

    expect(otherTenant.code).toBe('auth.out_of_scope');
    expect(otherTenant.getStatus()).toBe(404);
    expect(missing.code).toBe('auth.out_of_scope');
    expect(otherTenant.details).toEqual(missing.details);
  });
});

describe('CustomerService.create', () => {
  it('creates a customer inside the caller’s tenant, defaulting the segment to regular', async () => {
    const { service, access } = await world();

    const created = await service.create(access, { name: 'Chung cư Golden Park' });

    expect(created).toMatchObject({
      name: 'Chung cư Golden Park',
      company_name: null,
      contact: null,
      address: null,
      segment: CustomerSegment.Regular,
    });
    expect(created.id).toBeGreaterThan(0);
  });

  it('accepts the vip segment and the optional fields', async () => {
    const { service, access } = await world();

    const created = await service.create(access, {
      name: 'Keangnam',
      companyName: 'Keangnam JSC',
      contact: 'Chị Lan',
      address: 'Hà Nội',
      segment: CustomerSegment.Vip,
    });

    expect(created).toMatchObject({
      company_name: 'Keangnam JSC',
      contact: 'Chị Lan',
      address: 'Hà Nội',
      segment: CustomerSegment.Vip,
    });
  });
});

describe('CustomerService.update', () => {
  it('updates the fields the form sends', async () => {
    const { service, access, keangnam } = await world();

    const updated = await service.update(access, keangnam.id, {
      name: 'Keangnam Landmark 72 (gia hạn)',
      companyName: 'Keangnam',
      contact: 'Chị Lan',
      address: 'Hà Nội',
      segment: CustomerSegment.Vip,
    });

    expect(updated).toMatchObject({
      id: keangnam.id,
      name: 'Keangnam Landmark 72 (gia hạn)',
      segment: CustomerSegment.Vip,
    });
  });

  it('answers 404 auth.out_of_scope for another tenant’s customer', async () => {
    const { service, access, repository, otherTenantCustomer } = await world();

    const error = await captureDomainErrorAsync(() =>
      service.update(access, otherTenantCustomer.id, { name: 'Chiếm đoạt' }),
    );

    expect(error.code).toBe('auth.out_of_scope');
    const untouched = await repository.findById(otherTenantCustomer.tenantId, otherTenantCustomer.id);
    expect(untouched?.name).toBe('Công ty của tenant khác');
  });

  it('answers 404 for a customer that does not exist', async () => {
    const { service, access } = await world();

    expect((await captureDomainErrorAsync(() => service.update(access, 999999, { name: 'x' }))).code).toBe(
      'auth.out_of_scope',
    );
  });
});

describe('CustomerService.delete', () => {
  it('deletes a customer with no contract left', async () => {
    const { service, access, repository, keangnam } = await world();

    await service.delete(access, keangnam.id);

    expect(await repository.findById(keangnam.tenantId, keangnam.id)).toBeNull();
  });

  it('refuses while a non-terminated contract exists (customer.has_active_contracts, FR21)', async () => {
    const { service, access, dataSource, repository, keangnam } = await world();
    const contractId = await seedActiveContract(dataSource, keangnam.tenantId, keangnam.id);

    const error = await captureDomainErrorAsync(() => service.delete(access, keangnam.id));

    expect(error.code).toBe('customer.has_active_contracts');
    expect(error.getStatus()).toBe(409);
    expect(error.details).toEqual({ contract_ids: [contractId] });
    expect(await repository.findById(keangnam.tenantId, keangnam.id)).not.toBeNull();
  });

  it('never deletes another tenant’s customer', async () => {
    const { service, access, repository, otherTenantCustomer } = await world();

    const error = await captureDomainErrorAsync(() => service.delete(access, otherTenantCustomer.id));

    expect(error.code).toBe('auth.out_of_scope');
    expect(await repository.findById(otherTenantCustomer.tenantId, otherTenantCustomer.id)).not.toBeNull();
  });
});
