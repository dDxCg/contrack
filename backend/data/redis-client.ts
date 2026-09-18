import Redis from 'ioredis';
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');
export function createRedisClient(env: NodeJS.ProcessEnv = process.env): Redis | null {
  const url = env.REDIS_LOCK_URL;
  if (url === undefined || url === '') {
    if (env.NODE_ENV === 'production') {
      throw new Error('REDIS_LOCK_URL is required when NODE_ENV=production');
    }
    return null;
  }
  return new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 3 });
}
