import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

const SENSITIVE_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  '*.password_hash',
  '*.passwordHash',
  '*.token',
];

export interface PinoHttpOptions {
  level: string;
  genReqId: (req: IncomingMessage, res: ServerResponse) => string;
  redact: { paths: string[]; censor: string };
  transport?: { target: string; options: Record<string, unknown> };
}

export function buildPinoHttpOptions(env: NodeJS.ProcessEnv): PinoHttpOptions {
  return {
    level: levelFor(env),
    genReqId,
    redact: { paths: SENSITIVE_PATHS, censor: '[Redacted]' },
    transport:
      env.NODE_ENV === 'production'
        ? undefined
        : { target: 'pino-pretty', options: { colorize: true, singleLine: true } },
  };
}

function levelFor(env: NodeJS.ProcessEnv): string {
  if (env.LOG_LEVEL !== undefined && env.LOG_LEVEL !== '') {
    return env.LOG_LEVEL;
  }

  return env.NODE_ENV === 'test' ? 'warn' : 'info';
}

function genReqId(req: IncomingMessage, res: ServerResponse): string {
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' && incoming !== '' ? incoming : randomUUID();
  res.setHeader('X-Request-Id', id);

  return id;
}
