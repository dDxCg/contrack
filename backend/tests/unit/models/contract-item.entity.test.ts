import { FrequencyUnit } from '../../../models/contracts/contract-item.entity';
import { aContractItem } from '../../support/builders';
import { Money } from '../../../utils/money';
describe('ContractItem', () => {
  describe('field changes', () => {
    it('changes name, frequency and unit price', () => {
      const item = aContractItem();
      item.setName('Vệ sinh kính');
      item.setFrequency(2, FrequencyUnit.Week, 'thứ 7 hàng tuần');
      item.setUnitPrice(1200000);
      expect(item).toMatchObject({
        name: 'Vệ sinh kính',
        frequencyCount: 2,
        frequencyUnit: FrequencyUnit.Week,
        frequencyRule: 'thứ 7 hàng tuần',
        unitPrice: Money.fromNumber(1200000),
      });
    });
  });
  describe('assertValid — US-10: rejected with the specific field named', () => {
    it('passes for a positive integer frequency and a non-negative price', () => {
      const item = aContractItem({ frequencyCount: 1, unitPrice: Money.fromNumber(0) });
      expect(item.assertValid()).toEqual([]);
    });
    it('flags a zero or fractional frequency count', () => {
      const item = aContractItem({ frequencyCount: 0 });
      expect(item.assertValid()).toEqual([{ field: 'frequency_count', message: expect.any(String) }]);
    });
    it('flags a negative unit price', () => {
      const item = aContractItem({ unitPrice: Money.fromNumber(-1) });
      expect(item.assertValid()).toEqual([{ field: 'unit_price', message: expect.any(String) }]);
    });
    it('flags both at once rather than stopping at the first', () => {
      const item = aContractItem({ frequencyCount: 0, unitPrice: Money.fromNumber(-1) });
      expect(item.assertValid().map((violation) => violation.field)).toEqual([
        'frequency_count',
        'unit_price',
      ]);
    });
  });
});
