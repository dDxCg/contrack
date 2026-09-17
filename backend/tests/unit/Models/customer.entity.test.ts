import { aCustomer } from '../../support/builders';
import { captureDomainError } from '../../support/domain-errors';
import { CustomerSegment } from '../../../Models/customer.entity';

describe('Customer', () => {
  describe('delete — a customer still billing is not deleted (customer.has_active_contracts)', () => {
    it('deletes a customer with no contract left', () => {
      const customer = aCustomer();

      expect(() => customer.delete([])).not.toThrow();
    });

    it('refuses with the blocking contract ids', () => {
      const customer = aCustomer();

      const error = captureDomainError(() => customer.delete([89, 91]));

      expect(error.code).toBe('customer.has_active_contracts');
      expect(error.getStatus()).toBe(409);
      expect(error.details).toEqual({ contract_ids: [89, 91] });
    });
  });

  describe('field changes', () => {
    it('changes name, company, contact, address and segment', () => {
      const customer = aCustomer();

      customer.rename('Chung cư Golden Park');
      customer.changeCompanyName('Golden Park JSC');
      customer.changeContact('Anh Hùng · 0988 000 111');
      customer.changeAddress('Hà Đông, Hà Nội');
      customer.changeSegment(CustomerSegment.Vip);

      expect(customer).toMatchObject({
        name: 'Chung cư Golden Park',
        companyName: 'Golden Park JSC',
        contact: 'Anh Hùng · 0988 000 111',
        address: 'Hà Đông, Hà Nội',
        segment: CustomerSegment.Vip,
      });
    });
  });
});
