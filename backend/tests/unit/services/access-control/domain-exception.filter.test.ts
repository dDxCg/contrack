import { ArgumentsHost, BadRequestException, Logger } from '@nestjs/common';
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
  let filter: DomainExceptionFilter;
  let loggerError: jest.SpyInstance;
  beforeEach(() => {
    filter = new DomainExceptionFilter();
    const logger = (filter as unknown as { logger: Logger }).logger;
    loggerError = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
  });

  function respondTo(
    exception: unknown,
    request: { id?: string; url?: string; access?: { tenantId: number } } = {},
  ): FakeResponse {
    const response = new FakeResponse();
    filter.catch(exception, {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ id: 'req-1', url: '/api/v1/whatever', ...request }),
      }),
    } as unknown as ArgumentsHost);

    return response;
  }

  it('sends a domain exception as its own envelope — code, message, details, status', () => {
    const response = respondTo(new AuthOutOfScopeException());
    expect(response.sentStatus).toBe(404);
    expect(response.sentBody).toEqual({
      error: { code: 'auth.out_of_scope', message: 'Không tìm thấy dữ liệu', details: {} },
    });
    expect(loggerError).not.toHaveBeenCalled();
  });
  it('does not log 4xx failures — only 5xx get the error logger', () => {
    respondTo(new BadRequestException());
    expect(loggerError).not.toHaveBeenCalled();
  });
  it('collapses an unexpected Error to 500 internal.error and logs the stack server-side', () => {
    const failure = new Error('connection refused by postgres');
    const response = respondTo(failure, { access: { tenantId: 7 } });
    expect(response.sentStatus).toBe(500);
    expect(response.sentBody).toEqual({
      error: { code: 'internal.error', message: 'Lỗi hệ thống', details: {} },
    });
    expect(loggerError).toHaveBeenCalledWith({
      message: 'Lỗi hệ thống',
      requestId: 'req-1',
      tenantId: 7,
      path: '/api/v1/whatever',
      stack: failure.stack,
    });
  });
  it('still answers a non-Error throwable with the same fixed envelope', () => {
    const response = respondTo('boom');
    expect(response.sentStatus).toBe(500);
    expect(response.sentBody).toEqual({
      error: { code: 'internal.error', message: 'Lỗi hệ thống', details: {} },
    });
    expect(loggerError).toHaveBeenCalledWith({
      message: 'Lỗi hệ thống',
      requestId: 'req-1',
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
