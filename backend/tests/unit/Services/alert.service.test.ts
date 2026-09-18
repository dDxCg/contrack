import { anAccessContext, anEmployee } from '../../support/builders';
import { captureDomainErrorAsync } from '../../support/domain-errors';
import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedTenant } from '../../support/seed';
import { Alert, AlertDeliveryStatus, AlertKind } from '../../../models/alerts/alert.entity';
import { Role } from '../../../models/employees/employee.entity';
import { ChannelClient } from '../../../data/channel-client/channel-client';
import { AlertRepository } from '../../../repositories/alerts/alert.repository';
import { AlertService } from '../../../services/alerts/alert.service';
class FakeChannelClient implements ChannelClient {
  constructor(private readonly status: AlertDeliveryStatus) {}
  async send(): Promise<AlertDeliveryStatus> {
    return this.status;
  }
}
async function world(status: AlertDeliveryStatus = AlertDeliveryStatus.Fallback) {
  const dataSource = await createTestDataSource();
  const alerts = new AlertRepository(dataSource);
  const channelClient = new FakeChannelClient(status);
  const tenant = await seedTenant(dataSource);
  const alert = new Alert();
  alert.tenantId = tenant.id;
  alert.kind = AlertKind.ShiftOverdue;
  alert.subjectId = 1;
  alert.deliveryStatus = AlertDeliveryStatus.NotSent;
  const saved = await alerts.create(alert);
  const director = anEmployee({ id: 12, tenantId: tenant.id, role: Role.Director });
  return {
    alerts,
    tenant,
    saved,
    access: anAccessContext(director, { tenantId: tenant.id }),
    service: new AlertService(alerts, channelClient),
  };
}
describe('AlertService.list', () => {
  it('lists alerts of the caller’s tenant', async () => {
    const { service, access, saved } = await world();
    const items = await service.list(access);
    expect(items).toEqual([expect.objectContaining({ id: saved.id, kind: 'shift_overdue' })]);
  });
});
describe('AlertService.resend — 05-api.yaml /alerts/{id}/send', () => {
  it('updates delivery_status on success', async () => {
    const { service, access, saved, alerts, tenant } = await world(AlertDeliveryStatus.Sent);
    await service.resend(access, saved.id);
    const reloaded = await alerts.findById(tenant.id, saved.id);
    expect(reloaded?.deliveryStatus).toBe('sent');
  });
  it('falls back in-app and answers 502 when both channels fail', async () => {
    const { service, access, saved, alerts, tenant } = await world(AlertDeliveryStatus.NotSent);
    const error = await captureDomainErrorAsync(() => service.resend(access, saved.id));
    expect(error.code).toBe('alert.channel_unavailable');
    expect(error.getStatus()).toBe(502);
    const reloaded = await alerts.findById(tenant.id, saved.id);
    expect(reloaded?.deliveryStatus).toBe('not_sent');
  });
  it('answers 404 auth.out_of_scope for another tenant’s alert', async () => {
    const { service, access } = await world();
    const error = await captureDomainErrorAsync(() => service.resend(access, 999999));
    expect(error.code).toBe('auth.out_of_scope');
  });
});
