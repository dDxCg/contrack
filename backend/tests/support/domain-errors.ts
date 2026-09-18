import { DomainException } from '../../models/domain-errors';

export function captureDomainError(run: () => unknown): DomainException {
  try {
    run();
  } catch (error) {
    if (error instanceof DomainException) {
      return error;
    }
    throw error;
  }

  throw new Error('Expected a DomainException to be thrown, but the call returned normally');
}

export async function captureDomainErrorAsync(run: () => Promise<unknown>): Promise<DomainException> {
  try {
    await run();
  } catch (error) {
    if (error instanceof DomainException) {
      return error;
    }
    throw error;
  }

  throw new Error('Expected a DomainException to be thrown, but the call returned normally');
}
