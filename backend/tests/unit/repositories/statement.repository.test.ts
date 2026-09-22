import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedContractItemChain, seedTenant } from '../../support/seed';
import { Statement, StatementStatus } from '../../../models/statements/statement.entity';
import { StatementRepository } from '../../../repositories/statements/statement.repository';
import { Money } from '../../../utils/money';

async function world() {
  const dataSource = await createTestDataSource();
  const tenant = await seedTenant(dataSource);
  const { contractId } = await seedContractItemChain(dataSource, tenant.id);
  const statements = new StatementRepository(dataSource);

  return { dataSource, tenant, contractId, statements };
}

async function seedStatement(
  repository: StatementRepository,
  tenantId: number,
  contractId: number,
  overrides: { period?: string; status?: StatementStatus; totalAmount?: number } = {},
): Promise<Statement> {
  const statement = new Statement();
  statement.tenantId = tenantId;
  statement.contractId = contractId;
  statement.period = new Date(`${overrides.period ?? '2024-01-01'}T00:00:00.000Z`);
  statement.totalAmount = Money.fromNumber(overrides.totalAmount ?? 150);
  statement.status = overrides.status ?? StatementStatus.Draft;
  statement.pdfUrl = null;

  return repository.create(statement);
}

describe('StatementRepository', () => {
  it('create persists a draft and reads it back hydrated with the status code', async () => {
    const { statements, tenant, contractId } = await world();
    const saved = await seedStatement(statements, tenant.id, contractId);
    expect(saved.id).toBeGreaterThan(0);
    expect(saved).toMatchObject({
      tenantId: tenant.id,
      contractId,
      status: StatementStatus.Draft,
      totalAmount: Money.fromNumber(150),
      pdfUrl: null,
    });
  });
  it('update persists a status transition through the same lookup', async () => {
    const { statements, tenant, contractId } = await world();
    const saved = await seedStatement(statements, tenant.id, contractId);
    saved.export();
    const reloaded = await statements.update(saved);
    expect(reloaded.status).toBe(StatementStatus.Issued);
  });
  it('findById answers null for a missing row instead of throwing', async () => {
    const { statements, tenant } = await world();
    expect(await statements.findById(tenant.id, 999999)).toBeNull();
  });
  it('findByContractPeriod matches the exact contract × period pair', async () => {
    const { statements, tenant, contractId } = await world();
    await seedStatement(statements, tenant.id, contractId, { period: '2024-01-01' });
    expect(await statements.findByContractPeriod(tenant.id, contractId, '2024-01-01')).not.toBeNull();
    expect(await statements.findByContractPeriod(tenant.id, contractId, '2024-02-01')).toBeNull();
  });
  describe('findByContractPeriodBatch', () => {
    it('returns one row per contract that has a statement for the period, keyed by contract id', async () => {
      const { dataSource, statements, tenant, contractId } = await world();
      const { contractId: secondContractId } = await seedContractItemChain(dataSource, tenant.id);
      await seedStatement(statements, tenant.id, contractId, { period: '2024-01-01' });
      await seedStatement(statements, tenant.id, secondContractId, { period: '2024-01-01' });

      const byContract = await statements.findByContractPeriodBatch(
        tenant.id,
        [contractId, secondContractId, 999999],
        '2024-01-01',
      );

      expect(byContract.size).toBe(2);
      expect(byContract.get(contractId)?.contractId).toBe(contractId);
      expect(byContract.get(secondContractId)?.contractId).toBe(secondContractId);
      expect(byContract.has(999999)).toBe(false);
    });
    it('ignores a statement for the same contract in a different period', async () => {
      const { statements, tenant, contractId } = await world();
      await seedStatement(statements, tenant.id, contractId, { period: '2024-02-01' });

      const byContract = await statements.findByContractPeriodBatch(tenant.id, [contractId], '2024-01-01');

      expect(byContract.size).toBe(0);
    });
    it('answers an empty map for an empty contract id list, without querying', async () => {
      const { statements, tenant } = await world();

      expect(await statements.findByContractPeriodBatch(tenant.id, [], '2024-01-01')).toEqual(new Map());
    });
  });
  describe('list', () => {
    it('pages a tenant ledger with every row hydrated, ordered by id', async () => {
      const { statements, tenant, contractId } = await world();
      await seedStatement(statements, tenant.id, contractId, { period: '2024-01-01' });
      await seedStatement(statements, tenant.id, contractId, { period: '2024-02-01' });
      const page = await statements.list(tenant.id, {}, { limit: 10, offset: 0 });
      expect(page.total).toBe(2);
      expect(page.items.map((row) => row.period.toISOString().slice(0, 10))).toEqual([
        '2024-01-01',
        '2024-02-01',
      ]);
      expect(page.items.every((row) => row.status === StatementStatus.Draft)).toBe(true);
    });
    it('narrow items by period and status while total keeps counting the whole ledger', async () => {
      const { statements, tenant, contractId } = await world();
      const january = await seedStatement(statements, tenant.id, contractId, { period: '2024-01-01' });
      await seedStatement(statements, tenant.id, contractId, { period: '2024-02-01' });
      const byPeriod = await statements.list(tenant.id, { period: '2024-01-01' }, { limit: 10, offset: 0 });
      expect(byPeriod.items.map((row) => row.id)).toEqual([january.id]);
      january.export();
      await statements.update(january);
      const byStatus = await statements.list(
        tenant.id,
        { status: StatementStatus.Issued },
        { limit: 10, offset: 0 },
      );
      expect(byStatus.items.map((row) => row.id)).toEqual([january.id]);
    });
    it('never shows another tenant a row it seeded itself', async () => {
      const { dataSource, statements, tenant, contractId } = await world();
      await seedStatement(statements, tenant.id, contractId);
      const otherTenant = await seedTenant(dataSource, { name: 'Other Tenant' });
      const { contractId: otherContract } = await seedContractItemChain(dataSource, otherTenant.id);
      await seedStatement(statements, otherTenant.id, otherContract);
      const page = await statements.list(tenant.id, {}, { limit: 10, offset: 0 });
      expect(page.total).toBe(1);
      expect(page.items.every((row) => row.tenantId === tenant.id)).toBe(true);
    });
    it('honours limit/offset for the page window', async () => {
      const { statements, tenant, contractId } = await world();

      for (const period of ['2024-01-01', '2024-02-01', '2024-03-01']) {
        await seedStatement(statements, tenant.id, contractId, { period });
      }

      const page = await statements.list(tenant.id, {}, { limit: 2, offset: 1 });
      expect(page.total).toBe(3);
      expect(page.items).toHaveLength(2);
    });
  });
});
