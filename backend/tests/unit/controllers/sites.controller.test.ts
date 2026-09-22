import { anAccessContext, anEmployee } from '../../support/builders';
import { SitesController } from '../../../controllers/contracts/sites.controller';
import { ContractService } from '../../../services/contracts/contract.service';
import { FrequencyUnit } from '../../../models/contracts/contract-item.entity';

describe('SitesController', () => {
  const access = anAccessContext(anEmployee());
  it('update maps the body into a command and forwards the id', async () => {
    const updateSite = jest.fn().mockResolvedValue({ id: 5 });
    const controller = new SitesController({ updateSite } as unknown as ContractService);
    await controller.update(access, 5, { name: 'Toà A', work_requirements: null, notes: null });
    expect(updateSite).toHaveBeenCalledWith(access, 5, {
      name: 'Toà A',
      workRequirements: null,
      notes: null,
      latitude: null,
      longitude: null,
      radiusMeters: 200,
    });
  });
  it('delete forwards the id', async () => {
    const deleteSite = jest.fn().mockResolvedValue(undefined);
    const controller = new SitesController({ deleteSite } as unknown as ContractService);
    await controller.delete(access, 5);
    expect(deleteSite).toHaveBeenCalledWith(access, 5);
  });
  it('addItem maps the body and forwards the site id', async () => {
    const addItem = jest.fn().mockResolvedValue({ id: 1 });
    const controller = new SitesController({ addItem } as unknown as ContractService);
    await controller.addItem(access, 5, {
      name: 'Hút bụi',
      frequency_count: 2,
      frequency_unit: FrequencyUnit.Month,
      unit_price: 300000,
    });
    expect(addItem).toHaveBeenCalledWith(access, 5, {
      name: 'Hút bụi',
      frequencyCount: 2,
      frequencyUnit: FrequencyUnit.Month,
      frequencyRule: null,
      dayOfWeek: null,
      dayOfMonth: null,
      unitPrice: 300000,
    });
  });
});
