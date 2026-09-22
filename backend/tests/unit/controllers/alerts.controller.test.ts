import { anAccessContext, anEmployee } from '../../support/builders';
import { AlertsController } from '../../../controllers/alerts/alerts.controller';
import { AlertService } from '../../../services/alerts/alert.service';

describe('AlertsController', () => {
  const access = anAccessContext(anEmployee());
  it('list wraps the service result in an items envelope', async () => {
    const list = jest.fn().mockResolvedValue([{ id: 1 }]);
    const controller = new AlertsController({ list } as unknown as AlertService);
    await expect(controller.list(access)).resolves.toEqual({ items: [{ id: 1 }] });
    expect(list).toHaveBeenCalledWith(access);
  });
  it('resend delegates to the service and answers a job id naming the alert', async () => {
    const resend = jest.fn().mockResolvedValue(undefined);
    const controller = new AlertsController({ resend } as unknown as AlertService);
    await expect(controller.resend(access, 7)).resolves.toEqual({ job_id: 'alert-resend-7' });
    expect(resend).toHaveBeenCalledWith(access, 7);
  });
});
