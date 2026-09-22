import 'reflect-metadata';
import {
  ACCESS_METADATA,
  Access,
  PUBLIC_METADATA,
  Public,
} from '../../../../services/access-control/access.decorator';
import { Operation, Resource } from '../../../../services/access-control/role-resolver';

class GuardedRoutes {
  @Access(Resource.Shifts, Operation.Update)
  patchShift(): void {}

  @Public()
  login(): void {}
}

describe('access decorators', () => {
  it('Access stamps the resource × operation requirement the guard will enforce', () => {
    expect(Reflect.getMetadata(ACCESS_METADATA, GuardedRoutes.prototype.patchShift)).toEqual({
      resource: Resource.Shifts,
      operation: Operation.Update,
    });
  });
  it('Public marks a route as reachable without any credential', () => {
    expect(Reflect.getMetadata(PUBLIC_METADATA, GuardedRoutes.prototype.login)).toBe(true);
  });
  it('keeps the metadata key names stable — the guard and the decorators must agree on them', () => {
    expect(ACCESS_METADATA).toBe('access');
    expect(PUBLIC_METADATA).toBe('public');
  });
});
