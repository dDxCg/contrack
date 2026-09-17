import { HttpException, HttpStatus } from '@nestjs/common';

export const VALIDATION_FAILED_CODE = 'validation.failed';
export const INTERNAL_ERROR_CODE = 'internal.error';

export interface ErrorBody {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
}

export interface FieldViolation {
  field: string;
  message: string;
}

export abstract class DomainException extends HttpException {
  abstract readonly code: string;
  readonly details: Record<string, unknown>;

  protected constructor(status: number, message: string, details: Record<string, unknown> = {}) {
    super(message, status);
    this.details = details;
  }
}

export class AuthInvalidCredentialsException extends DomainException {
  readonly code = 'auth.invalid_credentials';

  constructor() {
    super(HttpStatus.UNAUTHORIZED, 'Sai tên đăng nhập hoặc mật khẩu');
  }
}

export class AuthCredentialExpiredException extends DomainException {
  readonly code = 'auth.credential_expired';

  constructor() {
    super(HttpStatus.UNAUTHORIZED, 'Phiên đăng nhập đã hết hạn');
  }
}

export class AuthForbiddenRoleException extends DomainException {
  readonly code = 'auth.forbidden_role';

  constructor(requiredRoles: readonly string[]) {
    super(HttpStatus.FORBIDDEN, 'Vai trò của bạn không có quyền thao tác này', {
      required_role: requiredRoles.join(', '),
    });
  }
}

export class AuthOutOfScopeException extends DomainException {
  readonly code = 'auth.out_of_scope';

  constructor() {
    super(HttpStatus.NOT_FOUND, 'Không tìm thấy dữ liệu');
  }
}

export class TenantSuspendedException extends DomainException {
  readonly code = 'tenant.suspended';

  constructor() {
    super(HttpStatus.UNAUTHORIZED, 'Tài khoản công ty đã bị tạm khóa');
  }
}

export class CustomerHasActiveContractsException extends DomainException {
  readonly code = 'customer.has_active_contracts';

  constructor(contractIds: readonly number[]) {
    super(HttpStatus.CONFLICT, 'Khách hàng còn hợp đồng đang chạy', { contract_ids: [...contractIds] });
  }
}

export class EmployeeHasAssignedShiftsException extends DomainException {
  readonly code = 'employee.has_assigned_shifts';

  constructor(shiftIds: readonly number[]) {
    super(HttpStatus.CONFLICT, 'Nhân viên còn ca sắp tới', { shift_ids: [...shiftIds] });
  }
}

export class EmployeeEmailTakenException extends DomainException {
  readonly code = 'employee.email_taken';

  constructor(email: string) {
    super(HttpStatus.CONFLICT, 'Email đã tồn tại', { email });
  }
}

export class EmployeeManagerCycleException extends DomainException {
  readonly code = 'employee.manager_cycle';

  constructor(path: readonly number[]) {
    super(HttpStatus.BAD_REQUEST, 'Sẽ tạo vòng lặp quản lý', { path: [...path] });
  }
}

export class TeamCodeTakenException extends DomainException {
  readonly code = 'team.code_taken';

  constructor(code: string) {
    super(HttpStatus.CONFLICT, 'Mã tổ đã tồn tại', { code });
  }
}

export class TeamHasMembersException extends DomainException {
  readonly code = 'team.has_members';

  constructor(employeeIds: readonly number[]) {
    super(HttpStatus.CONFLICT, 'Tổ còn thành viên', { employee_ids: [...employeeIds] });
  }
}

export class TeamLeadConflictException extends DomainException {
  readonly code = 'team.lead_conflict';

  constructor(employeeId: number) {
    super(HttpStatus.CONFLICT, 'Tổ đã có tổ trưởng', { employee_id: employeeId });
  }
}

export class ValidationFailedException extends DomainException {
  readonly code = VALIDATION_FAILED_CODE;

  constructor(fields: readonly FieldViolation[]) {
    super(HttpStatus.BAD_REQUEST, 'Dữ liệu không hợp lệ', { fields: [...fields] });
  }
}

export function toErrorEnvelope(exception: unknown): { status: number; body: ErrorBody } {
  if (exception instanceof DomainException) {
    return {
      status: exception.getStatus(),
      body: { error: { code: exception.code, message: exception.message, details: exception.details } },
    };
  }

  if (exception instanceof HttpException) {
    const status = exception.getStatus();

    return { status, body: { error: { code: `http.${status}`, message: exception.message, details: {} } } };
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    body: { error: { code: INTERNAL_ERROR_CODE, message: 'Lỗi hệ thống', details: {} } },
  };
}
