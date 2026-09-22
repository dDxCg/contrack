// Enterprise business rule errors. Framework-free: no NestJS HttpException,
// no TypeORM. Mirrors the ADR in docs/03-architecture.md — there is no central
// HTTP-status lookup table; each error subclass owns its own status, and an
// outer layer (the web presenter/exception filter) reads getStatus() to
// translate it, rather than the entity/use-case layers knowing about HTTP.

export interface FieldViolation {
  field: string;
  message: string;
}

export abstract class DomainError extends Error {
  abstract readonly code: string;
  readonly details: Record<string, unknown>;
  private readonly status: number;

  protected constructor(status: number, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.details = details;
  }

  getStatus(): number {
    return this.status;
  }
}

export class ValidationFailedError extends DomainError {
  readonly code = 'validation.failed';
  constructor(fields: readonly FieldViolation[]) {
    super(400, 'Validation failed', { fields: [...fields] });
  }
}

export class ContractNotFoundError extends DomainError {
  readonly code = 'contract.not_found';
  constructor() {
    super(404, 'Contract not found');
  }
}

export class ContractSiteNotFoundError extends DomainError {
  readonly code = 'contract_site.not_found';
  constructor() {
    super(404, 'Contract site not found');
  }
}

export class ContractItemNotFoundError extends DomainError {
  readonly code = 'contract_item.not_found';
  constructor() {
    super(404, 'Contract item not found');
  }
}
