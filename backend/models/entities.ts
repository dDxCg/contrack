import { Alert } from './alerts/alert.entity';
import { ContractCost } from './contract-costs/contract-cost.entity';
import { Contract } from './contracts/contract.entity';
import { ContractItem } from './contracts/contract-item.entity';
import { ContractSite } from './contracts/contract-site.entity';
import { Customer } from './customers/customer.entity';
import { Employee } from './employees/employee.entity';
import { AlertDeliveryStatusLookup } from './lookups/alert-delivery-status.entity';
import { AlertKindLookup } from './lookups/alert-kind.entity';
import { ContractStatusLookup } from './lookups/contract-status.entity';
import { CostCategoryLookup } from './lookups/cost-category.entity';
import { CustomerSegmentLookup } from './lookups/customer-segment.entity';
import { EmployeeStatusLookup } from './lookups/employee-status.entity';
import { FrequencyUnitLookup } from './lookups/frequency-unit.entity';
import { PhotoTypeLookup } from './lookups/photo-type.entity';
import { RoleLookup } from './lookups/role.entity';
import { ShiftStatusLookup } from './lookups/shift-status.entity';
import { StatementStatusLookup } from './lookups/statement-status.entity';
import { TenantStatusLookup } from './lookups/tenant-status.entity';
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
  TenantStatusLookup,
  RoleLookup,
  CustomerSegmentLookup,
  EmployeeStatusLookup,
  ContractStatusLookup,
  ShiftStatusLookup,
  FrequencyUnitLookup,
  CostCategoryLookup,
  PhotoTypeLookup,
  AlertKindLookup,
  AlertDeliveryStatusLookup,
  StatementStatusLookup,
] as const;
