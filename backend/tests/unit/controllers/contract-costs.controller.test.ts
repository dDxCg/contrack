import { anAccessContext, anEmployee } from '../../support/builders';
import { ContractCostsController } from '../../../controllers/contract-costs/contract-costs.controller';
import { ContractCostService } from '../../../services/contract-costs/contract-cost.service';
import { ContractProfitabilityService } from '../../../services/contract-costs/contract-profitability.service';
describe('ContractCostsController', () => {
  const access = anAccessContext(anEmployee());
  it('listCosts parses the optional period query and wraps items', async () => {
    const list = jest.fn().mockResolvedValue([{ id: 1 }]);
    const controller = new ContractCostsController(
      { list } as unknown as ContractCostService,
      {} as ContractProfitabilityService,
    );
    await expect(controller.listCosts(access, 5, { period: '2024-06-01' })).resolves.toEqual({
      items: [{ id: 1 }],
    });
    expect(list).toHaveBeenCalledWith(access, 5, new Date('2024-06-01'));
  });
  it('listCosts leaves the period undefined when the query omits it', async () => {
    const list = jest.fn().mockResolvedValue([]);
    const controller = new ContractCostsController(
      { list } as unknown as ContractCostService,
      {} as ContractProfitabilityService,
    );
    await controller.listCosts(access, 5, {});
    expect(list).toHaveBeenCalledWith(access, 5, undefined);
  });
  it('upsertCost maps the body into a command', async () => {
    const upsert = jest.fn().mockResolvedValue({ id: 1 });
    const controller = new ContractCostsController(
      { upsert } as unknown as ContractCostService,
      {} as ContractProfitabilityService,
    );
    await controller.upsertCost(access, 5, {
      category: 'fuel',
      period: '2024-06-01',
      amount: 100000,
    } as never);
    expect(upsert).toHaveBeenCalledWith(access, 5, {
      category: 'fuel',
      period: new Date('2024-06-01'),
      amount: 100000,
    });
  });
  it('profitability forwards the months window and wraps items', async () => {
    const get = jest.fn().mockResolvedValue([{ month: '2024-06' }]);
    const controller = new ContractCostsController(
      {} as ContractCostService,
      { get } as unknown as ContractProfitabilityService,
    );
    await expect(controller.profitability(access, 5, { months: 6 })).resolves.toEqual({
      items: [{ month: '2024-06' }],
    });
    expect(get).toHaveBeenCalledWith(access, 5, 6);
  });
});
