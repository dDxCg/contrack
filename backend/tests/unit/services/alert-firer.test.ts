import { AlertDeliveryStatus, AlertKind } from '../../../models/alerts/alert.entity';
import { AlertRepository } from '../../../repositories/alerts/alert.repository';
import { ChannelClient } from '../../../data/channel-client/channel-client';
import { fireAlert } from '../../../services/alerts/alert-firer';
import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedTenant } from '../../support/seed';

class RecordingChannelClient implements ChannelClient {
  public calls = 0;

  constructor(private readonly status: AlertDeliveryStatus = AlertDeliveryStatus.Sent) {}

  async send(): Promise<AlertDeliveryStatus> {
    this.calls += 1;

    return this.status;
  }
}

describe('fireAlert — outbox-style dedup (fixes exists→send→insert race)', () => {
  it('inserts the outbox row before sending, and records the real delivery result on it', async () => {
    const dataSource = await createTestDataSource();
    const tenant = await seedTenant(dataSource);
    const alertRepository = new AlertRepository(dataSource);
    const channelClient = new RecordingChannelClient();

    const fired = await fireAlert({ alertRepository, channelClient }, tenant.id, AlertKind.ShiftOverdue, 1);

    expect(fired).toBe(true);
    expect(channelClient.calls).toBe(1);
    const rows = await alertRepository.list(tenant.id);
    expect(rows).toMatchObject([
      { kind: AlertKind.ShiftOverdue, subjectId: 1, deliveryStatus: AlertDeliveryStatus.Sent },
    ]);
  });

  it('a losing racer never calls the channel client at all', async () => {
    const dataSource = await createTestDataSource();
    const tenant = await seedTenant(dataSource);
    const alertRepository = new AlertRepository(dataSource);
    const channelClient = new RecordingChannelClient();
    const deps = { alertRepository, channelClient };

    const [a, b] = await Promise.all([
      fireAlert(deps, tenant.id, AlertKind.ShiftOverdue, 42),
      fireAlert(deps, tenant.id, AlertKind.ShiftOverdue, 42),
    ]);

    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(channelClient.calls).toBe(1);
    expect(await alertRepository.list(tenant.id)).toHaveLength(1);
  });

  it('a sequential duplicate is skipped without touching the channel client', async () => {
    const dataSource = await createTestDataSource();
    const tenant = await seedTenant(dataSource);
    const alertRepository = new AlertRepository(dataSource);
    const channelClient = new RecordingChannelClient();
    const deps = { alertRepository, channelClient };

    expect(await fireAlert(deps, tenant.id, AlertKind.ContractExpiring, 7)).toBe(true);
    expect(await fireAlert(deps, tenant.id, AlertKind.ContractExpiring, 7)).toBe(false);
    expect(channelClient.calls).toBe(1);
  });

  it('records a not_sent delivery result on the outbox row without treating it as a duplicate later', async () => {
    const dataSource = await createTestDataSource();
    const tenant = await seedTenant(dataSource);
    const alertRepository = new AlertRepository(dataSource);
    const channelClient = new RecordingChannelClient(AlertDeliveryStatus.NotSent);
    const deps = { alertRepository, channelClient };

    const fired = await fireAlert(deps, tenant.id, AlertKind.ScheduleOverload, 9);

    expect(fired).toBe(true);
    const [row] = await alertRepository.list(tenant.id);
    expect(row.deliveryStatus).toBe(AlertDeliveryStatus.NotSent);

    const secondAttempt = await fireAlert(deps, tenant.id, AlertKind.ScheduleOverload, 9);
    expect(secondAttempt).toBe(false);
    expect(channelClient.calls).toBe(1);
  });
});
