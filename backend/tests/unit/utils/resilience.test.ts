import { withRetry } from '../../../utils/resilience/retry';
import { CircuitBreaker, CircuitOpenException } from '../../../utils/resilience/circuit-breaker';

describe('withRetry', () => {
  it('returns the result on first success without retrying', async () => {
    const operation = jest.fn().mockResolvedValue('ok');

    const result = await withRetry(operation, { retries: 3, baseDelayMs: 1, jitter: () => 0 });

    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries on failure with exponential backoff until it succeeds', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue('ok');
    const delays: number[] = [];
    const sleep = jest.fn(async (ms: number) => {
      delays.push(ms);
    });

    const result = await withRetry(operation, { retries: 3, baseDelayMs: 10, jitter: () => 0, sleep });

    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(3);
    expect(delays).toEqual([10, 20]);
  });

  it('adds jitter on top of the exponential delay', async () => {
    const operation = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue('ok');
    const delays: number[] = [];
    const sleep = jest.fn(async (ms: number) => {
      delays.push(ms);
    });

    await withRetry(operation, { retries: 1, baseDelayMs: 10, jitter: () => 5, sleep });

    expect(delays).toEqual([15]);
  });

  it('gives up and rethrows the last error once retries are exhausted', async () => {
    const error = new Error('always fails');
    const operation = jest.fn().mockRejectedValue(error);
    const sleep = jest.fn().mockResolvedValue(undefined);

    await expect(
      withRetry(operation, { retries: 2, baseDelayMs: 1, jitter: () => 0, sleep }),
    ).rejects.toThrow('always fails');
    expect(operation).toHaveBeenCalledTimes(3);
  });
});

describe('CircuitBreaker', () => {
  function build(failureThreshold = 2, resetTimeoutMs = 100) {
    let now = 0;
    const clock = () => now;
    const breaker = new CircuitBreaker({ failureThreshold, resetTimeoutMs, clock });

    return { breaker, advance: (ms: number) => (now += ms) };
  }

  it('passes calls through while closed', async () => {
    const { breaker } = build();
    const operation = jest.fn().mockResolvedValue('ok');

    await expect(breaker.execute(operation)).resolves.toBe('ok');
  });

  it('opens after the failure threshold and fails fast without calling the operation', async () => {
    const { breaker } = build(2);
    const operation = jest.fn().mockRejectedValue(new Error('down'));

    await expect(breaker.execute(operation)).rejects.toThrow('down');
    await expect(breaker.execute(operation)).rejects.toThrow('down');
    expect(operation).toHaveBeenCalledTimes(2);

    await expect(breaker.execute(operation)).rejects.toThrow(CircuitOpenException);
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('moves to half-open after the reset timeout and closes again on success', async () => {
    const { breaker, advance } = build(1, 100);
    const failing = jest.fn().mockRejectedValue(new Error('down'));

    await expect(breaker.execute(failing)).rejects.toThrow('down');
    await expect(breaker.execute(failing)).rejects.toThrow(CircuitOpenException);

    advance(100);
    const succeeding = jest.fn().mockResolvedValue('ok');
    await expect(breaker.execute(succeeding)).resolves.toBe('ok');
    await expect(breaker.execute(succeeding)).resolves.toBe('ok');
    expect(succeeding).toHaveBeenCalledTimes(2);
  });

  it('reopens if the half-open trial call fails again', async () => {
    const { breaker, advance } = build(1, 100);
    const failing = jest.fn().mockRejectedValue(new Error('down'));

    await expect(breaker.execute(failing)).rejects.toThrow('down');
    advance(100);
    await expect(breaker.execute(failing)).rejects.toThrow('down');

    await expect(breaker.execute(failing)).rejects.toThrow(CircuitOpenException);
  });
});
