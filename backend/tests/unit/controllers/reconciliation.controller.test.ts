import { anAccessContext, anEmployee } from '../../support/builders';
import { ReconciliationController } from '../../../controllers/statements/reconciliation.controller';
import { ReconciliationService } from '../../../services/statements/reconciliation.service';

describe('ReconciliationController', () => {
  it('get parses the period and wraps items', async () => {
    const access = anAccessContext(anEmployee());
    const get = jest.fn().mockResolvedValue([{ contract_id: 1 }]);
    const controller = new ReconciliationController({ get } as unknown as ReconciliationService);
    await expect(controller.get(access, { period: '2024-06-01' })).resolves.toEqual({
      items: [{ contract_id: 1 }],
    });
    expect(get).toHaveBeenCalledWith(access, new Date('2024-06-01'));
  });
});
