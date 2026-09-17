# LichHD — Repository Layout

## Backend

NestJS + TypeORM. Names without a file extension are **planned** (M2–M6 of
`temp/draft/plan-tenant-api-nestjs.md`); every lowercase `*.ts` name below is implemented.

```
backend/
├── main.ts                       # bootstrap: Fastify, global prefix /api/v1, filter + pipe
├── app.module.ts                 # composition root wiring every folder below
├── package.json                  # build · start · dev · test · lint · format scripts
├── tsconfig.json                 # tsconfig.build.json · eslint.config.mjs · .prettierrc
├── Controllers/                  # NestJS @Controller; *.dto.ts sits beside its controller
│   ├── auth.controller.ts + auth.dto.ts
│   ├── PlatformAuthController
│   ├── TenantsController
│   ├── PlatformDashboardController
│   ├── ContractsController
│   ├── ShiftsController
│   ├── FieldController
│   ├── StatementsController
│   ├── ReconciliationController
│   ├── ContractCostsController
│   ├── AlertsController
│   ├── DashboardController
│   ├── customers.controller.ts + customers.dto.ts
│   ├── employees.controller.ts + employees.dto.ts
│   └── teams.controller.ts + teams.dto.ts
├── Services/
│   ├── TenantService
│   ├── PlatformDashboardService
│   ├── ContractService
│   ├── ScheduleGeneratorService
│   ├── DispatchService
│   ├── FieldSubmissionService
│   ├── DisputeService
│   ├── AlertJobService
│   ├── StatementService
│   ├── ReconciliationService
│   ├── ContractProfitabilityService
│   ├── CostEstimationService
│   ├── DashboardService
│   ├── auth.service.ts             # login · refresh · logout · me — FR22
│   ├── token.service.ts            # desk credential issue/verify/revoke (D3 covers field tokens)
│   ├── password-hasher.service.ts  # PASSWORD_HASHER token + bcryptjs implementation
│   ├── customer.service.ts
│   ├── employee.service.ts
│   ├── team.service.ts
│   └── AccessControl/
│       ├── access-context.ts       # { tenantId, employee, scope } — the first argument of every service call
│       ├── auth.config.ts          # AUTH_CONFIG token; env-driven secret and lifetimes
│       ├── clock.ts                # CLOCK token + IClock — server time is authoritative (D7)
│       ├── access.decorator.ts     # @Access(resource, operation) · @Public()
│       ├── access-control.guard.ts # resolves caller + role + scope before any service runs
│       ├── domain-exception.filter.ts # the single error-envelope mapper (05-api.md §9)
│       ├── tenant-resolver.ts      # caller's tenant_id — never read from a request body
│       ├── role-resolver.ts        # 05-api.md §8 matrix: role × resource × operation
│       └── scope-resolver.ts       # own · team · unit · all
├── Repositories/                 # TypeORM custom repositories — every query tenant-filtered (R7)
│   ├── tenant-scoped.repository.ts # abstract base: scopedTo() · scopedQuery() · lookupId()
│   ├── tenant.repository.ts        # the one exception: `tenants` has no tenant_id column
│   ├── customer.repository.ts
│   ├── employee.repository.ts
│   ├── team.repository.ts
│   ├── ContractRepository
│   ├── ContractSiteRepository
│   ├── ContractItemRepository
│   ├── ShiftRepository
│   ├── ShiftPhotoRepository
│   ├── StatementRepository
│   └── ContractCostRepository
├── Models/                       # TypeORM entity classes carrying their own invariants (§9)
│   ├── domain-errors.ts          # DomainException base + the 05-api.md §9 catalogue
│   ├── tenant.entity.ts
│   ├── employee.entity.ts        # + Role · EmployeeStatus
│   ├── customer.entity.ts        # + CustomerSegment
│   ├── team.entity.ts
│   ├── PlatformAdmin
│   ├── Contract
│   ├── ContractSite
│   ├── ContractItem
│   ├── Shift
│   ├── ShiftPhoto
│   ├── Statement
│   └── ContractCost
├── Data/
│   ├── DbContext/data-source.ts  # TypeORM DataSource — synchronize: false (C3)
│   ├── Migrations/               # points at docs/db/schema.sql — never TypeORM migrations
│   ├── ObjectStorageClient/
│   ├── ChannelClient/
│   └── PdfRenderer/
└── test/                         # cross-cutting end-to-end harness only
    ├── qr6-sweep.e2e-spec.ts     # QR6 — two seeded tenants, every directory endpoint
    └── support/                  # test app builder + in-memory repositories
```

Unit specs sit beside the class they cover (`*.spec.ts`); `test/` holds only tests that span the
whole HTTP surface. `main.ts` and `app.module.ts` are at the backend root because NestJS requires a
bootstrap entry point and a composition root there — everything else follows the tree above.

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
