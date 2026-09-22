import { buildPinoHttpOptions, PinoHttpOptions } from '../../../logger/logger.config';

function fakeReqRes(headers: Record<string, string | undefined> = {}) {
  const req = { headers } as unknown as Parameters<PinoHttpOptions['genReqId']>[0];
  const setHeader = jest.fn();
  const res = { setHeader } as unknown as Parameters<PinoHttpOptions['genReqId']>[1];

  return { req, res, setHeader };
}

describe('buildPinoHttpOptions', () => {
  describe('genReqId', () => {
    it('generates a request id and echoes it back on the response header', () => {
      const options = buildPinoHttpOptions({});
      const { req, res, setHeader } = fakeReqRes();

      const id = options.genReqId?.(req, res);

      expect(id).toEqual(expect.any(String));
      expect((id as string).length).toBeGreaterThan(0);
      expect(setHeader).toHaveBeenCalledWith('X-Request-Id', id);
    });

    it('reuses an incoming X-Request-Id instead of generating a new one', () => {
      const options = buildPinoHttpOptions({});
      const { req, res, setHeader } = fakeReqRes({ 'x-request-id': 'client-supplied-id' });

      const id = options.genReqId?.(req, res);

      expect(id).toBe('client-supplied-id');
      expect(setHeader).toHaveBeenCalledWith('X-Request-Id', 'client-supplied-id');
    });

    it('ignores an empty incoming header and generates a fresh id instead', () => {
      const options = buildPinoHttpOptions({});
      const { req, res } = fakeReqRes({ 'x-request-id': '' });

      const id = options.genReqId?.(req, res);

      expect(id).not.toBe('');
    });
  });

  describe('level', () => {
    it('defaults to info when LOG_LEVEL is not set', () => {
      expect(buildPinoHttpOptions({}).level).toBe('info');
    });

    it('honors an explicit LOG_LEVEL', () => {
      expect(buildPinoHttpOptions({ LOG_LEVEL: 'debug' }).level).toBe('debug');
    });

    it('quiets down to warn under NODE_ENV=test unless LOG_LEVEL overrides it', () => {
      expect(buildPinoHttpOptions({ NODE_ENV: 'test' }).level).toBe('warn');
      expect(buildPinoHttpOptions({ NODE_ENV: 'test', LOG_LEVEL: 'debug' }).level).toBe('debug');
    });
  });

  describe('transport', () => {
    it('uses the pretty transport outside production', () => {
      expect(buildPinoHttpOptions({ NODE_ENV: 'development' }).transport).toEqual({
        target: 'pino-pretty',
        options: { colorize: true, singleLine: true },
      });
    });

    it('emits plain JSON in production — no pretty transport', () => {
      expect(buildPinoHttpOptions({ NODE_ENV: 'production' }).transport).toBeUndefined();
    });
  });

  describe('redact', () => {
    it('masks the authorization header and known sensitive fields', () => {
      const { redact } = buildPinoHttpOptions({});
      expect(redact).toEqual(
        expect.objectContaining({
          paths: expect.arrayContaining([
            'req.headers.authorization',
            'req.headers.cookie',
            '*.password_hash',
            '*.passwordHash',
            '*.token',
          ]),
          censor: '[Redacted]',
        }),
      );
    });
  });
});
