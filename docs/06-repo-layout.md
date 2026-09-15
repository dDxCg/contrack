# LichHD — Repository Layout

## Backend

```
backend/
├── Controllers/
│   ├── AuthController
│   ├── ContractsController
│   ├── ShiftsController
│   ├── FieldController
│   ├── StatementsController
│   ├── ReconciliationController
│   ├── AlertsController
│   ├── DashboardController
│   ├── CustomersController
│   ├── EmployeesController
│   └── TeamsController
├── Services/
│   ├── ContractService
│   ├── ScheduleGeneratorService
│   ├── DispatchService
│   ├── FieldSubmissionService
│   ├── DisputeService
│   ├── AlertJobService
│   ├── StatementService
│   ├── ReconciliationService
│   ├── DashboardService
│   ├── CustomerService
│   ├── EmployeeService
│   ├── TeamService
│   └── AccessControl
│       ├── RoleResolver
│       └── ScopeResolver
├── Repositories/
│   ├── ContractRepository
│   ├── ContractSiteRepository
│   ├── ContractItemRepository
│   ├── ShiftRepository
│   ├── ShiftPhotoRepository
│   ├── StatementRepository
│   ├── EmployeeRepository
│   ├── TeamRepository
│   └── CustomerRepository
├── Models/
│   ├── Customer
│   ├── Contract
│   ├── ContractSite
│   ├── ContractItem
│   ├── Shift
│   ├── ShiftPhoto
│   ├── Statement
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
│   │   ├── Dashboard
│   │   ├── Employees
│   │   ├── Teams
│   │   ├── Customers
│   │   └── Field
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
│   │   ├── alertService
│   │   ├── dashboardService
│   │   ├── customerService
│   │   ├── employeeService
│   │   └── teamService
│   ├── types/
│   │   ├── Customer
│   │   ├── Contract
│   │   ├── Shift
│   │   ├── Statement
│   │   ├── Employee
│   │   ├── Team
│   │   └── Common
│   ├── routes/
│   │   └── AppRoutes
│   ├── context/
│   │   └── AuthContext
│   └── utils/
├── dist/
└── public/
```
