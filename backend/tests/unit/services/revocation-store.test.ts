import { FakeClock } from '../../support/clock';
import { InMemoryRevocationStore, RedisRevocationStore } from '../../../services/auth/revocation-store';

describe('InMemoryRevocationStore', () => {
  it('reports a revoked jti as revoked until its own expiry passes', async () => {
    const clock = new FakeClock();
    const store = new InMemoryRevocationStore(clock);
    const expiresAt = Math.floor(clock.now().getTime() / 1000) + 60;
    await store.revoke('jti-1', expiresAt);
    expect(await store.isRevoked('jti-1')).toBe(true);
    clock.advanceMs(61 * 1000);
    expect(await store.isRevoked('jti-1')).toBe(false);
  });

  it('never stores a revocation for a credential that is already expired', async () => {
    const clock = new FakeClock();
    const store = new InMemoryRevocationStore(clock);
    const alreadyExpired = Math.floor(clock.now().getTime() / 1000) - 1;
    await store.revoke('jti-2', alreadyExpired);
    expect(await store.isRevoked('jti-2')).toBe(false);
  });

  it('answers false for a jti that was never revoked', async () => {
    const store = new InMemoryRevocationStore(new FakeClock());
    expect(await store.isRevoked('never-revoked')).toBe(false);
  });
});

describe('RedisRevocationStore', () => {
  function fakeRedis() {
    const store = new Map<string, { value: string; expiresAt: number }>();

    return {
      store,
      async set(key: string, value: string, mode: string, ttlSeconds: number) {
        if (mode !== 'EX') {
          throw new Error(`unexpected redis invocation: ${mode}`);
        }

        store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });

        return 'OK';
      },
      async exists(key: string) {
        const entry = store.get(key);

        if (entry === undefined) {
          return 0;
        }

        if (entry.expiresAt <= Date.now()) {
          store.delete(key);

          return 0;
        }

        return 1;
      },
    };
  }

  it('sets a key with a TTL derived from the credential expiry', async () => {
    const clock = new FakeClock();
    const store = new RedisRevocationStore(fakeRedis() as never, clock);
    const expiresAt = Math.floor(clock.now().getTime() / 1000) + 60;
    await store.revoke('jti-1', expiresAt);
    expect(await store.isRevoked('jti-1')).toBe(true);
  });

  it('answers false for a jti that was never revoked', async () => {
    const store = new RedisRevocationStore(fakeRedis() as never, new FakeClock());
    expect(await store.isRevoked('never-revoked')).toBe(false);
  });

  it('never issues a SET for a credential that is already expired', async () => {
    const clock = new FakeClock();
    const redis = fakeRedis();
    const store = new RedisRevocationStore(redis as never, clock);
    const alreadyExpired = Math.floor(clock.now().getTime() / 1000) - 1;
    await store.revoke('jti-2', alreadyExpired);
    expect(redis.store.size).toBe(0);
  });
});
