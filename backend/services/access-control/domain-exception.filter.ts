import { ArgumentsHost, Catch, ExceptionFilter, Logger, ValidationError } from '@nestjs/common';
import type { Response } from 'express';
import { FieldViolation, toErrorEnvelope } from '../../models/domain-errors';

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, body } = toErrorEnvelope(exception);

    if (status >= 500) {
      this.logger.error(body.error.message, exception instanceof Error ? exception.stack : String(exception));
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
