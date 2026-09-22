/**
 * TenantId — shared-kernel identity value object.
 *
 * Every aggregate, repository port and use-case in this codebase threads a
 * TenantId through instead of a raw number. That is the whole point of the
 * "tenant-scoped repository" pattern this reference port mirrors from
 * backend/repositories/tenant-scoped.repository.ts: it is structurally
 * impossible to call a repository method without naming the tenant you are
 * scoped to, so a missing WHERE tenant_id = ? clause becomes a compile error
 * instead of a data leak.
 */
export class TenantId {
  private constructor(private readonly value: number) {}

  static of(value: number): TenantId {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(`TenantId must be a positive integer, got ${value}`);
    }
    return new TenantId(value);
  }

  toNumber(): number {
    return this.value;
  }

  equals(other: TenantId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return String(this.value);
  }
}
