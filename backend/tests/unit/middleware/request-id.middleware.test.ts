import { RequestIdMiddleware } from '../../../middleware/request-id.middleware';

function fakeReqRes(headers: Record<string, string | undefined> = {}) {
  const req = { headers } as unknown as Parameters<RequestIdMiddleware['use']>[0];
  const setHeader = jest.fn();
  const res = { setHeader } as unknown as Parameters<RequestIdMiddleware['use']>[1];
  return { req, res, setHeader };
}

describe('RequestIdMiddleware', () => {
  it('generates a request id and echoes it back on the response header', () => {
    const middleware = new RequestIdMiddleware();
    const { req, res, setHeader } = fakeReqRes();
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.id).toEqual(expect.any(String));
    expect(req.id.length).toBeGreaterThan(0);
    expect(setHeader).toHaveBeenCalledWith('X-Request-Id', req.id);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('reuses an incoming X-Request-Id instead of generating a new one', () => {
    const middleware = new RequestIdMiddleware();
    const { req, res, setHeader } = fakeReqRes({ 'x-request-id': 'client-supplied-id' });
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.id).toBe('client-supplied-id');
    expect(setHeader).toHaveBeenCalledWith('X-Request-Id', 'client-supplied-id');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('ignores an empty incoming header and generates a fresh id instead', () => {
    const middleware = new RequestIdMiddleware();
    const { req, res } = fakeReqRes({ 'x-request-id': '' });
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.id).not.toBe('');
    expect(next).toHaveBeenCalledTimes(1);
  });
});
