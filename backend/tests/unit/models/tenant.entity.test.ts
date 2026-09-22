import { captureDomainError } from '../../support/domain-errors';
import { aTenant } from '../../support/builders';
import { TenantStatus } from '../../../models/tenants/tenant.entity';

describe('Tenant', () => {
  describe('assertActive', () => {
    it('lets an active tenant through', () => {
      const tenant = aTenant({ status: TenantStatus.Active });
      expect(() => tenant.assertActive()).not.toThrow();
    });
    it('refuses a suspended tenant with 401 tenant.suspended (05-api.md §9)', () => {
      const tenant = aTenant({ status: TenantStatus.Suspended });
      const error = captureDomainError(() => tenant.assertActive());
      expect(error.code).toBe('tenant.suspended');
      expect(error.getStatus()).toBe(401);
      expect(error.details).toEqual({});
    });
  });
});
