import { ArgumentsHost, Catch, ExceptionFilter, Logger, ValidationError } from '@nestjs/common';
import type { Response } from 'express';
import { FieldViolation, toErrorEnvelope } from '../../models/domain-errors';
import type { RequestWithId } from '../../middleware/request-id.middleware';

interface FailedRequest extends RequestWithId {
  access?: { tenantId: number };
  url: string;
}

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const { status, body } = toErrorEnvelope(exception);
    if (status >= 500) {
      const request = ctx.getRequest<FailedRequest>();
      this.logger.error({
        message: body.error.message,
        requestId: request.id,
        tenantId: request.access?.tenantId ?? null,
        path: request.url,
        stack: exception instanceof Error ? exception.stack : String(exception),
      });
    }
    response.status(status).json(body);
  }
}
export function toValidationViolations(errors: readonly ValidationError[]): FieldViolation[] {
  const violations: FieldViolation[] = [];
  const walk = (error: ValidationError, path: string): void => {
    const field = path === '' ? error.property : `${path}.${error.property}`;
    for (const message of Object.values(error.constraints ?? {})) {
      violations.push({ field, message });
    }
    for (const child of error.children ?? []) {
      walk(child, field);
    }
  };
  for (const error of errors) {
    walk(error, '');
  }
  return violations;
}
