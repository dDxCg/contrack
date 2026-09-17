# Contrack — Repository Layout

## Backend
```
backend/
├── main.ts
├── app.module.ts
├── package.json
├── tsconfig.json
├── Controllers/
│   ├── auth.controller.ts
│   ├── PlatformAuthController
│   ├── TenantsController
│   ├── PlatformDashboardController
│   ├── contracts.controller.ts
│   ├── shifts.controller.ts
│   ├── field.controller.ts
│   ├── StatementsController
│   ├── ReconciliationController
│   ├── ContractCostsController
│   ├── AlertsController
│   ├── DashboardController
│   ├── customers.controller.ts
│   ├── employees.controller.ts
│   └── teams.controller.ts
├── DTOs/
│   ├── auth.dto.ts
│   ├── contracts.dto.ts
│   ├── customers.dto.ts
│   ├── employees.dto.ts
│   ├── teams.dto.ts
│   ├── shifts.dto.ts
│   ├── field.dto.ts
│   └── page-query.dto.ts
├── Services/
│   ├── TenantService
│   ├── PlatformDashboardService
│   ├── AlertJobService
│   ├── StatementService
│   ├── ReconciliationService
│   ├── ContractProfitabilityService
│   ├── CostEstimationService
│   ├── DashboardService
│   ├── auth.service.ts
│   ├── token.service.ts
│   ├── password-hasher.service.ts
│   ├── customer.service.ts
│   ├── employee.service.ts
│   ├── team.service.ts
│   ├── contract.service.ts
│   ├── schedule-generator.service.ts
│   ├── dispatch.service.ts
│   ├── dispute.service.ts
│   ├── field-token.service.ts
│   ├── field-link.service.ts
│   ├── field-submission.service.ts
│   └── AccessControl/
│       ├── access-context.ts
│       ├── auth.config.ts
│       ├── clock.ts
│       ├── access.decorator.ts
│       ├── access-control.guard.ts
│       ├── domain-exception.filter.ts
│       ├── tenant-resolver.ts
│       ├── role-resolver.ts
│       └── scope-resolver.ts
├── Repositories/
│   ├── tenant-scoped.repository.ts
│   ├── tenant.repository.ts
│   ├── customer.repository.ts
│   ├── employee.repository.ts
│   ├── team.repository.ts
│   ├── contract.repository.ts
│   ├── contract-site.repository.ts
│   ├── contract-item.repository.ts
│   ├── shift.repository.ts
│   ├── shift-photo.repository.ts
│   ├── StatementRepository
│   └── ContractCostRepository
├── Models/
│   ├── domain-errors.ts
│   ├── tenant.entity.ts
│   ├── employee.entity.ts
│   ├── customer.entity.ts
│   ├── team.entity.ts
│   ├── contract.entity.ts
│   ├── contract-site.entity.ts
│   ├── contract-item.entity.ts
│   ├── shift.entity.ts
│   ├── shift-photo.entity.ts
│   ├── PlatformAdmin
│   ├── Statement
│   └── ContractCost
├── Data/
│   ├── DbContext/data-source.ts
│   ├── Migrations/
│   ├── ObjectStorageClient/
│   ├── ChannelClient/
│   └── PdfRenderer/
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
