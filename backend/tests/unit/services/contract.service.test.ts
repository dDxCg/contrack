import { anAccessContext, anEmployee } from '../../support/builders';
import { captureDomainErrorAsync } from '../../support/domain-errors';
import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedTenant } from '../../support/seed';
import { NullChannelClient } from '../../../data/channel-client/null-channel-client';
import { Customer, CustomerSegment } from '../../../models/customers/customer.entity';
import { ContractStatus } from '../../../models/contracts/contract.entity';
import { FrequencyUnit } from '../../../models/contracts/contract-item.entity';
import { Role } from '../../../models/employees/employee.entity';
import { AlertRepository } from '../../../repositories/alerts/alert.repository';
import { ContractItemRepository } from '../../../repositories/contracts/contract-item.repository';
import { ContractRepository } from '../../../repositories/contracts/contract.repository';
import { ContractSiteRepository } from '../../../repositories/contracts/contract-site.repository';
import { CustomerRepository } from '../../../repositories/customers/customer.repository';
import { ShiftRepository } from '../../../repositories/shifts/shift.repository';
import { Team } from '../../../models/teams/team.entity';
import { TeamRepository } from '../../../repositories/teams/team.repository';
import {
  ContractCreateCommand,
  ContractItemCommand,
  ContractService,
} from '../../../services/contracts/contract.service';
import { ContractAssembler } from '../../../services/contracts/contract-assembler';
import { ScheduleGeneratorService } from '../../../services/contracts/schedule-generator.service';
import { daysSinceEpoch } from '../../../utils/period';

function draftTeam(overrides: Partial<Team>): Team {
  const team = new Team();
  team.setName('Team');
  team.setCode('T0');
  Object.assign(team, overrides);

  return team;
}

