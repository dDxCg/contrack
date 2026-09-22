import { BadRequestException } from '@nestjs/common';

// Stand-in for the backend's real access-control module (JWT auth, role +
// row-scope resolution — see backend/services/access-control/). That module
// is a separate bounded context and explicitly out of this narrowed port's
// scope (see README.md's "Deliberate simplifications"). Every use case still
// takes tenantId as a mandatory first argument, so swapping this stub for a
// real `@CurrentAccess()`-style decorator is a frameworks-drivers-only
// change — no use case or entity would need to move.
export function requireTenantId(header: string | undefined): number {
  const tenantId = Number(header);
  if (header === undefined || !Number.isInteger(tenantId) || tenantId <= 0) {
    throw new BadRequestException('x-tenant-id header must be a positive integer');
  }
  return tenantId;
}
