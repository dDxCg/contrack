import { PlatformDashboardController } from '../../../controllers/platform/platform-dashboard.controller';
import { PlatformDashboardService } from '../../../services/platform/platform-dashboard.service';

describe('PlatformDashboardController', () => {
  it('get delegates to the service with no arguments — platform-wide, no tenant scope', async () => {
    const get = jest.fn().mockResolvedValue({ tenants: 3 });
    const controller = new PlatformDashboardController({ get } as unknown as PlatformDashboardService);
    await expect(controller.get()).resolves.toEqual({ tenants: 3 });
    expect(get).toHaveBeenCalledWith();
  });
});
