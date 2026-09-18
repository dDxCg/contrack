import { anAccessContext, anEmployee } from '../../support/builders';
import { AuthController } from '../../../controllers/auth/auth.controller';
import { AuthService } from '../../../services/auth/auth.service';
describe('AuthController', () => {
  it('login forwards email and password', async () => {
    const login = jest.fn().mockResolvedValue({ token: 't' });
    const controller = new AuthController({ login } as unknown as AuthService);
    await controller.login({ email: 'a@example.com', password: 'secret' });
    expect(login).toHaveBeenCalledWith({ email: 'a@example.com', password: 'secret' });
  });
  it('refresh forwards the refresh token', async () => {
    const refresh = jest.fn().mockResolvedValue({ token: 't' });
    const controller = new AuthController({ refresh } as unknown as AuthService);
    await controller.refresh({ refresh_token: 'rt' });
    expect(refresh).toHaveBeenCalledWith('rt');
  });
  it('logout forwards the access context and refresh token', async () => {
    const access = anAccessContext(anEmployee());
    const logout = jest.fn().mockResolvedValue(undefined);
    const controller = new AuthController({ logout } as unknown as AuthService);
    await controller.logout(access, { refresh_token: 'rt' });
    expect(logout).toHaveBeenCalledWith(access, 'rt');
  });
  it('me returns the service’s own view of the access context', () => {
    const access = anAccessContext(anEmployee());
    const me = jest.fn().mockReturnValue({ id: 1 });
    const controller = new AuthController({ me } as unknown as AuthService);
    expect(controller.me(access)).toEqual({ id: 1 });
    expect(me).toHaveBeenCalledWith(access);
  });
});
