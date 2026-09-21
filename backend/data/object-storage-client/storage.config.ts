export interface StorageConfig {
  readonly endpoint: string | null;
  readonly region: string;
  readonly bucket: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly forcePathStyle: boolean;
  readonly uploadUrlTtlSeconds: number;
}
export const STORAGE_CONFIG = Symbol('STORAGE_CONFIG');
const REQUIRED_VARIABLES = ['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const;
const DEFAULT_REGION = 'ap-southeast-1';
const DEFAULT_UPLOAD_URL_TTL_SECONDS = 300;
export function loadStorageConfig(env: NodeJS.ProcessEnv = process.env): StorageConfig | null {
  const present = REQUIRED_VARIABLES.filter((name) => isPresent(env[name]));
  if (present.length === 0) {
    if (env.NODE_ENV === 'production') {
      throw new Error(
        `S3 storage is required when NODE_ENV=production — set ${REQUIRED_VARIABLES.join(', ')} (see backend/.env.example)`,
      );
    }
    return null;
  }
  const missing = REQUIRED_VARIABLES.filter((name) => !isPresent(env[name]));
  if (missing.length > 0) {
    throw new Error(
      `S3 storage is partially configured — also set ${missing.join(', ')} (see backend/.env.example)`,
    );
  }
  return {
    endpoint: readOptional(env, 'S3_ENDPOINT'),
    region: readOptional(env, 'S3_REGION') ?? DEFAULT_REGION,
    bucket: readRequired(env, 'S3_BUCKET'),
    accessKeyId: readRequired(env, 'S3_ACCESS_KEY_ID'),
    secretAccessKey: readRequired(env, 'S3_SECRET_ACCESS_KEY'),
    forcePathStyle: readBoolean(env, 'S3_FORCE_PATH_STYLE', false),
    uploadUrlTtlSeconds: readPositiveInt(env, 'S3_UPLOAD_URL_TTL_SECONDS', DEFAULT_UPLOAD_URL_TTL_SECONDS),
  };
}
function isPresent(value: string | undefined): boolean {
  return value !== undefined && value.trim() !== '';
}
function readRequired(env: NodeJS.ProcessEnv, name: string): string {
  const raw = env[name];
  if (!isPresent(raw)) {
    throw new Error(`${name} is required (see backend/.env.example)`);
  }
  return (raw as string).trim();
}
function readOptional(env: NodeJS.ProcessEnv, name: string): string | null {
  return isPresent(env[name]) ? readRequired(env, name) : null;
}
function readBoolean(env: NodeJS.ProcessEnv, name: string, fallback: boolean): boolean {
  const raw = env[name];
  if (!isPresent(raw)) {
    return fallback;
  }
  if (raw === 'true') {
    return true;
  }
  if (raw === 'false') {
    return false;
  }
  throw new Error(`${name} must be "true" or "false" (got "${raw}")`);
}
function readPositiveInt(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = env[name];
  if (!isPresent(raw)) {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive whole number (got "${raw}")`);
  }
  return value;
}
