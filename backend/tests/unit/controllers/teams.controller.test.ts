import { anAccessContext, anEmployee } from '../../support/builders';
import { TeamsController } from '../../../controllers/teams/teams.controller';
import { TeamService } from '../../../services/teams/team.service';

describe('TeamsController', () => {
  const access = anAccessContext(anEmployee());
  it('list forwards only the access context — teams has no page window', async () => {
    const list = jest.fn().mockResolvedValue({ items: [], total: 0, limit: 25, offset: 0 });
    const controller = new TeamsController({ list } as unknown as TeamService);
    await controller.list(access);
    expect(list).toHaveBeenCalledWith(access);
  });
  it('create forwards name and code', async () => {
    const create = jest.fn().mockResolvedValue({ id: 1 });
    const controller = new TeamsController({ create } as unknown as TeamService);
    await controller.create(access, { name: 'Tổ 1', code: 'T1' });
    expect(create).toHaveBeenCalledWith(access, { name: 'Tổ 1', code: 'T1' });
  });
  it('get forwards the id', async () => {
    const get = jest.fn().mockResolvedValue({ id: 9 });
    const controller = new TeamsController({ get } as unknown as TeamService);
    await controller.get(access, 9);
    expect(get).toHaveBeenCalledWith(access, 9);
  });
  it('update forwards name and code', async () => {
    const update = jest.fn().mockResolvedValue({ id: 9 });
    const controller = new TeamsController({ update } as unknown as TeamService);
    await controller.update(access, 9, { name: 'Tổ 2', code: 'T2' });
    expect(update).toHaveBeenCalledWith(access, 9, { name: 'Tổ 2', code: 'T2' });
  });
  it('delete forwards the id', async () => {
    const del = jest.fn().mockResolvedValue(undefined);
    const controller = new TeamsController({ delete: del } as unknown as TeamService);
    await controller.delete(access, 9);
    expect(del).toHaveBeenCalledWith(access, 9);
  });
});
