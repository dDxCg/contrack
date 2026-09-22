/**
 * DomainError — shared-kernel error base.
 *
 * Mirrors the ADR behind backend/models/domain-errors.ts: there is no central
 * HTTP-status lookup table anywhere in domain/ or application/. Each concrete
 * error subclass owns its own `code` (a stable machine-readable identifier)
 * and carries whatever `details` a caller needs to render a message. HTTP
 * status translation is an infrastructure/http concern only — see
 * infrastructure/http/domain-error.filter.ts in the contracts context, which
 * is the ONLY place in this codebase that maps a DomainError to a status
 * code. domain/ and application/ never import anything HTTP-shaped.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  readonly details: Record<string, unknown>;

  protected constructor(message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = new.target.name;
    this.details = details;
  }
}

export interface FieldViolation {
  field: string;
  message: string;
}
