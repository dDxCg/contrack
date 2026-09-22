export class CircuitOpenException extends Error {
  constructor() {
    super('Circuit breaker is open');
    this.name = 'CircuitOpenException';
  }
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  clock?: () => number;
}

type State = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private readonly clock: () => number;
  private state: State = 'closed';
  private failureCount = 0;
  private openedAt = 0;

  constructor(private readonly options: CircuitBreakerOptions) {
    this.clock = options.clock ?? Date.now;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.clock() - this.openedAt < this.options.resetTimeoutMs) {
        throw new CircuitOpenException();
      }

      this.state = 'half-open';
    }

    try {
      const result = await operation();
      this.onSuccess();

      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.state = 'closed';
    this.failureCount = 0;
  }

  private onFailure(): void {
    if (this.state === 'half-open') {
      this.state = 'open';
      this.openedAt = this.clock();

      return;
    }

    this.failureCount += 1;

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'open';
      this.openedAt = this.clock();
    }
  }
}
