import { ObjectStorageClient } from '../../../data/object-storage-client/object-storage-client';
import { ResilientObjectStorageClient } from '../../../data/object-storage-client/resilient-object-storage-client';
import { CircuitOpenException } from '../../../utils/resilience/circuit-breaker';

function fakeInner(): jest.Mocked<ObjectStorageClient> {
  return {
    presignUpload: jest.fn(),
    putObject: jest.fn(),
    presignDownload: jest.fn(),
  };
}

describe('ResilientObjectStorageClient', () => {
  it('delegates to the inner client on success', async () => {
    const inner = fakeInner();
    inner.putObject.mockResolvedValue({ key: 'a' });
    const client = new ResilientObjectStorageClient(inner, {
      retries: 2,
      baseDelayMs: 1,
      failureThreshold: 3,
      resetTimeoutMs: 1000,
      sleep: async () => {},
    });

    await expect(
      client.putObject({ key: 'a', contentType: 'application/pdf', body: Buffer.from('x') }),
    ).resolves.toEqual({ key: 'a' });
    expect(inner.putObject).toHaveBeenCalledTimes(1);
  });

  it('retries transient failures before succeeding', async () => {
    const inner = fakeInner();
    inner.putObject.mockRejectedValueOnce(new Error('timeout')).mockResolvedValue({ key: 'a' });
    const client = new ResilientObjectStorageClient(inner, {
      retries: 2,
      baseDelayMs: 1,
      failureThreshold: 5,
      resetTimeoutMs: 1000,
      sleep: async () => {},
    });

    await expect(
      client.putObject({ key: 'a', contentType: 'application/pdf', body: Buffer.from('x') }),
    ).resolves.toEqual({ key: 'a' });
    expect(inner.putObject).toHaveBeenCalledTimes(2);
  });

  it('opens the circuit after repeated failures and fails fast without calling the inner client', async () => {
    const inner = fakeInner();
    inner.putObject.mockRejectedValue(new Error('down'));
    const client = new ResilientObjectStorageClient(inner, {
      retries: 0,
      baseDelayMs: 1,
      failureThreshold: 2,
      resetTimeoutMs: 1000,
      sleep: async () => {},
    });
    const input = { key: 'a', contentType: 'application/pdf', body: Buffer.from('x') };

    await expect(client.putObject(input)).rejects.toThrow('down');
    await expect(client.putObject(input)).rejects.toThrow('down');
    await expect(client.putObject(input)).rejects.toThrow(CircuitOpenException);
    expect(inner.putObject).toHaveBeenCalledTimes(2);
  });
});
