import { FakeClock } from '../../support/clock';
import { InMemoryDistributedLock, RedisDistributedLock } from '../../../services/alerts/distributed-lock';

describe('InMemoryDistributedLock', () => {
  it('grants once; the second contender is refused until the holder releases', async () => {
    const lock = new InMemoryDistributedLock(new FakeClock());
    expect(await lock.tryAcquire('alerts:daily', 300)).toBe(true);
    expect(await lock.tryAcquire('alerts:daily', 300)).toBe(false);
    await lock.release('alerts:daily');
    expect(await lock.tryAcquire('alerts:daily', 300)).toBe(true);
  });
  it('expires the grant of a holder that crashed without releasing', async () => {
    const clock = new FakeClock();
    const lock = new InMemoryDistributedLock(clock);
    expect(await lock.tryAcquire('alerts:daily', 300)).toBe(true);
    clock.advanceMs(301 * 1000);
    expect(await lock.tryAcquire('alerts:daily', 300)).toBe(true);
  });
  it('keys are independent', async () => {
    const lock = new InMemoryDistributedLock(new FakeClock());
    expect(await lock.tryAcquire('alerts:daily', 300)).toBe(true);
    expect(await lock.tryAcquire('other:job', 300)).toBe(true);
  });
  it('releasing a lock you do not hold is a no-op, not an error', async () => {
    const lock = new InMemoryDistributedLock(new FakeClock());
    await expect(lock.release('never-acquired')).resolves.toBeUndefined();
  });
});

describe('RedisDistributedLock', () => {
  function fakeRedis() {
    const store = new Map<string, string>();

    return {
      store,
      async set(key: string, value: string, mode: string, ttlMs: number, condition: string) {
        if (mode !== 'PX' || condition !== 'NX') {
          throw new Error(`unexpected redis invocation: ${mode} ${condition}`);
        }

        if (store.has(key)) {
          return null;
        }

        store.set(key, value);

        return 'OK';
      },
      async eval(_script: string, numKeys: number, key: string, value: string) {
        if (numKeys !== 1) {
          throw new Error(`unexpected key count: ${numKeys}`);
        }

        if (store.get(key) === value) {
          store.delete(key);

          return 1;
        }

        return 0;
      },
    };
  }

  it('grants via SET NX PX and refuses while the key is held', async () => {
    const lock = new RedisDistributedLock(fakeRedis() as never);
    expect(await lock.tryAcquire('alerts:daily', 300)).toBe(true);
    expect(await lock.tryAcquire('alerts:daily', 300)).toBe(false);
  });
  it('release frees the grant for the next contender', async () => {
    const lock = new RedisDistributedLock(fakeRedis() as never);
    expect(await lock.tryAcquire('alerts:daily', 300)).toBe(true);
    await lock.release('alerts:daily');
    expect(await lock.tryAcquire('alerts:daily', 300)).toBe(true);
  });
  it('an instance cannot release a grant it does not hold', async () => {
    const redis = fakeRedis();
    const first = new RedisDistributedLock(redis as never);
    const second = new RedisDistributedLock(redis as never);
    expect(await first.tryAcquire('alerts:daily', 300)).toBe(true);
    await second.release('alerts:daily');
    expect(await second.tryAcquire('alerts:daily', 300)).toBe(false);
  });
});
