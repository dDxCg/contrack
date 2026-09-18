import { anAccessContext, anEmployee } from '../../support/builders';
import { captureDomainErrorAsync } from '../../support/domain-errors';
import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedTenant } from '../../support/seed';
import { Customer, CustomerSegment } from '../../../models/customers/customer.entity';
import { FrequencyUnit } from '../../../models/contracts/contract-item.entity';
import { Role } from '../../../models/employees/employee.entity';
import { ContractItemRepository } from '../../../repositories/contracts/contract-item.repository';
import { ContractRepository } from '../../../repositories/contracts/contract.repository';
import { ContractSiteRepository } from '../../../repositories/contracts/contract-site.repository';
import { CustomerRepository } from '../../../repositories/customers/customer.repository';
import { ShiftRepository } from '../../../repositories/shifts/shift.repository';
import { ContractCreateCommand, ContractService } from '../../../services/contracts/contract.service';
import { ScheduleGeneratorService } from '../../../services/contracts/schedule-generator.service';
async function world() {
  const dataSource = await createTestDataSource();
  const contracts = new ContractRepository(dataSource);
  const sites = new ContractSiteRepository(dataSource);
  const items = new ContractItemRepository(dataSource);
  const shifts = new ShiftRepository(dataSource);
  const customers = new CustomerRepository(dataSource);
  const tenant = await seedTenant(dataSource);
  const otherTenant = await seedTenant(dataSource, { name: 'Other Tenant' });
  const director = anEmployee({
    id: 12,
    tenantId: tenant.id,
    email: 'giam.doc@example.com',
    role: Role.Director,
  });
  const customerDraft = new Customer();
  customerDraft.tenantId = tenant.id;
  customerDraft.setName('Keangnam');
  customerDraft.setCompanyName(null);
  customerDraft.setContact(null);
  customerDraft.setAddress(null);
  customerDraft.setSegment(CustomerSegment.Regular);
  const customer = await customers.create(customerDraft);
  return {
    dataSource,
    contracts,
    sites,
    items,
    shifts,
    tenant,
    otherTenant,
    customer,
    access: anAccessContext(director, { tenantId: tenant.id }),
    service: new ContractService(contracts, sites, items, shifts, new ScheduleGeneratorService()),
  };
}
function validCommand(
  customerId: number,
  overrides: Partial<ContractCreateCommand> = {},
): ContractCreateCommand {
  return {
    customerId,
    signedAt: new Date('2024-01-01'),
    expiresAt: new Date('2024-03-01'),
    sites: [
      {
        name: 'Toà A',
        workRequirements: null,
        notes: null,
        items: [
          {
            name: 'Vệ sinh sảnh',
            frequencyCount: 1,
            frequencyUnit: FrequencyUnit.Week,
            frequencyRule: null,
            unitPrice: 500000,
          },
          {
            name: 'Vệ sinh kính',
            frequencyCount: 1,
            frequencyUnit: FrequencyUnit.Month,
            frequencyRule: null,
            unitPrice: 1200000,
          },
        ],
      },
    ],
    ...overrides,
  };
}
describe('ContractService.create — FR5, FR6, FR7, FR22', () => {
  it('creates the contract with its nested sites and items', async () => {
    const { service, access, customer } = await world();
    const view = await service.create(access, validCommand(customer.id));
    expect(view).toMatchObject({
      customer_id: customer.id,
      status: 'active',
      sites: [
        {
          name: 'Toà A',
          items: [
            { name: 'Vệ sinh sảnh', frequency_count: 1, frequency_unit: 'week', unit_price: 500000 },
            { name: 'Vệ sinh kính', frequency_count: 1, frequency_unit: 'month', unit_price: 1200000 },
          ],
        },
      ],
    });
  });
  it('generates the full shift schedule immediately, one item at a time', async () => {
    const { service, access, customer, dataSource, tenant } = await world();
    await service.create(access, validCommand(customer.id));
    const shiftRows = (await dataSource.query(
      'SELECT assignee_id, status_id FROM shifts WHERE tenant_id = $1',
      [tenant.id],
    )) as {
      assignee_id: number | null;
      status_id: number;
    }[];
    const [scheduledStatus] = (await dataSource.query(
      `SELECT id FROM shift_statuses WHERE code = 'scheduled'`,
    )) as {
      id: number;
    }[];
    expect(shiftRows).toHaveLength(9 + 3);
    expect(shiftRows.every((shift) => shift.assignee_id === null)).toBe(true);
    expect(shiftRows.every((shift) => shift.status_id === scheduledStatus.id)).toBe(true);
  });
  it('rejects with the specific field named when no site is given', async () => {
    const { service, access, customer } = await world();
    const error = await captureDomainErrorAsync(() =>
      service.create(access, validCommand(customer.id, { sites: [] })),
    );
    expect(error.code).toBe('validation.failed');
    expect(error.details).toEqual({ fields: [{ field: 'sites', message: expect.any(String) }] });
  });
  it('rejects with the specific field named when a site has no service item', async () => {
    const { service, access, customer } = await world();
    const command = validCommand(customer.id, {
      sites: [{ name: 'Toà A', workRequirements: null, notes: null, items: [] }],
    });
    const error = await captureDomainErrorAsync(() => service.create(access, command));
    expect(error.code).toBe('validation.failed');
    expect(error.details).toEqual({ fields: [{ field: 'sites[0].items', message: expect.any(String) }] });
  });
  it('rejects with the specific field named when an item is missing its frequency', async () => {
    const { service, access, customer } = await world();
    const command = validCommand(customer.id);
    command.sites[0].items[0].frequencyCount = 0;
    const error = await captureDomainErrorAsync(() => service.create(access, command));
    expect(error.code).toBe('validation.failed');
    expect(error.details).toEqual({
      fields: [{ field: 'sites[0].items[0].frequency_count', message: expect.any(String) }],
    });
  });
  it('rejects with the specific field named when an item is missing its unit price', async () => {
    const { service, access, customer } = await world();
    const command = validCommand(customer.id);
    command.sites[0].items[1].unitPrice = -1;
    const error = await captureDomainErrorAsync(() => service.create(access, command));
    expect(error.code).toBe('validation.failed');
    expect(error.details).toEqual({
      fields: [{ field: 'sites[0].items[1].unit_price', message: expect.any(String) }],
    });
  });
  it('reports every violation at once rather than stopping at the first', async () => {
    const { service, access, customer } = await world();
    const command = validCommand(customer.id);
    command.sites[0].items[0].frequencyCount = 0;
    command.sites[0].items[1].unitPrice = -1;
    const error = await captureDomainErrorAsync(() => service.create(access, command));
    expect(
      (
        error.details.fields as {
          field: string;
        }[]
      ).map((violation) => violation.field),
    ).toEqual(['sites[0].items[0].frequency_count', 'sites[0].items[1].unit_price']);
  });
});
describe('ContractService.get / list / delete', () => {
  it('returns a contract of the caller’s tenant', async () => {
    const { service, access, customer } = await world();
    const created = await service.create(access, validCommand(customer.id));
    await expect(service.get(access, created.id)).resolves.toMatchObject({
      id: created.id,
      customer_id: customer.id,
    });
  });
  it('answers 404 auth.out_of_scope for another tenant’s contract', async () => {
    const { service, access, customer, otherTenant } = await world();
    const created = await service.create(access, validCommand(customer.id));
    const otherTenantAccess = anAccessContext(
      anEmployee({ id: 90, tenantId: otherTenant.id, role: Role.Director }),
    );
    const error = await captureDomainErrorAsync(() => service.get(otherTenantAccess, created.id));
    expect(error.code).toBe('auth.out_of_scope');
  });
  it('deletes a contract of the caller’s tenant', async () => {
    const { service, access, contracts, tenant, customer } = await world();
    const created = await service.create(access, validCommand(customer.id));
    await service.delete(access, created.id);
    expect(await contracts.findById(tenant.id, created.id)).toBeNull();
  });
});
