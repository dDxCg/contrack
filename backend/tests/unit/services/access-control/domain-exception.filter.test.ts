import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { AuthOutOfScopeException } from '../../../../models/domain-errors';
import {
  DomainExceptionFilter,
  toValidationViolations,
} from '../../../../services/access-control/domain-exception.filter';

class FakeResponse {
  sentStatus: number | undefined;

  sentBody: unknown;

  status(code: number): this {
    this.sentStatus = code;

    return this;
  }

  json(body: unknown): this {
    this.sentBody = body;

    return this;
  }
}

describe('DomainExceptionFilter', () => {
  const filter = new DomainExceptionFilter();

  function respondTo(
    exception: unknown,
    request: { url?: string; access?: { tenantId: number } } = {},
  ): { response: FakeResponse; logError: jest.Mock } {
    const response = new FakeResponse();
    const logError = jest.fn();
    filter.catch(exception, {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ id: 'req-1', url: '/api/v1/whatever', log: { error: logError }, ...request }),
      }),
    } as unknown as ArgumentsHost);

    return { response, logError };
  }

  it('sends a domain exception as its own envelope — code, message, details, status', () => {
    const { response, logError } = respondTo(new AuthOutOfScopeException());
    expect(response.sentStatus).toBe(404);
    expect(response.sentBody).toEqual({
      error: { code: 'auth.out_of_scope', message: 'Không tìm thấy dữ liệu', details: {} },
    });
    expect(logError).not.toHaveBeenCalled();
  });
  it('does not log 4xx failures — only 5xx get the request logger', () => {
    const { logError } = respondTo(new BadRequestException());
    expect(logError).not.toHaveBeenCalled();
  });
  it('collapses an unexpected Error to 500 internal.error and logs the stack via the request-scoped logger', () => {
    const { response, logError } = respondTo(new Error('connection refused by postgres'), {
      access: { tenantId: 7 },
    });
    expect(response.sentStatus).toBe(500);
    expect(response.sentBody).toEqual({
      error: { code: 'internal.error', message: 'Lỗi hệ thống', details: {} },
    });
    expect(logError).toHaveBeenCalledWith({
      message: 'Lỗi hệ thống',
      tenantId: 7,
      path: '/api/v1/whatever',
      stack: expect.stringContaining('connection refused by postgres'),
    });
  });
  it('still answers a non-Error throwable with the same fixed envelope', () => {
    const { response, logError } = respondTo('boom');
    expect(response.sentStatus).toBe(500);
    expect(response.sentBody).toEqual({
      error: { code: 'internal.error', message: 'Lỗi hệ thống', details: {} },
    });
    expect(logError).toHaveBeenCalledWith({
      message: 'Lỗi hệ thống',
      tenantId: null,
      path: '/api/v1/whatever',
      stack: 'boom',
    });
  });
});

describe('toValidationViolations', () => {
  it('flattens every constraint message onto its field', () => {
    const error = new ValidationError();
    error.property = 'name';
    error.constraints = { isString: 'name must be a string', isNotEmpty: 'name should not be empty' };
    expect(toValidationViolations([error])).toEqual([
      { field: 'name', message: 'name must be a string' },
      { field: 'name', message: 'name should not be empty' },
    ]);
  });
  it('walks nested children so a path reads sites.items.unit_price', () => {
    const item = new ValidationError();
    item.property = 'unit_price';
    item.constraints = { isPositive: 'unit_price must be a positive number' };
    const site = new ValidationError();
    site.property = 'items';
    site.children = [item];
    const sites = new ValidationError();
    sites.property = 'sites';
    sites.children = [site];
    expect(toValidationViolations([sites])).toEqual([
      { field: 'sites.items.unit_price', message: 'unit_price must be a positive number' },
    ]);
  });
  it('produces nothing for an error carrying neither constraints nor children', () => {
    const empty = new ValidationError();
    empty.property = 'name';
    expect(toValidationViolations([empty])).toEqual([]);
  });
});
