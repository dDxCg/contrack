import { DomainError, FieldViolation } from '../../../shared-kernel/domain-error';

/**
 * Contracts-context domain errors. Each subclass owns its own `code`; none
 * of them know about HTTP. See infrastructure/http/domain-error.filter.ts
 * for the (only) place that translates these to status codes.
 */
export class ValidationFailedError extends DomainError {
  readonly code = 'validation.failed';
  constructor(fields: readonly FieldViolation[]) {
    super('Dữ liệu không hợp lệ', { fields: [...fields] });
  }
}

export class ContractNotFoundError extends DomainError {
  readonly code = 'contract.not_found';
  constructor(id: number) {
    super(`Contract ${id} was not found for this tenant`, { id });
  }
}

export class ContractSiteNotFoundError extends DomainError {
  readonly code = 'contract_site.not_found';
  constructor(id: number) {
    super(`Contract site ${id} was not found for this tenant`, { id });
  }
}

export class ContractItemNotFoundError extends DomainError {
  readonly code = 'contract_item.not_found';
  constructor(id: number) {
    super(`Contract item ${id} was not found for this tenant`, { id });
  }
}

export class InvalidFrequencyError extends DomainError {
  readonly code = 'contract_item.invalid_frequency';
  constructor(violations: readonly FieldViolation[]) {
    super('Contract item frequency is invalid', { violations: [...violations] });
  }
}

export class ContractRequiresSiteError extends DomainError {
  readonly code = 'contract.requires_site';
  constructor() {
    super('At least one site is required');
  }
}

export class ContractSiteRequiresItemError extends DomainError {
  readonly code = 'contract_site.requires_item';
  constructor(siteIndex: number) {
    super(`Site at index ${siteIndex} requires at least one service item`, { site_index: siteIndex });
  }
}