async function world(options: { teamCount?: number } = {}) {
  const dataSource = await createTestDataSource();
  const contracts = new ContractRepository(dataSource);
  const sites = new ContractSiteRepository(dataSource);
  const items = new ContractItemRepository(dataSource);
  const shifts = new ShiftRepository(dataSource);
  const teams = new TeamRepository(dataSource);
  const customers = new CustomerRepository(dataSource);
  const tenant = await seedTenant(dataSource);
  const otherTenant = await seedTenant(dataSource, { name: 'Other Tenant' });
  const teamCount = options.teamCount ?? 5;

  for (let i = 0; i < teamCount; i++) {
    await teams.create(draftTeam({ tenantId: tenant.id, name: `Team ${i}`, code: `T${i}` }));
  }

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
  const alerts = new AlertRepository(dataSource);

  return {
    dataSource,
    contracts,
    sites,
    items,
    shifts,
    teams,
    alerts,
    tenant,
    otherTenant,
    customer,
    access: anAccessContext(director, { tenantId: tenant.id }),
    service: new ContractService(
      contracts,
      sites,
      items,
      shifts,
      teams,
      alerts,
      new NullChannelClient(),
      new ContractAssembler(new ScheduleGeneratorService()),
      dataSource,
    ),
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
        latitude: null,
        longitude: null,
        radiusMeters: 200,
        items: [
          {
            name: 'Vệ sinh sảnh',
            frequencyCount: 1,
            frequencyUnit: FrequencyUnit.Week,
            frequencyRule: null,
            dayOfWeek: null,
            dayOfMonth: null,
            unitPrice: 500000,
          },
          {
            name: 'Vệ sinh kính',
            frequencyCount: 1,
            frequencyUnit: FrequencyUnit.Month,
            frequencyRule: null,
            dayOfWeek: null,
            dayOfMonth: null,
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
          latitude: null,
          longitude: null,
          radius_meters: 200,
          items: [
            { name: 'Vệ sinh sảnh', frequency_count: 1, frequency_unit: 'week', unit_price: 500000 },
            { name: 'Vệ sinh kính', frequency_count: 1, frequency_unit: 'month', unit_price: 1200000 },
          ],
        },
      ],
    });
  });
  it('stores the site geofence when coordinates are given', async () => {
    const { service, access, customer } = await world();
    const view = await service.create(
      access,
      validCommand(customer.id, {
        sites: [
          {
            name: 'Toà B',
            workRequirements: null,
            notes: null,
            latitude: 21.0176,
            longitude: 105.7833,
            radiusMeters: 150,
            items: [
              {
                name: 'Vệ sinh sảnh',
                frequencyCount: 1,
                frequencyUnit: FrequencyUnit.Week,
                frequencyRule: null,
                dayOfWeek: null,
                dayOfMonth: null,
                unitPrice: 500000,
              },
            ],
          },
        ],
      }),
    );
    expect(view.sites[0]).toMatchObject({ latitude: 21.0176, longitude: 105.7833, radius_meters: 150 });
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
      sites: [
        {
          name: 'Toà A',
          workRequirements: null,
          notes: null,
          latitude: null,
          longitude: null,
          radiusMeters: 200,
          items: [],
        },
      ],
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
describe('ContractService.create — schedule overload alert (team-capacity conflict, D20/R9)', () => {
  function anItem(overrides: Partial<ContractCreateCommand['sites'][0]['items'][0]> = {}) {
    return {
      name: 'Item',
      frequencyCount: 1,
      frequencyUnit: FrequencyUnit.Day,
      frequencyRule: null,
      dayOfWeek: null,
      dayOfMonth: null,
      unitPrice: 100000,
      ...overrides,
    };
  }

  it('fires a schedule_overload alert once a day holds more shifts than there are teams', async () => {
    const { service, access, customer, alerts, tenant } = await world({ teamCount: 3 });
    await service.create(
      access,
      validCommand(customer.id, {
        signedAt: new Date('2024-01-01'),
        expiresAt: new Date('2024-01-01'),
        sites: [
          {
            name: 'Site A',
            workRequirements: null,
            notes: null,
            latitude: null,
            longitude: null,
            radiusMeters: 200,
            items: [anItem(), anItem(), anItem(), anItem()],
          },
        ],
      }),
    );
    const fired = await alerts.list(tenant.id);
    expect(fired).toHaveLength(1);
    expect(fired[0]).toMatchObject({
      kind: 'schedule_overload',
      subjectId: daysSinceEpoch(new Date('2024-01-01')),
    });
  });
  it('does not fire when the day stays at or under the team count', async () => {
    const { service, access, customer, alerts, tenant } = await world({ teamCount: 3 });
    await service.create(
      access,
      validCommand(customer.id, {
        signedAt: new Date('2024-01-01'),
        expiresAt: new Date('2024-01-01'),
        sites: [
          {
            name: 'Site A',
            workRequirements: null,
            notes: null,
            latitude: null,
            longitude: null,
            radiusMeters: 200,
            items: [anItem(), anItem(), anItem()],
          },
        ],
      }),
    );
    expect(await alerts.list(tenant.id)).toEqual([]);
  });
  it('auto-moves an unconstrained item off an overloaded date instead of alerting (Option A)', async () => {
    const { service, access, customer, alerts, shifts, tenant } = await world({ teamCount: 3 });
    await service.create(
      access,
      validCommand(customer.id, {
        signedAt: new Date('2024-01-01'),
        expiresAt: new Date('2024-01-31'),
        sites: [
          {
            name: 'Site A',
            workRequirements: null,
            notes: null,
            latitude: null,
            longitude: null,
            radiusMeters: 200,
            items: [
              anItem({ frequencyUnit: FrequencyUnit.Month }),
              anItem({ frequencyUnit: FrequencyUnit.Month }),
              anItem({ frequencyUnit: FrequencyUnit.Month }),
              anItem({ frequencyUnit: FrequencyUnit.Month }),
            ],
          },
        ],
      }),
    );
    expect(await alerts.list(tenant.id)).toEqual([]);
    expect(await shifts.countForTenantOnDate(tenant.id, '2024-01-01')).toBe(3);
    expect(await shifts.countForTenantOnDate(tenant.id, '2024-01-02')).toBe(1);
  });
  it('keeps a date-constrained item put and still alerts, even with room in the window (Option A)', async () => {
    const { service, access, customer, alerts, shifts, tenant } = await world({ teamCount: 3 });
    await service.create(
      access,
      validCommand(customer.id, {
        signedAt: new Date('2024-01-01'),
        expiresAt: new Date('2024-01-31'),
        sites: [
          {
            name: 'Site A',
            workRequirements: null,
            notes: null,
            latitude: null,
            longitude: null,
            radiusMeters: 200,
            items: [
              anItem({ frequencyUnit: FrequencyUnit.Month }),
              anItem({ frequencyUnit: FrequencyUnit.Month }),
              anItem({ frequencyUnit: FrequencyUnit.Month }),
              anItem({ frequencyUnit: FrequencyUnit.Month, dayOfMonth: 1 }),
            ],
          },
        ],
      }),
    );
    const fired = await alerts.list(tenant.id);
    expect(fired).toHaveLength(1);
    expect(fired[0]).toMatchObject({
      kind: 'schedule_overload',
      subjectId: daysSinceEpoch(new Date('2024-01-01')),
    });
    expect(await shifts.countForTenantOnDate(tenant.id, '2024-01-01')).toBe(4);
    expect(await shifts.countForTenantOnDate(tenant.id, '2024-01-02')).toBe(0);
  });
  it('scopes the conflict to the tenant, not one site — two half-loaded sites on the same day still trip it', async () => {
    const { service, access, customer, alerts, tenant } = await world({ teamCount: 3 });
    await service.create(
      access,
      validCommand(customer.id, {
        signedAt: new Date('2024-01-01'),
        expiresAt: new Date('2024-01-01'),
        sites: [
          {
            name: 'Site A',
            workRequirements: null,
            notes: null,
            latitude: null,
            longitude: null,
            radiusMeters: 200,
            items: [anItem(), anItem()],
          },
          {
            name: 'Site B',
            workRequirements: null,
            notes: null,
            latitude: null,
            longitude: null,
            radiusMeters: 200,
            items: [anItem(), anItem()],
          },
        ],
      }),
    );
    expect(await alerts.list(tenant.id)).toHaveLength(1);
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
describe('ContractService.update — PATCH /contracts/:id', () => {
  it('updates expires_at while leaving signed_at untouched', async () => {
    const { service, access, customer } = await world();
    const created = await service.create(access, validCommand(customer.id));
    const updated = await service.update(access, created.id, { expiresAt: new Date('2024-06-01') });
    expect(updated).toMatchObject({
      signed_at: created.signed_at,
      expires_at: new Date('2024-06-01').toString(),
    });
  });
  it('updates status', async () => {
    const { service, access, customer } = await world();
    const created = await service.create(access, validCommand(customer.id));
    const updated = await service.update(access, created.id, { status: ContractStatus.Cancelled });
    expect(updated.status).toBe('cancelled');
  });
  it('updates both fields at once', async () => {
    const { service, access, customer } = await world();
    const created = await service.create(access, validCommand(customer.id));
    const updated = await service.update(access, created.id, {
      expiresAt: new Date('2024-07-01'),
      status: ContractStatus.Renewed,
    });
    expect(updated).toMatchObject({ expires_at: new Date('2024-07-01').toString(), status: 'renewed' });
  });
  it('answers 404 auth.out_of_scope for another tenant’s contract', async () => {
    const { service, access, customer, otherTenant } = await world();
    const created = await service.create(access, validCommand(customer.id));
    const otherTenantAccess = anAccessContext(
      anEmployee({ id: 91, tenantId: otherTenant.id, role: Role.Director }),
    );
    const error = await captureDomainErrorAsync(() =>
      service.update(otherTenantAccess, created.id, { status: ContractStatus.Cancelled }),
    );
    expect(error.code).toBe('auth.out_of_scope');
  });
});

function anItemCommand(overrides: Partial<ContractItemCommand> = {}): ContractItemCommand {
  return {
    name: 'Vệ sinh sảnh',
    frequencyCount: 1,
    frequencyUnit: FrequencyUnit.Week,
    frequencyRule: null,
    dayOfWeek: null,
    dayOfMonth: null,
    unitPrice: 500000,
    ...overrides,
  };
}

describe('ContractService.addSite — POST /contracts/:id/sites', () => {
  it('adds a site with no items yet', async () => {
    const { service, access, customer } = await world();
    const created = await service.create(access, validCommand(customer.id));
    const site = await service.addSite(access, created.id, {
      name: 'Toà B',
      workRequirements: null,
      notes: null,
      latitude: null,
      longitude: null,
      radiusMeters: 200,
      items: [],
    });
    expect(site).toMatchObject({ name: 'Toà B', radius_meters: 200, items: [] });
  });
  it('adds a site with items', async () => {
    const { service, access, customer } = await world();
    const created = await service.create(access, validCommand(customer.id));
    const site = await service.addSite(access, created.id, {
      name: 'Toà B',
      workRequirements: null,
      notes: null,
      latitude: null,
      longitude: null,
      radiusMeters: 200,
      items: [anItemCommand()],
    });
    expect(site.items).toHaveLength(1);
    expect(site.items[0]).toMatchObject({ name: 'Vệ sinh sảnh', unit_price: 500000 });
  });
  it('rejects an invalid item with the field named', async () => {
    const { service, access, customer } = await world();
    const created = await service.create(access, validCommand(customer.id));
    const error = await captureDomainErrorAsync(() =>
      service.addSite(access, created.id, {
        name: 'Toà B',
        workRequirements: null,
        notes: null,
        latitude: null,
        longitude: null,
        radiusMeters: 200,
        items: [anItemCommand({ unitPrice: -1 })],
      }),
    );
    expect(error.code).toBe('validation.failed');
    expect(error.details).toEqual({
      fields: [{ field: 'items[0].unit_price', message: expect.any(String) }],
    });
  });
  it('answers 404 auth.out_of_scope for another tenant’s contract', async () => {
    const { service, access, customer, otherTenant } = await world();
    const created = await service.create(access, validCommand(customer.id));
    const otherTenantAccess = anAccessContext(
      anEmployee({ id: 92, tenantId: otherTenant.id, role: Role.Director }),
    );
    const error = await captureDomainErrorAsync(() =>
      service.addSite(otherTenantAccess, created.id, {
        name: 'Toà B',
        workRequirements: null,
        notes: null,
        latitude: null,
        longitude: null,
        radiusMeters: 200,
        items: [],
      }),
    );
    expect(error.code).toBe('auth.out_of_scope');
  });
});
describe('ContractService.updateSite / deleteSite', () => {
  it('updates a site’s fields and still reports its existing items', async () => {
    const { service, access, customer } = await world();
    const created = await service.create(access, validCommand(customer.id));
    const siteId = created.sites[0].id;
    const updated = await service.updateSite(access, siteId, {
      name: 'Toà A — đổi tên',
      workRequirements: 'Yêu cầu mới',
      notes: null,
      latitude: 21.0,
      longitude: 105.8,
      radiusMeters: 300,
    });
    expect(updated).toMatchObject({
      name: 'Toà A — đổi tên',
      work_requirements: 'Yêu cầu mới',
      radius_meters: 300,
    });
    expect(updated.items).toHaveLength(2);
  });
  it('answers 404 auth.out_of_scope for a site of another tenant', async () => {
    const { service, access, customer, otherTenant } = await world();
    const created = await service.create(access, validCommand(customer.id));
    const otherTenantAccess = anAccessContext(
      anEmployee({ id: 93, tenantId: otherTenant.id, role: Role.Director }),
    );
    const error = await captureDomainErrorAsync(() =>
      service.updateSite(otherTenantAccess, created.sites[0].id, {
        name: 'x',
        workRequirements: null,
        notes: null,
        latitude: null,
        longitude: null,
        radiusMeters: 200,
      }),
    );
    expect(error.code).toBe('auth.out_of_scope');
  });
  it('deletes a site, cascading to its items and shifts', async () => {
    const { service, access, customer, dataSource } = await world();
    const created = await service.create(access, validCommand(customer.id));
    const siteId = created.sites[0].id;
    const itemId = created.sites[0].items[0].id;
    await service.deleteSite(access, siteId);
    const error = await captureDomainErrorAsync(() =>
      service.updateSite(access, siteId, {
        name: 'x',
        workRequirements: null,
        notes: null,
        latitude: null,
        longitude: null,
        radiusMeters: 200,
      }),
    );
    expect(error.code).toBe('auth.out_of_scope');
    const remainingShifts = (await dataSource.query('SELECT id FROM shifts WHERE contract_item_id = $1', [
      itemId,
    ])) as unknown[];
    expect(remainingShifts).toHaveLength(0);
  });
});
describe('ContractService.addItem / updateItem / deleteItem', () => {
  it('adds an item to an existing site', async () => {
    const { service, access, customer } = await world();
    const created = await service.create(access, validCommand(customer.id));
    const siteId = created.sites[0].id;
    const item = await service.addItem(access, siteId, anItemCommand({ name: 'Hút bụi' }));
    expect(item).toMatchObject({ name: 'Hút bụi', unit_price: 500000 });
  });
  it('rejects an invalid new item with the field named', async () => {
    const { service, access, customer } = await world();
    const created = await service.create(access, validCommand(customer.id));
    const siteId = created.sites[0].id;
    const error = await captureDomainErrorAsync(() =>
      service.addItem(access, siteId, anItemCommand({ unitPrice: -1 })),
    );
    expect(error.code).toBe('validation.failed');
    expect(error.details).toEqual({ fields: [{ field: 'unit_price', message: expect.any(String) }] });
  });
  it('answers 404 auth.out_of_scope for a site of another tenant', async () => {
    const { service, access, customer, otherTenant } = await world();
    const created = await service.create(access, validCommand(customer.id));
    const otherTenantAccess = anAccessContext(
      anEmployee({ id: 94, tenantId: otherTenant.id, role: Role.Director }),
    );
    const error = await captureDomainErrorAsync(() =>
      service.addItem(otherTenantAccess, created.sites[0].id, anItemCommand()),
    );
    expect(error.code).toBe('auth.out_of_scope');
  });
  it('updates an item’s frequency and price', async () => {
    const { service, access, customer } = await world();
    const created = await service.create(access, validCommand(customer.id));
    const itemId = created.sites[0].items[0].id;
    const updated = await service.updateItem(
      access,
      itemId,
      anItemCommand({ name: 'Vệ sinh sảnh — mới', unitPrice: 600000 }),
    );
    expect(updated).toMatchObject({ name: 'Vệ sinh sảnh — mới', unit_price: 600000 });
  });
  it('rejects an invalid item update with the field named', async () => {
    const { service, access, customer } = await world();
    const created = await service.create(access, validCommand(customer.id));
    const itemId = created.sites[0].items[0].id;
    const error = await captureDomainErrorAsync(() =>
      service.updateItem(access, itemId, anItemCommand({ frequencyCount: 0 })),
    );
    expect(error.code).toBe('validation.failed');
    expect(error.details).toEqual({ fields: [{ field: 'frequency_count', message: expect.any(String) }] });
  });
  it('answers 404 auth.out_of_scope for an item of another tenant', async () => {
    const { service, access, customer, otherTenant } = await world();
    const created = await service.create(access, validCommand(customer.id));
    const otherTenantAccess = anAccessContext(
      anEmployee({ id: 95, tenantId: otherTenant.id, role: Role.Director }),
    );
    const error = await captureDomainErrorAsync(() =>
      service.updateItem(otherTenantAccess, created.sites[0].items[0].id, anItemCommand()),
    );
    expect(error.code).toBe('auth.out_of_scope');
  });
  it('deletes an item, cascading to its shifts', async () => {
    const { service, access, customer, dataSource } = await world();
    const created = await service.create(access, validCommand(customer.id));
    const itemId = created.sites[0].items[0].id;
    await service.deleteItem(access, itemId);
    const error = await captureDomainErrorAsync(() => service.updateItem(access, itemId, anItemCommand()));
    expect(error.code).toBe('auth.out_of_scope');
    const remainingShifts = (await dataSource.query('SELECT id FROM shifts WHERE contract_item_id = $1', [
      itemId,
    ])) as unknown[];
    expect(remainingShifts).toHaveLength(0);
  });
});
