import { Employee } from '../../models/employees/employee.entity';
import type { TokenClaims } from '../auth/token.service';
import { RowScope } from './row-scope';

export interface AccessContext {
  readonly tenantId: number;
  readonly employee: Employee;
  readonly scope: RowScope;
  readonly credential: TokenClaims;
}
