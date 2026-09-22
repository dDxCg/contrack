export const VALIDATION_FAILED_CODE = 'validation.failed';

export const INTERNAL_ERROR_CODE = 'internal.error';

const HttpStatus = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

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

export abstract class DomainException extends Error {
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

export class TenantNotFoundException extends DomainException {
  readonly code = 'tenant.not_found';

  constructor(tenantId: number) {
    super(HttpStatus.NOT_FOUND, 'Không tìm thấy công ty', { tenant_id: tenantId });
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

export class ShiftAlreadyCompletedException extends DomainException {
  readonly code = 'shift.already_completed';

  constructor(completedAt: Date | null) {
    super(HttpStatus.CONFLICT, 'Ca đã hoàn thành', completedAt === null ? {} : { completed_at: completedAt });
  }
}

export class ShiftAssigneeOutOfTeamException extends DomainException {
  readonly code = 'shift.assignee_out_of_team';

  constructor(assigneeId: number) {
    super(HttpStatus.FORBIDDEN, 'Nhân viên không thuộc tổ của bạn', { assignee_id: assigneeId });
  }
}

export class ShiftAlreadyDisputedException extends DomainException {
  readonly code = 'shift.already_disputed';

  constructor() {
    super(HttpStatus.CONFLICT, 'Ca đã bị khiếu nại');
  }
}

export class ShiftNotDisputedException extends DomainException {
  readonly code = 'shift.not_disputed';

  constructor(status: string) {
    super(HttpStatus.CONFLICT, 'Ca này không ở trạng thái khiếu nại', { status });
  }
}

export class ShiftEvidenceIncompleteException extends DomainException {
  readonly code = 'shift.evidence_incomplete';

  constructor(missing: readonly string[]) {
    super(HttpStatus.BAD_REQUEST, 'Thiếu ảnh hoặc biên lai', { missing: [...missing] });
  }
}

export class FieldTokenExpiredException extends DomainException {
  readonly code = 'token.expired';

  constructor() {
    super(HttpStatus.UNAUTHORIZED, 'Liên kết đã hết hạn');
  }
}

export class FieldTokenInvalidException extends DomainException {
  readonly code = 'token.invalid';

  constructor() {
    super(HttpStatus.UNAUTHORIZED, 'Liên kết không hợp lệ');
  }
}

export class FieldTokenAlreadyUsedException extends DomainException {
  readonly code = 'token.already_used';

  constructor() {
    super(HttpStatus.UNAUTHORIZED, 'Liên kết này đã được sử dụng');
  }
}

export class StatementPeriodIncompleteException extends DomainException {
  readonly code = 'statement.period_incomplete';

  constructor(shiftIds: readonly number[]) {
    super(HttpStatus.CONFLICT, 'Còn ca chưa đủ bằng chứng hoặc đang khiếu nại', { shift_ids: [...shiftIds] });
  }
}

export class StatementAlreadyExistsException extends DomainException {
  readonly code = 'statement.already_exists';

  constructor(statementId: number) {
    super(HttpStatus.CONFLICT, 'Bảng kê kỳ này đã tồn tại', { statement_id: statementId });
  }
}

export class StatementImmutableException extends DomainException {
  readonly code = 'statement.immutable';

  constructor(status: string) {
    super(HttpStatus.CONFLICT, 'Bảng kê đã chốt, không thể sửa', { status });
  }
}

export class StatementNotIssuedException extends DomainException {
  readonly code = 'statement.not_issued';

  constructor(status: string) {
    super(HttpStatus.CONFLICT, 'Chưa xuất PDF', { status });
  }
}

export class DashboardConflictingPeriodException extends DomainException {
  readonly code = 'dashboard.conflicting_period';

  constructor() {
    super(HttpStatus.BAD_REQUEST, 'Pass either month, or from/to — not both.');
  }
}

export class AlertChannelUnavailableException extends DomainException {
  readonly code = 'alert.channel_unavailable';

  constructor() {
    super(HttpStatus.BAD_GATEWAY, 'Không gửi được qua Zalo/SMS, đã chuyển sang nhắc trong ứng dụng');
  }
}

export class StorageUnavailableException extends DomainException {
  readonly code = 'storage.unavailable';

  constructor() {
    super(HttpStatus.SERVICE_UNAVAILABLE, 'Kho ảnh chưa được cấu hình');
  }
}

export class UploadUnsupportedTypeException extends DomainException {
  readonly code = 'upload.unsupported_type';

  constructor(contentType: string) {
    super(HttpStatus.BAD_REQUEST, 'Định dạng ảnh không được hỗ trợ', { content_type: contentType });
  }
}

export class UploadKeyUnknownException extends DomainException {
  readonly code = 'upload.key_unknown';

  constructor(keys: readonly string[]) {
    super(HttpStatus.BAD_REQUEST, 'Ảnh tải lên không thuộc ca làm việc này', { keys: [...keys] });
  }
}

export class ValidationFailedException extends DomainException {
  readonly code = VALIDATION_FAILED_CODE;

  constructor(fields: readonly FieldViolation[]) {
    super(HttpStatus.BAD_REQUEST, 'Dữ liệu không hợp lệ', { fields: [...fields] });
  }
}
