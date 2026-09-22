import { aContractSite } from '../../support/builders';

describe('ContractSite', () => {
  describe('field changes', () => {
    it('changes name, work requirements and notes', () => {
      const site = aContractSite();
      site.setName('Toà B');
      site.setWorkRequirements('Vệ sinh sảnh và thang máy');
      site.setNotes('Khách yêu cầu làm trước 8h sáng');
      expect(site).toMatchObject({
        name: 'Toà B',
        workRequirements: 'Vệ sinh sảnh và thang máy',
        notes: 'Khách yêu cầu làm trước 8h sáng',
      });
    });
  });
});
