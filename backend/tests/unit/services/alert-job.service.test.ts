import { FakeClock } from '../../support/clock';
import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedContractItemChain, seedShift, seedTenant } from '../../support/seed';
import { AlertDeliveryStatus } from '../../../models/alerts/alert.entity';
import { TenantStatus } from '../../../models/tenants/tenant.entity';
import { AlertRepository } from '../../../repositories/alerts/alert.repository';
import { ContractRepository } from '../../../repositories/contracts/contract.repository';
import { ShiftRepository } from '../../../repositories/shifts/shift.repository';
import { TenantRepository } from '../../../repositories/tenants/tenant.repository';
import { ChannelClient } from '../../../data/channel-client/channel-client';
import { AlertJobService } from '../../../services/alerts/alert-job.service';

class FakeChannelClient implements ChannelClient {
  public readonly messages: string[] = [];

  constructor(private readonly status: AlertDeliveryStatus = AlertDeliveryStatus.Sent) {}

  async send(message: string): Promise<AlertDeliveryStatus> {
    this.messages.push(message);

    return this.status;
  }
}

class ThrowingChannelClient implements ChannelClient {
  private remaining: number;

  constructor(failures: number) {
    this.remaining = failures;
  }

  async send(): Promise<AlertDeliveryStatus> {
    if (this.remaining > 0) {
      this.remaining -= 1;
      throw new Error('zalo gateway down');
    }

    return AlertDeliveryStatus.Sent;
  }
}

function fakeLogger(): { error: jest.Mock } {
  return { error: jest.fn() };
}

async function world(now = new Date('2024-10-01T00:00:00.000Z'), status = AlertDeliveryStatus.Sent) {
  const dataSource = await createTestDataSource();
  const alerts = new AlertRepository(dataSource);
  const contracts = new ContractRepository(dataSource);
  const shifts = new ShiftRepository(dataSource);
  const tenants = new TenantRepository(dataSource);
  const clock = new FakeClock(now);
  const channelClient = new FakeChannelClient(status);
  const logger = fakeLogger();
  const tenant = await seedTenant(dataSource);
  const chain = await seedContractItemChain(dataSource, tenant.id);

  return {
    dataSource,
    alerts,
    contracts,
    shifts,
    tenants,
    clock,
    tenant,
    chain,
    channelClient,
    logger,
    service: new AlertJobService(contracts, shifts, alerts, tenants, channelClient, clock, logger as never),
  };
}

