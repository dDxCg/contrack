import { anAccessContext, anEmployee } from '../../support/builders';
import { CustomersController } from '../../../controllers/customers/customers.controller';
import { CustomerService } from '../../../services/customers/customer.service';
import { CustomerSegment } from '../../../models/customers/customer.entity';

describe('CustomersController', () => {
  const access = anAccessContext(anEmployee());
  it('list forwards the page window', async () => {
    const list = jest.fn().mockResolvedValue({ items: [], total: 0, limit: 25, offset: 0 });
    const controller = new CustomersController({ list } as unknown as CustomerService);
    await controller.list(access, { limit: 25, offset: 0 });
    expect(list).toHaveBeenCalledWith(access, { limit: 25, offset: 0 });
  });
  it('create maps the body into a command, defaulting optional fields to null', async () => {
    const create = jest.fn().mockResolvedValue({ id: 1 });
    const controller = new CustomersController({ create } as unknown as CustomerService);
    await controller.create(access, { name: 'Keangnam' } as never);
    expect(create).toHaveBeenCalledWith(access, {
      name: 'Keangnam',
      companyName: null,
      contact: null,
      address: null,
      segment: undefined,
    });
  });
  it('create passes an explicit segment through unchanged', async () => {
    const create = jest.fn().mockResolvedValue({ id: 1 });
    const controller = new CustomersController({ create } as unknown as CustomerService);
    await controller.create(access, {
      name: 'Keangnam',
      company_name: 'Keangnam JSC',
      contact: 'Ms Lan',
      address: 'Hanoi',
      segment: CustomerSegment.Vip,
    } as never);
    expect(create).toHaveBeenCalledWith(access, {
      name: 'Keangnam',
      companyName: 'Keangnam JSC',
      contact: 'Ms Lan',
      address: 'Hanoi',
      segment: CustomerSegment.Vip,
    });
  });
  it('get forwards the id', async () => {
    const get = jest.fn().mockResolvedValue({ id: 9 });
    const controller = new CustomersController({ get } as unknown as CustomerService);
    await controller.get(access, 9);
    expect(get).toHaveBeenCalledWith(access, 9);
  });
  it('update maps the body into a command', async () => {
    const update = jest.fn().mockResolvedValue({ id: 9 });
    const controller = new CustomersController({ update } as unknown as CustomerService);
    await controller.update(access, 9, { name: 'New name' } as never);
    expect(update).toHaveBeenCalledWith(access, 9, {
      name: 'New name',
      companyName: null,
      contact: null,
      address: null,
      segment: undefined,
    });
  });
  it('delete forwards the id', async () => {
    const del = jest.fn().mockResolvedValue(undefined);
    const controller = new CustomersController({ delete: del } as unknown as CustomerService);
    await controller.delete(access, 9);
    expect(del).toHaveBeenCalledWith(access, 9);
  });
});
