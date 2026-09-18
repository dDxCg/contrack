# Contrack — Repository Layout

## Backend
```
backend/
├── main.ts
├── app.module.ts
├── package.json
├── tsconfig.json
├── controllers/            # one subfolder per domain, mirrored across controllers/services/dtos/models/repositories
│   ├── auth/auth.controller.ts
│   ├── platform/           # M7, not yet implemented
│   │   ├── PlatformAuthController
│   │   ├── TenantsController
│   │   └── PlatformDashboardController
│   ├── contracts/contracts.controller.ts
│   ├── shifts/shifts.controller.ts
│   ├── field/field.controller.ts
│   ├── statements/
│   │   ├── statements.controller.ts
│   │   └── reconciliation.controller.ts
│   ├── contract-costs/contract-costs.controller.ts
│   ├── alerts/alerts.controller.ts
│   ├── dashboard/dashboard.controller.ts
│   ├── customers/customers.controller.ts
│   ├── employees/employees.controller.ts
│   └── teams/teams.controller.ts
├── dtos/
│   ├── page-query.dto.ts   # shared, stays at dtos root
│   ├── auth/auth.dto.ts, auth.response.dto.ts
│   ├── contracts/contracts.dto.ts, contracts.response.dto.ts
│   ├── customers/customers.dto.ts, customers.response.dto.ts
│   ├── employees/employees.dto.ts, employees.response.dto.ts
│   ├── teams/teams.dto.ts, teams.response.dto.ts
│   ├── shifts/shifts.dto.ts, shifts.response.dto.ts
│   ├── field/field.dto.ts, field.response.dto.ts
│   ├── statements/statements.dto.ts, statements.response.dto.ts
│   ├── contract-costs/contract-costs.dto.ts, contract-costs.response.dto.ts
│   ├── alerts/alerts.response.dto.ts
│   └── dashboard/dashboard.dto.ts, dashboard.response.dto.ts
├── services/
│   ├── auth/auth.service.ts, token.service.ts, password-hasher.service.ts
│   ├── platform/           # M7, not yet implemented
│   │   ├── TenantService
│   │   └── PlatformDashboardService
│   ├── customers/customer.service.ts
│   ├── employees/employee.service.ts
│   ├── teams/team.service.ts
│   ├── contracts/contract.service.ts, schedule-generator.service.ts
│   ├── shifts/dispatch.service.ts, dispute.service.ts
│   ├── field/field-token.service.ts, field-link.service.ts, field-submission.service.ts
│   ├── statements/statement.service.ts, reconciliation.service.ts
│   ├── contract-costs/contract-cost.service.ts, cost-estimation.service.ts, contract-profitability.service.ts
│   ├── alerts/alert-job.service.ts, alert.service.ts
│   ├── dashboard/dashboard.service.ts
│   └── access-control/     # cross-cutting, not a resource domain — stays flat
│       ├── access-context.ts
│       ├── auth.config.ts
│       ├── clock.ts
│       ├── access.decorator.ts
│       ├── access-control.guard.ts
│       ├── domain-exception.filter.ts
│       ├── tenant-resolver.ts
│       ├── role-resolver.ts
│       └── scope-resolver.ts
├── repositories/
│   ├── tenant-scoped.repository.ts   # base class, stays at repositories root
│   ├── tenants/tenant.repository.ts
│   ├── customers/customer.repository.ts
│   ├── employees/employee.repository.ts
│   ├── teams/team.repository.ts
│   ├── contracts/contract.repository.ts, contract-site.repository.ts, contract-item.repository.ts
│   ├── shifts/shift.repository.ts, shift-photo.repository.ts
│   ├── statements/statement.repository.ts
│   ├── contract-costs/contract-cost.repository.ts
│   └── alerts/alert.repository.ts
├── models/
│   ├── domain-errors.ts     # single §9 error catalogue, stays at models root
│   ├── tenants/tenant.entity.ts
│   ├── employees/employee.entity.ts
│   ├── customers/customer.entity.ts
│   ├── teams/team.entity.ts
│   ├── contracts/contract.entity.ts, contract-site.entity.ts, contract-item.entity.ts
│   ├── shifts/shift.entity.ts, shift-photo.entity.ts
│   ├── statements/statement.entity.ts
│   ├── contract-costs/contract-cost.entity.ts
│   ├── alerts/alert.entity.ts
│   └── platform/PlatformAdmin   # M7, not yet implemented
├── data/
│   ├── db-context/data-source.ts
│   ├── migrations/
│   ├── object-storage-client/
│   ├── channel-client/
│   │   ├── channel-client.ts
│   │   └── null-channel-client.ts
│   └── pdf-renderer/
├── utils/
│   └── period.ts
└── tests/
    ├── unit/
    └── support/
```

## Frontend

```
frontend/
├── src/
│   ├── assets/
│   │   ├── images
│   │   ├── icons
│   │   └── fonts
│   ├── components/
│   │   ├── EvidenceViewer
│   │   ├── ScheduleTable
│   │   ├── AlertList
│   │   ├── Form
│   │   ├── Table
│   │   └── Button
│   ├── layouts/
│   │   ├── AuthenticatedLayout
│   │   ├── FieldLayout
│   │   └── AuthLayout
│   ├── pages/
│   │   ├── Login
│   │   ├── Contracts
│   │   ├── ContractCreate
│   │   ├── ContractDetail
│   │   ├── Dispatch
│   │   ├── ShiftDetail
│   │   ├── DisputeCreate
│   │   ├── Alerts
│   │   ├── Statements
│   │   ├── StatementPreview
│   │   ├── Reconciliation
│   │   ├── ContractCosts
│   │   ├── Dashboard
│   │   ├── Employees
│   │   ├── Teams
│   │   ├── Customers
│   │   ├── Field
│   │   ├── PlatformDashboard
│   │   └── Tenants
│   ├── hooks/
│   │   ├── useAuth
│   │   ├── useRole
│   │   ├── useContracts
│   │   ├── useShifts
│   │   ├── useStatements
│   │   └── useAlerts
│   ├── services/
│   │   ├── authService
│   │   ├── contractService
│   │   ├── shiftService
│   │   ├── fieldService
│   │   ├── statementService
│   │   ├── reconciliationService
│   │   ├── contractCostService
│   │   ├── alertService
│   │   ├── dashboardService
│   │   ├── customerService
│   │   ├── employeeService
│   │   ├── teamService
│   │   └── platformService
│   ├── types/
│   │   ├── Customer
│   │   ├── Contract
│   │   ├── Shift
│   │   ├── Statement
│   │   ├── ContractCost
│   │   ├── Employee
│   │   ├── Team
│   │   ├── Tenant
│   │   └── Common
│   ├── routes/
│   │   └── AppRoutes
│   ├── context/
│   │   └── AuthContext
│   └── utils/
├── dist/
└── public/
```
