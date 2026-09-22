import { QueryFailedError } from 'typeorm';

const UNIQUE_VIOLATION = '23505';

export async function withUniqueViolation<T>(op: () => Promise<T>, onViolation: () => Error): Promise<T> {
  try {
    return await op();
  } catch (error) {
    if (error instanceof QueryFailedError) {
      const driverError = error.driverError as { code?: string } | undefined;

      if (driverError?.code === UNIQUE_VIOLATION) {
        throw onViolation();
      }
    }

    throw error;
  }
}
