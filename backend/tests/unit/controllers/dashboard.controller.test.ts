import { anAccessContext, anEmployee } from '../../support/builders';
import { DashboardController } from '../../../controllers/dashboard/dashboard.controller';
import { DashboardService } from '../../../services/dashboard/dashboard.service';

describe('DashboardController', () => {
  it('forwards the access context and query straight through', () => {
    const access = anAccessContext(anEmployee());
    const get = jest.fn().mockResolvedValue({ revenue: 0 });
    const controller = new DashboardController({ get } as unknown as DashboardService);
    const query = { period: '2024-06-01' } as never;
    controller.get(access, query);
    expect(get).toHaveBeenCalledWith(access, query);
  });
});
