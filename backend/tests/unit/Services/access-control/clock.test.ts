import { FakeClock } from '../../../support/clock';
import { SystemClock } from '../../../../services/access-control/clock';

describe('SystemClock', () => {
  it('reports the current server time — never a client-supplied one (§8.2, D7)', () => {
    const before = Date.now();

    const now = new SystemClock().now().getTime();

    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });
});

describe('FakeClock (test support)', () => {
  it('moves only when the spec moves it', () => {
    const clock = new FakeClock(new Date('2024-10-14T10:00:00.000Z'));

    clock.advanceMs(1800 * 1000);

    expect(clock.now().toISOString()).toBe('2024-10-14T10:30:00.000Z');
  });
});
