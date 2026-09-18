import { PlatformAuthController } from '../../../controllers/platform/platform-auth.controller';
import { PlatformAuthService } from '../../../services/platform/platform-auth.service';
describe('PlatformAuthController', () => {
  it('login forwards username and password', async () => {
    const login = jest.fn().mockResolvedValue({ token: 't' });
    const controller = new PlatformAuthController({ login } as unknown as PlatformAuthService);
    await controller.login({ username: 'ops.admin', password: 'secret' });
    expect(login).toHaveBeenCalledWith({ username: 'ops.admin', password: 'secret' });
  });
});
