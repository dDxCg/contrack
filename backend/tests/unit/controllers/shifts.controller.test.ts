import { anAccessContext, anEmployee } from '../../support/builders';
import { ShiftsController } from '../../../controllers/shifts/shifts.controller';
import { DispatchService } from '../../../services/shifts/dispatch.service';
import { DisputeService } from '../../../services/shifts/dispute.service';
import { FieldLinkService } from '../../../services/field/field-link.service';
import { DisputeReportedVia } from '../../../dtos/shifts/shifts.dto';
describe('ShiftsController', () => {
  const access = anAccessContext(anEmployee());
  it('reassign maps the body into a command', async () => {
    const reassign = jest.fn().mockResolvedValue({ id: 1 });
    const controller = new ShiftsController(
      { reassign } as unknown as DispatchService,
      {} as DisputeService,
      {} as FieldLinkService,
    );
    await controller.reassign(access, 1, { assignee_id: 9, scheduled_date: '2024-06-01' });
    expect(reassign).toHaveBeenCalledWith(access, 1, {
      assigneeId: 9,
      scheduledDate: new Date('2024-06-01'),
    });
  });
  it('reassign leaves scheduledDate undefined when the body omits it', async () => {
    const reassign = jest.fn().mockResolvedValue({ id: 1 });
    const controller = new ShiftsController(
      { reassign } as unknown as DispatchService,
      {} as DisputeService,
      {} as FieldLinkService,
    );
    await controller.reassign(access, 1, {});
    expect(reassign).toHaveBeenCalledWith(access, 1, { assigneeId: null, scheduledDate: undefined });
  });
  it('dispute maps the body into a command', async () => {
    const mark = jest.fn().mockResolvedValue({ id: 1 });
    const controller = new ShiftsController(
      {} as DispatchService,
      { mark } as unknown as DisputeService,
      {} as FieldLinkService,
    );
    await controller.dispute(access, 1, {
      reason: 'no evidence',
      reported_via: DisputeReportedVia.Phone,
      reported_by: 'Ms Lan',
      reported_at: '2024-06-01T00:00:00.000Z',
      description: 'called in',
    });
    expect(mark).toHaveBeenCalledWith(access, 1, {
      reason: 'no evidence',
      reportedVia: DisputeReportedVia.Phone,
      reportedBy: 'Ms Lan',
      reportedAt: new Date('2024-06-01T00:00:00.000Z'),
      description: 'called in',
    });
  });
  it('resolveDispute forwards the id', async () => {
    const resolve = jest.fn().mockResolvedValue({ id: 1 });
    const controller = new ShiftsController(
      {} as DispatchService,
      { resolve } as unknown as DisputeService,
      {} as FieldLinkService,
    );
    await controller.resolveDispute(access, 1);
    expect(resolve).toHaveBeenCalledWith(access, 1);
  });
  it('link forwards the id to FieldLinkService.issue', async () => {
    const issue = jest.fn().mockResolvedValue({ token: 't', url: 'u', expires_at: 'e' });
    const controller = new ShiftsController(
      {} as DispatchService,
      {} as DisputeService,
      { issue } as unknown as FieldLinkService,
    );
    await controller.link(access, 1);
    expect(issue).toHaveBeenCalledWith(access, 1);
  });
});
