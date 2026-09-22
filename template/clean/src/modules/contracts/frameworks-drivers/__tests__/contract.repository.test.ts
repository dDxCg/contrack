import { DataSource } from 'typeorm';
import { Contract, ContractStatus } from '../../entities/contract';
import { ContractItem, FrequencyUnit } from '../../entities/contract-item';
import { ContractSite } from '../../entities/contract-site';
import { Money } from '../../entities/money';
import { createInMemoryDataSource } from '../db/in-memory-data-source';
import { TypeOrmContractItemRepository } from '../orm/contract-item.repository';
import { TypeOrmContractSiteRepository } from '../orm/contract-site.repository';
import { TypeOrmContractRepository } from '../orm/contract.repository';

// This is the one place in the module allowed to touch a (pg-mem, in-memory)
// database — it exists to prove the TypeORM gateway implementations really
// satisfy the use-case-owned repository interfaces, with real SQL round
// trips and real domain<->persistence mapping. Entity and use-case tests
// never need this.
describe('TypeOrm*Repository (pg-mem integration)', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await createInMemoryDataSource();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('round-trips a contract, its site and its item through Postgres-flavoured SQL', async () => {
    const contracts = new TypeOrmContractRepository(dataSource);
    const sites = new TypeOrmContractSiteRepository(dataSource);
    const items = new TypeOrmContractItemRepository(dataSource);

    const contract = new Contract({
      tenantId: 1,
      customerId: 7,
      signedAt: new Date('2026-01-01'),
      expiresAt: new Date('2026-12-31'),
      status: ContractStatus.Active,
    });
    const savedContract = await contracts.create(1, contract);
    expect(savedContract.id).toBeDefined();

    const site = new ContractSite({
      tenantId: 1,
      name: 'HQ',
      workRequirements: 'Bring own mop',
      notes: null,
      latitude: 10.762622,
      longitude: 106.660172,
      radiusMeters: 150,
    });
    const savedSite = await sites.create(1, savedContract.id as number, site);
    expect(savedSite.id).toBeDefined();

    const item = ContractItem.create({
      tenantId: 1,
      name: 'Mopping',
      frequencyCount: 1,
      frequencyUnit: FrequencyUnit.Week,
      frequencyRule: null,
      dayOfWeek: 1,
      dayOfMonth: null,
      unitPrice: Money.fromNumber(123.456),
    });
    const savedItem = await items.create(1, savedSite.id as number, item);

    const reloadedContract = await contracts.findById(1, savedContract.id as number);
    const reloadedSites = await sites.listByContract(1, savedContract.id as number);
    const reloadedItems = await items.listBySite(1, savedSite.id as number);

    expect(reloadedContract?.customerId).toBe(7);
    expect(reloadedSites).toHaveLength(1);
    expect(reloadedSites[0].name).toBe('HQ');
    expect(reloadedSites[0].latitude).toBeCloseTo(10.762622);
    expect(reloadedItems).toHaveLength(1);
    expect(reloadedItems[0].unitPrice.toFixed()).toBe('123.46'); // 2-decimal rounding survives the round trip
    expect(savedItem.dayOfWeek).toBe(1);

    // tenant scoping: another tenant cannot see it
    expect(await contracts.findById(2, savedContract.id as number)).toBeNull();
  });
});
