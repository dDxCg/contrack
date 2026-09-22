import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '../../../../shared-kernel/domain-error';
import {
  ContractItemNotFoundError,
  ContractNotFoundError,
  ContractRequiresSiteError,
  ContractSiteNotFoundError,
  ContractSiteRequiresItemError,
  InvalidFrequencyError,
  ValidationFailedError,
} from '../../domain/errors';

/**
 * DomainExceptionFilter — the ONLY place in this codebase that maps a
 * DomainError to an HTTP status code.
 *
 * shared-kernel/domain-error.ts deliberately does not bake a status into
 * DomainError (unlike backend/models/domain-errors.ts, where each subclass
 * passes its status into the base constructor) — this reference port keeps
 * HTTP concerns entirely out of domain/, so the translation happens once,
 * here, in infrastructure/http. Each `instanceof` branch below is the
 * infra-layer equivalent of "each error subclass owns its own status":
 * the mapping lives next to the one place that needs it, not in a giant
 * generic code->status switch.
 */
@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(error: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = statusFor(error);
    response.status(status).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }
}

function statusFor(error: DomainError): number {
  if (
    error instanceof ContractNotFoundError ||
    error instanceof ContractSiteNotFoundError ||
    error instanceof ContractItemNotFoundError
  ) {
    return HttpStatus.NOT_FOUND;
  }
  if (
    error instanceof ValidationFailedError ||
    error instanceof InvalidFrequencyError ||
    error instanceof ContractRequiresSiteError ||
    error instanceof ContractSiteRequiresItemError
  ) {
    return HttpStatus.BAD_REQUEST;
  }
  return HttpStatus.INTERNAL_SERVER_ERROR;
}
