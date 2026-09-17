import { anAccessContext, anEmployee, aCustomer } from '../../support/builders';
import { captureDomainErrorAsync } from '../../support/domain-errors';
import { InMemoryCustomerRepository, InMemoryDb } from '../../support/in-memory-repositories';
import { CustomerSegment } from '../../../Models/customer.entity';
import { Role } from '../../../Models/employee.entity';
import { CustomerService } from '../../../Services/customer.service';

function world() {
  const db = new InMemoryDb();
  const repository = new InMemoryCustomerRepository(db);
  const director = anEmployee({ id: 12, tenantId: 1, role: Role.Director });
  const keangnam = aCustomer({ id: 89, tenantId: 1, name: 'Keangnam Landmark 72' });
  const goldenPark = aCustomer({ id: 90, tenantId: 1, name: 'Chung cư Golden Park', companyName: null, contact: null });
  const otherTenant = aCustomer({ id: 91, tenantId: 2, name: 'Công ty của tenant khác' });
  db.customers.push(keangnam, goldenPark, otherTenant);

  return { db, repository, service: new CustomerService(repository), access: anAccessContext(director), keangnam };
}

describe('CustomerService.list — FR21', () => {
  it('answers the collection envelope with only the caller’s tenant', async () => {
    const { service, access } = world();

    const page = await service.list(access, { limit: 25, offset: 0 });

    expect(page.total).toBe(2);
    expect(page.limit).toBe(25);
    expect(page.offset).toBe(0);
    expect(page.items.map((customer) => customer.id)).toEqual([89, 90]);
  });

  it('pages without leaking the total of other tenants', async () => {
    const { service, access } = world();

    const page = await service.list(access, { limit: 1, offset: 1 });

    expect(page.items.map((customer) => customer.id)).toEqual([90]);
    expect(page.total).toBe(2);
  });

  it('returns the schema shape — snake_case columns, ISO timestamp, nullable columns kept', async () => {
    const { service, access } = world();

    const page = await service.list(access, { limit: 25, offset: 0 });

    expect(page.items[0]).toEqual({
      id: 89,
      name: 'Keangnam Landmark 72',
      company_name: 'Keangnam',
      contact: 'Chị Lan · 0912 345 678',
      address: 'Hà Nội',
      segment: CustomerSegment.Regular,
      created_at: '2024-01-15T00:00:00.000Z',
    });
  });
});

describe('CustomerService.get', () => {
  it('returns a customer of the caller’s tenant', async () => {
    const { service, access } = world();

    await expect(service.get(access, 89)).resolves.toMatchObject({ id: 89, name: 'Keangnam Landmark 72' });
  });

  it('answers 404 auth.out_of_scope for another tenant’s customer — indistinguishable from a missing one', async () => {
    const { service, access } = world();

    const otherTenant = await captureDomainErrorAsync(() => service.get(access, 91));
    const missing = await captureDomainErrorAsync(() => service.get(access, 999));

    expect(otherTenant.code).toBe('auth.out_of_scope');
    expect(otherTenant.getStatus()).toBe(404);
    expect(missing.code).toBe('auth.out_of_scope');
    expect(otherTenant.details).toEqual(missing.details);
  });
});

describe('CustomerService.create', () => {
  it('creates a customer inside the caller’s tenant, defaulting the segment to regular', async () => {
    const { service, access, db } = world();

    const created = await service.create(access, { name: 'Chung cư Golden Park' });

    expect(created).toMatchObject({
      name: 'Chung cư Golden Park',
      company_name: null,
      contact: null,
      address: null,
      segment: CustomerSegment.Regular,
    });
    expect(created.id).toBeGreaterThan(0);
    expect(db.customers.filter((customer) => customer.tenantId === 1)).toHaveLength(3);
  });

  it('accepts the vip segment and the optional fields', async () => {
    const { service, access } = world();

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
    const { service, access } = world();

    const updated = await service.update(access, 89, {
      name: 'Keangnam Landmark 72 (gia hạn)',
      companyName: 'Keangnam',
      contact: 'Chị Lan',
      address: 'Hà Nội',
      segment: CustomerSegment.Vip,
    });

    expect(updated).toMatchObject({ id: 89, name: 'Keangnam Landmark 72 (gia hạn)', segment: CustomerSegment.Vip });
  });

  it('answers 404 auth.out_of_scope for another tenant’s customer', async () => {
    const { service, access, db } = world();

    const error = await captureDomainErrorAsync(() =>
      service.update(access, 91, { name: 'Chiếm đoạt' }),
    );

    expect(error.code).toBe('auth.out_of_scope');
    expect(db.customers.find((customer) => customer.id === 91)?.name).toBe('Công ty của tenant khác');
  });

  it('answers 404 for a customer that does not exist', async () => {
    const { service, access } = world();

    expect((await captureDomainErrorAsync(() => service.update(access, 999, { name: 'x' }))).code).toBe(
      'auth.out_of_scope',
    );
  });
});

describe('CustomerService.delete', () => {
  it('deletes a customer with no contract left', async () => {
    const { service, access, db } = world();

    await service.delete(access, 89);

    expect(db.customers.some((customer) => customer.id === 89)).toBe(false);
  });

  it('refuses while a non-terminated contract exists (customer.has_active_contracts, FR21)', async () => {
    const { service, access, db, keangnam } = world();
    db.activeContracts.set(keangnam.id, [89, 91]);

    const error = await captureDomainErrorAsync(() => service.delete(access, keangnam.id));

    expect(error.code).toBe('customer.has_active_contracts');
    expect(error.getStatus()).toBe(409);
    expect(error.details).toEqual({ contract_ids: [89, 91] });
    expect(db.customers.some((customer) => customer.id === keangnam.id)).toBe(true);
  });

  it('never deletes another tenant’s customer', async () => {
    const { service, access, db } = world();

    const error = await captureDomainErrorAsync(() => service.delete(access, 91));

    expect(error.code).toBe('auth.out_of_scope');
    expect(db.customers.some((customer) => customer.id === 91)).toBe(true);
  });
});
