import { ValidationError } from 'class-validator';
import { FieldViolation } from '../../../../shared-kernel/domain-error';

/** Ported from backend/services/access-control/domain-exception.filter.ts#toValidationViolations. Flattens class-validator's nested ValidationError tree into the flat FieldViolation[] shape ValidationFailedError expects. */
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
