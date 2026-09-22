import { TenantId } from '../../src/shared-kernel/tenant-id';

describe('TenantId', () => {
  it('accepts positive integers', () => {
    expect(TenantId.of(1).toNumber()).toBe(1);
  });

  it('rejects zero, negative and non-integer values', () => {
    expect(() => TenantId.of(0)).toThrow();
    expect(() => TenantId.of(-1)).toThrow();
    expect(() => TenantId.of(1.5)).toThrow();
  });

  it('equals() compares by value', () => {
    expect(TenantId.of(7).equals(TenantId.of(7))).toBe(true);
    expect(TenantId.of(7).equals(TenantId.of(8))).toBe(false);
  });
});
