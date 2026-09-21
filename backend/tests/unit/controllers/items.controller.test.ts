import { anAccessContext, anEmployee } from '../../support/builders';
import { ItemsController } from '../../../controllers/contracts/items.controller';
import { ContractService } from '../../../services/contracts/contract.service';
import { FrequencyUnit } from '../../../models/contracts/contract-item.entity';
describe('ItemsController', () => {
  const access = anAccessContext(anEmployee());
  it('update maps the body into a command and forwards the id', async () => {
    const updateItem = jest.fn().mockResolvedValue({ id: 1 });
    const controller = new ItemsController({ updateItem } as unknown as ContractService);
    await controller.update(access, 1, {
      name: 'Vệ sinh sảnh',
      frequency_count: 1,
      frequency_unit: FrequencyUnit.Week,
      unit_price: 500000,
    });
    expect(updateItem).toHaveBeenCalledWith(access, 1, {
      name: 'Vệ sinh sảnh',
      frequencyCount: 1,
      frequencyUnit: FrequencyUnit.Week,
      frequencyRule: null,
      dayOfWeek: null,
      dayOfMonth: null,
      unitPrice: 500000,
    });
  });
  it('delete forwards the id', async () => {
    const deleteItem = jest.fn().mockResolvedValue(undefined);
    const controller = new ItemsController({ deleteItem } as unknown as ContractService);
    await controller.delete(access, 1);
    expect(deleteItem).toHaveBeenCalledWith(access, 1);
  });
});
