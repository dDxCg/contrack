import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  AuthForbiddenRoleException,
  AuthInvalidCredentialsException,
  AuthOutOfScopeException,
  DomainException,
  EmployeeManagerCycleException,
  TeamHasMembersException,
  TeamLeadConflictException,
  ValidationFailedException,
  toErrorEnvelope,
} from '../../../models/domain-errors';

describe('domain errors', () => {
  describe('toErrorEnvelope — one envelope for the whole catalogue (05-api.md §1, §9)', () => {
    it('maps a domain exception to its own code, message and details', () => {
      const envelope = toErrorEnvelope(new TeamLeadConflictException(31));

      expect(envelope.status).toBe(409);
      expect(envelope.body).toEqual({
        error: { code: 'team.lead_conflict', message: 'Tổ đã có tổ trưởng', details: { employee_id: 31 } },
      });
    });

    it('carries the catalogue details through unchanged', () => {
      const teamHasMembers = toErrorEnvelope(new TeamHasMembersException([31, 40]));
      const managerCycle = toErrorEnvelope(new EmployeeManagerCycleException([12, 31, 12]));

      expect(teamHasMembers.body.error.details).toEqual({ employee_ids: [31, 40] });
      expect(managerCycle.body).toEqual({
        error: {
          code: 'employee.manager_cycle',
          message: 'Sẽ tạo vòng lặp quản lý',
          details: { path: [12, 31, 12] },
        },
      });
    });

    it('keeps an empty details object rather than omitting it', () => {
      const envelope = toErrorEnvelope(new AuthOutOfScopeException());

      expect(envelope.status).toBe(404);
      expect(envelope.body).toEqual({
        error: { code: 'auth.out_of_scope', message: 'Không tìm thấy dữ liệu', details: {} },
      });
    });

    it('names the roles that hold the operation', () => {
      const envelope = toErrorEnvelope(new AuthForbiddenRoleException(['director', 'manager']));

      expect(envelope.status).toBe(403);
      expect(envelope.body.error).toEqual({
        code: 'auth.forbidden_role',
        message: 'Vai trò của bạn không có quyền thao tác này',
        details: { required_role: 'director, manager' },
      });
    });

    it('maps validation failures to 400 validation.failed with the offending fields', () => {
      const envelope = toErrorEnvelope(
        new ValidationFailedException([{ field: 'name', message: 'name must be a string' }]),
      );

      expect(envelope.status).toBe(400);
      expect(envelope.body.error.code).toBe('validation.failed');
      expect(envelope.body.error.details).toEqual({
        fields: [{ field: 'name', message: 'name must be a string' }],
      });
    });

    it('derives a code from the status for a transport-level refusal', () => {
      const envelope = toErrorEnvelope(new NotFoundException('Cannot GET /api/v1/nope'));

      expect(envelope.status).toBe(404);
      expect(envelope.body.error.code).toBe('http.404');
      expect(envelope.body.error.details).toEqual({});
    });

    it('never leaks an unexpected failure', () => {
      const envelope = toErrorEnvelope(new Error('connection refused by postgres'));

      expect(envelope.status).toBe(500);
      expect(envelope.body).toEqual({
        error: { code: 'internal.error', message: 'Lỗi hệ thống', details: {} },
      });
    });

    it('treats a non-HttpException object as an unexpected failure', () => {
      expect(toErrorEnvelope('boom').body.error.code).toBe('internal.error');
    });

    it('handles a plain BadRequestException thrown by a transport layer', () => {
      const envelope = toErrorEnvelope(new BadRequestException());

      expect(envelope.status).toBe(400);
      expect(envelope.body.error.code).toBe('http.400');
    });
  });

  describe('catalogue codes and statuses (05-api.md §9)', () => {
    it.each([
      [new AuthInvalidCredentialsException(), 401, 'auth.invalid_credentials'],
      [new AuthOutOfScopeException(), 404, 'auth.out_of_scope'],
    ])('maps %s', (exception, status, code) => {
      expect(exception.getStatus()).toBe(status);
      expect(exception.code).toBe(code);
      expect(exception).toBeInstanceOf(DomainException);
    });
  });
});
