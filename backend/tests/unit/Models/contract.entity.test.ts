import { aContract } from '../../support/builders';
import { ContractStatus } from '../../../models/contracts/contract.entity';

describe('Contract', () => {
  describe('field changes', () => {
    it('changes the term and status', () => {
      const contract = aContract();

      contract.setTerm(new Date('2024-02-01'), new Date('2025-02-01'));
      contract.setStatus(ContractStatus.Renewed);

      expect(contract).toMatchObject({
        signedAt: new Date('2024-02-01'),
        expiresAt: new Date('2025-02-01'),
        status: ContractStatus.Renewed,
      });
    });
  });
});
