import { Employee } from '../../Models/employee.entity';
import type { TokenClaims } from '../token.service';
import { RowScope } from './row-scope';

export interface AccessContext {
  readonly tenantId: number;
  readonly employee: Employee;
  readonly scope: RowScope;
  readonly credential: TokenClaims;
}
