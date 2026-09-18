import { Alert } from './alerts/alert.entity';
import { ContractCost } from './contract-costs/contract-cost.entity';
import { Contract } from './contracts/contract.entity';
import { ContractItem } from './contracts/contract-item.entity';
import { ContractSite } from './contracts/contract-site.entity';
import { Customer } from './customers/customer.entity';
import { Employee } from './employees/employee.entity';
import { PlatformAdmin } from './platform/platform-admin.entity';
import { Shift } from './shifts/shift.entity';
import { ShiftPhoto } from './shifts/shift-photo.entity';
import { Statement } from './statements/statement.entity';
import { Team } from './teams/team.entity';
import { Tenant } from './tenants/tenant.entity';
export const ENTITIES = [
  Tenant,
  Customer,
  Employee,
  Team,
  Contract,
  ContractSite,
  ContractItem,
  Shift,
  ShiftPhoto,
  Statement,
  ContractCost,
  Alert,
  PlatformAdmin,
] as const;
