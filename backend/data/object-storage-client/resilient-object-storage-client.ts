import {
  DownloadTarget,
  ObjectStorageClient,
  PresignDownloadInput,
  PresignUploadInput,
  PutObjectInput,
  UploadTarget,
} from './object-storage-client';
import { CircuitBreaker } from '../../utils/resilience/circuit-breaker';
import { withRetry, RetryOptions } from '../../utils/resilience/retry';

export interface ResilienceOptions extends Pick<
  RetryOptions,
  'retries' | 'baseDelayMs' | 'sleep' | 'jitter'
> {
  failureThreshold: number;
  resetTimeoutMs: number;
}

export class ResilientObjectStorageClient implements ObjectStorageClient {
  private readonly breaker: CircuitBreaker;

  constructor(
    private readonly inner: ObjectStorageClient,
    private readonly options: ResilienceOptions,
  ) {
    this.breaker = new CircuitBreaker({
      failureThreshold: options.failureThreshold,
      resetTimeoutMs: options.resetTimeoutMs,
    });
  }

  presignUpload(input: PresignUploadInput): Promise<UploadTarget> {
    return this.guarded(() => this.inner.presignUpload(input));
  }

  putObject(input: PutObjectInput): Promise<{ key: string }> {
    return this.guarded(() => this.inner.putObject(input));
  }

  presignDownload(input: PresignDownloadInput): Promise<DownloadTarget> {
    return this.guarded(() => this.inner.presignDownload(input));
  }

  private guarded<T>(operation: () => Promise<T>): Promise<T> {
    return this.breaker.execute(() =>
      withRetry(operation, {
        retries: this.options.retries,
        baseDelayMs: this.options.baseDelayMs,
        sleep: this.options.sleep,
        jitter: this.options.jitter,
      }),
    );
  }
}
