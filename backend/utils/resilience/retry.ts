export interface RetryOptions {
  retries: number;
  baseDelayMs: number;
  jitter?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
  const jitter = options.jitter ?? (() => 0);
  const sleep = options.sleep ?? defaultSleep;
  let attempt = 0;

  for (;;) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= options.retries) {
        throw error;
      }

      const delay = options.baseDelayMs * 2 ** attempt + jitter();
      await sleep(delay);
      attempt += 1;
    }
  }
}
