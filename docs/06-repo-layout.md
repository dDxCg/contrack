# LichHD — Repository Layout

## Backend

```
backend/
├── Controllers/
│   ├── AuthController
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
│   ├── CustomersController
│   ├── EmployeesController
│   └── TeamsController
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
│   ├── CustomerService
│   ├── EmployeeService
│   ├── TeamService
│   └── AccessControl
│       ├── TenantResolver
│       ├── RoleResolver
│       └── ScopeResolver
├── Repositories/
│   ├── TenantRepository
│   ├── ContractRepository
│   ├── ContractSiteRepository
│   ├── ContractItemRepository
│   ├── ShiftRepository
│   ├── ShiftPhotoRepository
│   ├── StatementRepository
│   ├── ContractCostRepository
│   ├── EmployeeRepository
│   ├── TeamRepository
│   └── CustomerRepository
├── Models/
│   ├── Tenant
│   ├── PlatformAdmin
│   ├── Customer
│   ├── Contract
│   ├── ContractSite
│   ├── ContractItem
│   ├── Shift
│   ├── ShiftPhoto
│   ├── Statement
│   ├── ContractCost
│   ├── Employee
│   └── Team
└── Data/
    ├── DbContext
    ├── Migrations
    ├── ObjectStorageClient
    ├── ChannelClient
    └── PdfRenderer
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
