import { anAccessContext, anEmployee } from '../../support/builders';
import { ContractsController } from '../../../controllers/contracts/contracts.controller';
import { ContractService } from '../../../services/contracts/contract.service';
import { FrequencyUnit } from '../../../models/contracts/contract-item.entity';
describe('ContractsController', () => {
  const access = anAccessContext(anEmployee());
  it('list forwards the page window', async () => {
    const list = jest.fn().mockResolvedValue({ items: [], total: 0, limit: 25, offset: 0 });
    const controller = new ContractsController({ list } as unknown as ContractService);
    await controller.list(access, { limit: 25, offset: 0 });
    expect(list).toHaveBeenCalledWith(access, { limit: 25, offset: 0 });
  });
  it('create maps the nested body into a command graph', async () => {
    const create = jest.fn().mockResolvedValue({ id: 1 });
    const controller = new ContractsController({ create } as unknown as ContractService);
    await controller.create(access, {
      customer_id: 5,
      signed_at: '2024-01-01',
      expires_at: '2024-12-31',
      sites: [
        {
          name: 'Site A',
          work_requirements: null,
          notes: null,
          items: [
            {
              name: 'Cleaning',
              frequency_count: 1,
              frequency_unit: FrequencyUnit.Week,
              frequency_rule: null,
              unit_price: 100000,
            },
          ],
        },
      ],
    });
    expect(create).toHaveBeenCalledWith(access, {
      customerId: 5,
      signedAt: new Date('2024-01-01'),
      expiresAt: new Date('2024-12-31'),
      sites: [
        {
          name: 'Site A',
          workRequirements: null,
          notes: null,
          latitude: null,
          longitude: null,
          radiusMeters: 200,
          items: [
            {
              name: 'Cleaning',
              frequencyCount: 1,
              frequencyUnit: FrequencyUnit.Week,
              frequencyRule: null,
              unitPrice: 100000,
            },
          ],
        },
      ],
    });
  });
  it('get forwards the id', async () => {
    const get = jest.fn().mockResolvedValue({ id: 9 });
    const controller = new ContractsController({ get } as unknown as ContractService);
    await controller.get(access, 9);
    expect(get).toHaveBeenCalledWith(access, 9);
  });
  it('delete forwards the id', async () => {
    const del = jest.fn().mockResolvedValue(undefined);
    const controller = new ContractsController({ delete: del } as unknown as ContractService);
    await controller.delete(access, 9);
    expect(del).toHaveBeenCalledWith(access, 9);
  });
});
