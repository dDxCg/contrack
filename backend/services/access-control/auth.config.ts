export interface AuthConfig {
  readonly jwtSecret: string;
  readonly accessTtlSeconds: number;
  readonly refreshTtlSeconds: number;
  readonly fieldTtlSeconds: number;
  readonly bcryptRounds: number;
}

export const AUTH_CONFIG = Symbol('AUTH_CONFIG');

const DEFAULT_ACCESS_TTL_SECONDS = 1800;
const DEFAULT_REFRESH_TTL_SECONDS = 43200;
const DEFAULT_FIELD_TTL_SECONDS = 86400;
const DEFAULT_BCRYPT_ROUNDS = 10;

export function loadAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const jwtSecret = env.JWT_SECRET;

  if (jwtSecret === undefined || jwtSecret === '') {
    throw new Error('JWT_SECRET is required — set it in the environment (see backend/.env.example)');
  }

  return {
    jwtSecret,
    accessTtlSeconds: readPositiveInt(env, 'JWT_ACCESS_TTL_SECONDS', DEFAULT_ACCESS_TTL_SECONDS),
    refreshTtlSeconds: readPositiveInt(env, 'JWT_REFRESH_TTL_SECONDS', DEFAULT_REFRESH_TTL_SECONDS),
    fieldTtlSeconds: readPositiveInt(env, 'JWT_FIELD_TTL_SECONDS', DEFAULT_FIELD_TTL_SECONDS),
    bcryptRounds: readPositiveInt(env, 'BCRYPT_ROUNDS', DEFAULT_BCRYPT_ROUNDS),
  };
}

function readPositiveInt(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = env[name];

  if (raw === undefined || raw === '') {
    return fallback;
  }

  const value = Number(raw);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive whole number (got "${raw}")`);
  }

  return value;
}
