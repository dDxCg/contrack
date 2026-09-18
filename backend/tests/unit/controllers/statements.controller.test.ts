import { anAccessContext, anEmployee } from '../../support/builders';
import { StatementsController } from '../../../controllers/statements/statements.controller';
import { StatementService } from '../../../services/statements/statement.service';
import { StatementStatus } from '../../../models/statements/statement.entity';
describe('StatementsController', () => {
  const access = anAccessContext(anEmployee());
  it('list splits the query into a filter and a page window', async () => {
    const list = jest.fn().mockResolvedValue({ items: [], total: 0, limit: 25, offset: 0 });
    const controller = new StatementsController({ list } as unknown as StatementService);
    await controller.list(access, {
      period: '2024-06-01',
      status: StatementStatus.Sent,
      limit: 25,
      offset: 0,
    });
    expect(list).toHaveBeenCalledWith(
      access,
      { period: '2024-06-01', status: StatementStatus.Sent },
      { limit: 25, offset: 0 },
    );
  });
  it('compute maps the body into a command', async () => {
    const compute = jest.fn().mockResolvedValue({ id: 1 });
    const controller = new StatementsController({ compute } as unknown as StatementService);
    await controller.compute(access, { contract_id: 5, period: '2024-06-01' });
    expect(compute).toHaveBeenCalledWith(access, { contractId: 5, period: new Date('2024-06-01') });
  });
  it('get forwards the id', async () => {
    const get = jest.fn().mockResolvedValue({ id: 9 });
    const controller = new StatementsController({ get } as unknown as StatementService);
    await controller.get(access, 9);
    expect(get).toHaveBeenCalledWith(access, 9);
  });
  it('export unwraps the jobId into a job_id envelope', async () => {
    const exportFn = jest.fn().mockResolvedValue({ jobId: 'job-9' });
    const controller = new StatementsController({ export: exportFn } as unknown as StatementService);
    await expect(controller.export(access, 9)).resolves.toEqual({ job_id: 'job-9' });
    expect(exportFn).toHaveBeenCalledWith(access, 9);
  });
  it('send forwards the id', async () => {
    const send = jest.fn().mockResolvedValue({ id: 9 });
    const controller = new StatementsController({ send } as unknown as StatementService);
    await controller.send(access, 9);
    expect(send).toHaveBeenCalledWith(access, 9);
  });
});
