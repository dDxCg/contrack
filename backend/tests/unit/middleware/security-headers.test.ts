import { securityHeaders } from '../../../middleware/security-headers';

describe('securityHeaders', () => {
  it('returns an Express-compatible middleware function', () => {
    const middleware = securityHeaders();

    expect(typeof middleware).toBe('function');
    expect(middleware.length).toBe(3);
  });

  it('sets helmet-managed security headers on the response', () => {
    const middleware = securityHeaders();
    const headers: Record<string, string> = {};
    const req = {} as never;
    const res = {
      setHeader: (name: string, value: string) => {
        headers[name] = value;
      },
      getHeader: () => undefined,
      removeHeader: (name: string) => {
        delete headers[name];
      },
    } as never;
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(headers['X-DNS-Prefetch-Control']).toBe('off');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
  });
});