describe('AlertJobService.run — FR25, US-12', () => {
  it('fires one alert for a contract crossing the 30-day expiry threshold', async () => {
    const { service, tenant, chain, dataSource, alerts } = await world(new Date('2024-10-01T00:00:00.000Z'));
    await dataSource.query('UPDATE contracts SET expires_at = $1 WHERE id = $2', [
      '2024-10-25',
      chain.contractId,
    ]);
    const summary = await service.run(tenant.id);
    expect(summary.sent).toBe(1);
    const rows = await alerts.list(tenant.id);
    expect(rows).toMatchObject([
      { kind: 'contract_expiring', subjectId: chain.contractId, deliveryStatus: 'sent' },
    ]);
  });
  it('does not fire for a contract more than 30 days from expiry', async () => {
    const { service, tenant, chain, dataSource } = await world(new Date('2024-10-01T00:00:00.000Z'));
    await dataSource.query('UPDATE contracts SET expires_at = $1 WHERE id = $2', [
      '2024-12-01',
      chain.contractId,
    ]);
    const summary = await service.run(tenant.id);
    expect(summary.sent).toBe(0);
  });
  it('never fires twice for the same contract (US-12)', async () => {
    const { service, tenant, chain, dataSource } = await world(new Date('2024-10-01T00:00:00.000Z'));
    await dataSource.query('UPDATE contracts SET expires_at = $1 WHERE id = $2', [
      '2024-10-25',
      chain.contractId,
    ]);
    await service.run(tenant.id);
    const second = await service.run(tenant.id);
    expect(second.sent).toBe(0);
    expect(second.skipped).toBe(1);
  });
});
describe('AlertJobService.run — FR26, US-13', () => {
  it('fires an alert for a shift past its scheduled date and still not completed', async () => {
    const { service, tenant, chain, dataSource, alerts } = await world(new Date('2024-10-10T00:00:00.000Z'));
    const shiftId = await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-05',
    });
    const summary = await service.run(tenant.id);
    expect(summary.sent).toBe(1);
    const rows = await alerts.list(tenant.id);
    expect(rows).toMatchObject([{ kind: 'shift_overdue', subjectId: shiftId }]);
  });
  it('does not fire for a completed shift', async () => {
    const { service, tenant, chain, dataSource } = await world(new Date('2024-10-10T00:00:00.000Z'));
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-05',
      status: 'completed',
    });
    const summary = await service.run(tenant.id);
    expect(summary.sent).toBe(0);
  });
  it('does not fire for a shift whose scheduled date has not arrived yet', async () => {
    const { service, tenant, chain, dataSource } = await world(new Date('2024-10-01T00:00:00.000Z'));
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-05',
    });
    const summary = await service.run(tenant.id);
    expect(summary.sent).toBe(0);
  });
  it('never fires twice for the same shift, across separate job runs (US-13)', async () => {
    const { service, tenant, chain, dataSource } = await world(new Date('2024-10-10T00:00:00.000Z'));
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-05',
    });
    await service.run(tenant.id);
    const second = await service.run(tenant.id);
    expect(second.sent).toBe(0);
    expect(second.skipped).toBe(1);
  });
  it('resolves "today" through the tenant\'s own timezone, not UTC (D11)', async () => {
    const now = new Date('2026-03-10T20:00:00.000Z');
    const dataSource = await createTestDataSource();
    const alerts = new AlertRepository(dataSource);
    const contracts = new ContractRepository(dataSource);
    const shifts = new ShiftRepository(dataSource);
    const tenants = new TenantRepository(dataSource);
    const clock = new FakeClock(now);
    const channelClient = new FakeChannelClient();
    const vnTenant = await seedTenant(dataSource, { name: 'VN Co', timezone: 'Asia/Ho_Chi_Minh' });
    const vnChain = await seedContractItemChain(dataSource, vnTenant.id);
    const vnShiftId = await seedShift(dataSource, {
      tenantId: vnTenant.id,
      contractItemId: vnChain.itemId,
      assigneeId: null,
      scheduledDate: '2026-03-10',
    });
    const utcTenant = await seedTenant(dataSource, { name: 'UTC Co', timezone: 'UTC' });
    const utcChain = await seedContractItemChain(dataSource, utcTenant.id);
    await seedShift(dataSource, {
      tenantId: utcTenant.id,
      contractItemId: utcChain.itemId,
      assigneeId: null,
      scheduledDate: '2026-03-10',
    });
    const service = new AlertJobService(
      contracts,
      shifts,
      alerts,
      tenants,
      channelClient,
      clock,
      fakeLogger() as never,
    );

    const vnSummary = await service.run(vnTenant.id);
    const utcSummary = await service.run(utcTenant.id);

    expect(vnSummary.sent).toBe(1);
    expect((await alerts.list(vnTenant.id))[0]).toMatchObject({ subjectId: vnShiftId });
    expect(utcSummary.sent).toBe(0);
  });
});
describe('AlertJobService.run — delivery fallback (§8.3)', () => {
  it('still records the alert when both channels fail, flagged not_sent rather than dropped', async () => {
    const { service, tenant, chain, dataSource, alerts } = await world(
      new Date('2024-10-10T00:00:00.000Z'),
      AlertDeliveryStatus.NotSent,
    );
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-05',
    });
    const summary = await service.run(tenant.id);
    expect(summary.sent).toBe(1);
    const rows = await alerts.list(tenant.id);
    expect(rows[0].deliveryStatus).toBe('not_sent');
  });
});
describe('AlertJobService.runAll — the daily fan-out (FR25/FR26, decision 1)', () => {
  it('fans out over every active tenant and aggregates the summaries', async () => {
    const { service, tenants, dataSource, tenant, chain, alerts } = await world();
    const second = await seedTenant(dataSource, { name: 'Second Co' });
    const secondChain = await seedContractItemChain(dataSource, second.id);

    for (const contractId of [chain.contractId, secondChain.contractId]) {
      await dataSource.query('UPDATE contracts SET expires_at = $1 WHERE id = $2', [
        '2024-10-25',
        contractId,
      ]);
    }

    const summary = await service.runAll();
    expect(summary.sent).toBe(2);
    expect(await alerts.list(tenant.id)).toMatchObject([{ kind: 'contract_expiring' }]);
    expect(await alerts.list(second.id)).toMatchObject([{ kind: 'contract_expiring' }]);
    expect(await tenants.activeIds()).toEqual(expect.arrayContaining([tenant.id, second.id]));
  });
  it('never fans out to a suspended tenant, even when it has work waiting', async () => {
    const { service, dataSource, tenant, chain, alerts } = await world();
    const suspended = await seedTenant(dataSource, { name: 'Suspended Co', status: TenantStatus.Suspended });
    const suspendedChain = await seedContractItemChain(dataSource, suspended.id);

    for (const contractId of [chain.contractId, suspendedChain.contractId]) {
      await dataSource.query('UPDATE contracts SET expires_at = $1 WHERE id = $2', [
        '2024-10-25',
        contractId,
      ]);
    }

    const summary = await service.runAll();
    expect(summary.sent).toBe(1);
    expect(await alerts.list(tenant.id)).toHaveLength(1);
    expect(await alerts.list(suspended.id)).toHaveLength(0);
  });
  it('keeps fanning out when one tenant fails mid-run', async () => {
    const { dataSource, tenant, contracts, shifts, alerts, clock, tenants, logger } = await world();
    const service = new AlertJobService(
      contracts,
      shifts,
      alerts,
      tenants,
      new ThrowingChannelClient(1),
      clock,
      logger as never,
    );
    const second = await seedTenant(dataSource, { name: 'Second Co' });
    const chain = await seedContractItemChain(dataSource, tenant.id);
    const secondChain = await seedContractItemChain(dataSource, second.id);
    await dataSource.query('UPDATE contracts SET expires_at = $1 WHERE id = $2', [
      '2024-10-25',
      chain.contractId,
    ]);
    await dataSource.query('UPDATE contracts SET expires_at = $1 WHERE id = $2', [
      '2024-10-25',
      secondChain.contractId,
    ]);
    const summary = await service.runAll();
    expect(summary.sent).toBe(1);
    expect(await alerts.list(second.id)).toHaveLength(1);
    expect(await tenants.activeIds()).toHaveLength(2);
    expect(logger.error).toHaveBeenCalledWith(
      { tenantId: expect.any(Number), err: expect.any(Error) },
      'daily alert run failed for tenant — continuing with the next tenant',
    );
  });
});
