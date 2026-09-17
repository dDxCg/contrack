# LichHD — Design Analysis

## I: Requirements Analysis

### User Stories
| As a... | I want to... | So that... | Acceptance criteria |
|---|---|---|---|
| Team lead | know which shifts my team owes this week without chasing anyone for it | I can assign work the moment the week starts | The week's shift list reaches the team lead by Monday morning, scoped to their own team |
| Employee | leave proof that I actually did the visit | I'm protected if a customer disputes it later | A shift only reaches `completed` once before/after photos and the signed receipt are submitted, with location and time recorded |
| Manager | know a contract is about to expire before it does | I can start the renewal conversation in time | Alert fires once per contract, 30 days before expiry |
| Manager | know a visit was missed before the customer tells me | I can fix it before it becomes a complaint | Alert fires the moment a shift passes its due date uncompleted |
| Accountant | close a contract's month without reassembling evidence by hand | I can send the customer a statement in minutes, not days | One action produces the full PDF; a period with incomplete evidence is blocked and lists exactly which shifts are missing it |
| Director | see the state of every contract without asking staff for a status update | I catch a revenue or delivery problem myself, before it reaches me as a complaint | One view shows active, expiring and disputed contract counts plus projected revenue, current as of the underlying data |
| Manager | set up a new contract with its sites and service items in one pass | the shift schedule generates itself instead of me building a calendar by hand | Saving a contract with at least one site and one service item immediately produces the full set of scheduled shifts |
| Team lead | swap the assignee or date on a shift when someone's out or a site asks to move | the week still gets covered without waiting on a manager | Reassign/reschedule succeeds on any shift not yet completed and is rejected once it is |
| Manager | flag a shift as disputed the moment a customer complains | the complaint is tied to the actual evidence instead of living in someone's memory | A disputed shift keeps its photos/receipt/GPS and shows a reason, separate from a normal completed shift |
| Director | manage employee accounts, roles and manager assignment myself | access always matches who's actually on staff, without waiting on IT | Creating, editing or deactivating an employee takes effect on their next request, no redeploy needed |
| Director | see what's billed against what actually got done, per contract and period | I catch billing drift before it reaches the customer as a dispute | Reconciliation view lists shifts due by frequency next to shifts with complete evidence, per contract per period |
| Director | know which contracts are profitable and which are losing money, without waiting on the Accountant to close the month | I catch a bad contract before renewing it, and the dashboard never shows a gap | Profit/loss per contract, per month, is revenue from `contract_items` minus that month's recorded labor/materials/other costs — or, before the Accountant records them, an estimate clearly marked as such |
| Accountant | record labor and materials costs against a contract each month | the Director's profit/loss numbers are accurate, not guessed | Saving a cost entry (category, month, amount) updates that contract's profit/loss for that month immediately |
| Platform Admin | onboard a new operating company with its first Director account | a new customer of LichHD itself can start working without me touching the database | Creating a tenant immediately produces one active Director login, scoped to that tenant only |

### Functional Requirements

| # | Role | Requirement |
|---|---|---|
| FR1 | Manager, Director | Create a contract for a customer with a signed date and expiry date. Update/delete: Director only |
| FR2 | Manager, Director | Add one or more sites to a contract. Update/delete: Director only |
| FR3 | Manager, Director | Add service items to a site (name, frequency, unit price). Update/delete: Director only |
| FR4 | System | Auto-generate the shift schedule from each service item's frequency |
| FR5 | System | Auto-push the current week's shifts to each team lead |
| FR6 | Team Lead | Reassign or reschedule a shift when a conflict arises |
| FR7 | Employee | Open an assigned shift via a phone link, no app install |
| FR8 | Employee | Submit before/after photos for a shift |
| FR9 | Employee | Submit the signed paper receipt photo as evidence |
| FR10 | System | Capture GPS coordinates and timestamp automatically on submission |
| FR11 | Manager, Director | Mark a shift as disputed and record the reason |
| FR12 | System | Alert when a contract is within 30 days of expiry |
| FR13 | System | Alert when a shift has not been completed at the contract's required frequency |
| FR14 | System | Send alerts via Zalo (ZNS) and/or SMS |
| FR15 | Accountant | Generate a monthly statement per contract from its completed shifts |
| FR16 | Accountant | Export a statement as PDF with photos and receipts attached |
| FR17 | Director | View dashboard: active/expiring/disputed contract counts, projected revenue, late/missed shifts by month, on-time renewal rate, cancellation rate, new contracts signed by month, profit/loss trend — filterable by month |
| FR18 | Director | Read, create, update or delete employee accounts, including role and manager assignment |
| FR19 | Accountant | Send an exported statement to the customer, marking it sent |
| FR20 | Accountant, Director | View reconciliation: shifts due by frequency vs. shifts with complete evidence, per contract per period |
| FR21 | Manager, Director | Create or update a customer record (name, contact, address, segment). Delete: Director only, blocked while the customer holds a non-terminated contract |
| FR22 | Director, Accountant, Manager, Team Lead, Employee | Sign in with an email and password; the session carries the account's tenant, role and row scope for every later request |
| FR23 | Platform Admin | Create a new tenant (operating company) with its first Director account | 
| FR24 | Platform Admin | Suspend or reactivate a tenant; a suspended tenant's accounts can't sign in |
| FR25 | Platform Admin | View platform dashboard: tenant counts by status, recent onboarding activity, tenant growth trend |
| FR26 | Accountant | Record or update a contract's monthly cost (category: labor, materials, other) |
| FR27 | Director, Accountant | View profit/loss per contract per month: revenue from `contract_items` minus that month's recorded or estimated cost |
| FR28 | System | Estimate a contract's month cost when the Accountant hasn't recorded it yet — trailing 3-month average of that contract's own recorded costs, or the tenant's average cost-to-revenue ratio if the contract has no recorded cost history — so FR17/FR27 never show a gap for an unclosed month |

### Non-Functional Requirements

| # | Category | Requirement |
|---|---|---|
| NFR1 | Performance | Field pages (photo capture) must load on weak 3G/4G connections at job sites |
| NFR2 | Integrity | Evidence data (photos, GPS, timestamp) is non-editable once captured |
| NFR3 | Security | Role-based access control: director, accountant, manager, team lead, employee |
| NFR4 | Retention | Photos and signed receipts retained at least 12 months |
| NFR5 | Portability | Statements exportable as PDF; raw data exportable as CSV/Excel |
| NFR6 | Scalability | Multi-tenant deployment — one shared deployment serves many operating companies (tenants); a tenant's data is never readable or writable by another tenant |
| NFR7 | Usability | No native app install; access via a shared web link on any phone |

---

## II: Use Cases

```mermaid
---
config:
  flowchart:
    nodeSpacing: 22
    rankSpacing: 45
    padding: 8
    subGraphTitleMargin: { top: 4, bottom: 4 }
---
flowchart LR
    Employee((Employee))
    TeamLead((Team Lead))

    subgraph LichHD["LichHD"]
        direction LR
        subgraph DirectorBox[" "]
            D_Login([Login])
            D_View([View shifts])
            D_Contract([Manage contract])
            D_Schedule([Generate schedule])
            D_Customer([Manage customer])
            D_Dispute([Mark disputed])
            D_Evidence([Review evidence])
            D_Reconcile([Reconcile])
            D_Account([Manage account])
            D_Dashboard([View dashboard])
        end
        subgraph AccountantBox[" "]
            A_Login([Login])
            A_Export([Export statement])
            A_GenStmt([Generate statement data])
            A_Send([Send statement])
            A_Reconcile([Reconcile])
        end
        subgraph ManagerBox[" "]
            M_Login([Login])
            M_View([View shifts])
            M_Contract([Manage contract])
            M_Schedule([Generate schedule])
            M_Customer([Manage customer])
            M_Dispute([Mark disputed])
            M_Evidence([Review evidence])
        end
        subgraph TeamLeadBox[" "]
            T_Login([Login])
            T_View([View shifts])
            T_Reassign([Reassign / reschedule])
        end
        subgraph EmployeeBox[" "]
            E_Login([Login])
            E_View([View shifts])
            E_Complete([Complete shift])
            E_Photos([Before / after photos])
            E_Receipt([Signed receipt photo])
            E_GPS([Capture GPS &amp; timestamp])
        end
    end

    Manager((Manager))
    Accountant((Accountant))
    Director((Director))

    Employee --- EmployeeBox
    TeamLead --- TeamLeadBox
    ManagerBox --- Manager
    AccountantBox --- Accountant
    DirectorBox --- Director

    E_Complete -.->|"&laquo;include&raquo;"| E_Photos
    E_Complete -.->|"&laquo;include&raquo;"| E_Receipt
    E_Complete -.->|"&laquo;include&raquo;"| E_GPS
    D_Login ~~~ D_Reconcile
    D_View ~~~ D_Account
    D_Customer ~~~ D_Dashboard

    M_Contract -.->|"&laquo;include&raquo;"| M_Schedule
    M_Dispute -.->|"&laquo;include&raquo;"| M_Evidence
    D_Contract -.->|"&laquo;include&raquo;"| D_Schedule
    D_Dispute -.->|"&laquo;include&raquo;"| D_Evidence
    A_Export -.->|"&laquo;include&raquo;"| A_GenStmt

    classDef box fill:#f8fafc,stroke:#94a3b8,color:#0f172a
    class LichHD,EmployeeBox,TeamLeadBox,ManagerBox,AccountantBox,DirectorBox box
    classDef actor fill:#f1f5f9,stroke:#64748b,color:#0f172a
    classDef uc fill:#dbeafe,stroke:#1d4ed8,color:#0f172a
    classDef inc fill:#f8fafc,stroke:#1d4ed8,color:#0f172a,stroke-dasharray: 5 5
    classDef incReq fill:#f8fafc,stroke:#1d4ed8,color:#0f172a
    class Employee,TeamLead,Manager,Accountant,Director actor
    class E_Login,E_View,E_Complete,T_Login,T_View,T_Reassign,M_Login,M_View,M_Contract,M_Customer,M_Dispute,A_Login,A_Export,A_Send,A_Reconcile,D_Login,D_View,D_Contract,D_Customer,D_Dispute,D_Reconcile,D_Account,D_Dashboard uc
    class M_Schedule,M_Evidence,D_Schedule,D_Evidence,A_GenStmt inc
    class E_Photos,E_Receipt,E_GPS incReq
```
---
## III: Class Diagram

Design-level: attributes are private with a type, methods are public with parameter and
return types. Trivial getters are omitted by convention — a field with no listed accessor
is read through the object that owns it, not exposed for direct mutation.

```mermaid
classDiagram
    class Tenant {
        -id: int
        -name: string
        -status: TenantStatus
    }
    class Customer {
        -id: int
        -name: string
        -companyName: string
        -contact: string
        -address: string
        -segment: CustomerSegment
    }
    class Contract {
        -id: int
        -signedAt: Date
        -expiresAt: Date
        -status: ContractStatus
        +addSite(site: ContractSite) void
        +generateSchedule() void
    }
    class ContractSite {
        -id: int
        -name: string
        -workRequirements: string
        -notes: string
        +addItem(item: ContractItem) void
    }
    class ContractItem {
        -id: int
        -name: string
        -frequency: string
        -unitPrice: decimal
        +generateShifts(term: DateRange) Shift[]
    }
    class Shift {
        -id: int
        -scheduledDate: Date
        -status: ShiftStatus
        -completedAt: DateTime
        -latitude: decimal
        -longitude: decimal
        -capturedAt: DateTime
        -receiptPhotoUrl: string
        +complete(photos: Photo[], receipt: Photo, gps: GpsPoint) void
        +dispute(reason: string) void
        +resolveDispute() void
        +reassign(employee: Employee) void
        +reschedule(date: Date) void
    }
    class ShiftPhoto {
        -id: int
        -type: PhotoType
        -url: string
        -capturedAt: DateTime
    }
    class Statement {
        -id: int
        -period: Date
        -totalAmount: decimal
        -status: StatementStatus
        -pdfUrl: string
        +compute(shifts: Shift[]) void
        +export() void
        +send() void
    }
    class Employee {
        -id: int
        -name: string
        -email: string
        -role: Role
        -status: EmployeeStatus
    }
    class Team {
        -id: int
        -name: string
        -code: string
        +lead() Employee
        +memberCount() int
    }
    class ContractCost {
        -id: int
        -category: CostCategory
        -period: Date
        -amount: decimal
    }

    Customer "1" --> "0..*" Contract
    Contract "1" *-- "1..*" ContractSite
    ContractSite "1" *-- "1..*" ContractItem
    ContractItem "1" --> "0..*" Shift : generates
    Shift "1" *-- "0..*" ShiftPhoto
    Contract "1" --> "0..*" Statement
    Contract "1" --> "0..*" ContractCost
    Employee "1" --> "0..*" ContractCost : recorded by
    Employee "1" --> "0..*" Shift : assignee
    Employee "0..1" --> "0..*" Employee : manager
    Team "0..1" --> "0..*" Employee : members
    Tenant "1" --> "0..*" Customer
    Tenant "1" --> "0..*" Employee
    Tenant "1" --> "0..*" Team
    Tenant "1" --> "0..*" Contract
```
---

## IV: Sequence Diagrams

### 1. Create contract with sites and service items

```mermaid
sequenceDiagram
    autonumber
    actor Manager
    participant System
    participant DB as Database

    Manager->>System: Submit new contract (customer, term, sites, items)
    System->>DB: INSERT contracts, contract_sites, contract_items
    System->>System: Validate frequency + unit price per item
    alt validation passed
        System->>System: Generate shift schedule from each item's frequency
        System->>DB: INSERT shifts (scheduled_date, status = scheduled)
        System-->>Manager: Contract created, schedule generated
    else validation failed
        System-->>Manager: Reject (missing frequency / invalid price)
    end
```

### 2. Weekly dispatch and field shift execution

```mermaid
sequenceDiagram
    autonumber
    participant System
    actor TeamLead as Team Lead
    actor Employee
    actor Customer
    participant DB as Database

    System->>TeamLead: Push this week's shift list (Monday)
    TeamLead->>Employee: Assign shift
    Employee->>System: Open shift link on phone
    Employee->>System: Submit before / after photos
    Customer->>Employee: Sign paper receipt
    Employee->>System: Submit photo of signed receipt
    System->>System: Capture GPS + timestamp
    alt GPS signal available
        System->>DB: UPDATE shifts SET status = completed, latitude, longitude, captured_at, receipt_photo_url
        System->>DB: INSERT shift_photos (before, after)
        System-->>Employee: Shift marked completed
    else no GPS signal
        System->>DB: UPDATE shifts SET status = completed, latitude = NULL, longitude = NULL
        System-->>Employee: Shift completed, flagged for missing location
    end
    Note over Employee: Keeps original paper receipt for filing
```

### 3. Dispute a shift

```mermaid
sequenceDiagram
    autonumber
    actor Manager
    participant System
    participant DB as Database

    Manager->>System: Fetch shift evidence
    System->>DB: SELECT shift + shift_photos
    DB-->>System: Evidence
    System-->>Manager: Photos, receipt, GPS, timestamp
    alt evidence supports the visit
        Manager->>System: Confirm visit valid
        System-->>Manager: Dispute dismissed
    else evidence is insufficient
        Manager->>System: Mark shift as disputed
        System->>DB: UPDATE shifts SET status = disputed
        System-->>Manager: Excluded from next statement until resolved
    end
```

### 4. Alerts: expiring contract and missed shift

```mermaid
sequenceDiagram
    autonumber
    participant Scheduler as System (daily job)
    participant DB as Database
    participant Channel as Zalo / SMS Gateway
    actor Director
    actor TeamLead as Team Lead

    Scheduler->>DB: Query contracts WHERE expires_at <= today + 30 days
    DB-->>Scheduler: Contracts expiring soon
    Scheduler->>DB: Query shifts overdue vs. item frequency
    DB-->>Scheduler: Missed shifts
    Scheduler->>Channel: Send alerts (expiry list, missed-shift list)
    alt channel available
        Channel-->>Director: "N contracts expiring in 30 days"
        Channel-->>TeamLead: "Shift at site X not completed"
        Channel-->>Scheduler: Delivery confirmed
    else channel unavailable
        Channel-->>Scheduler: Delivery failed
        Scheduler->>Director: Fallback in-app / email reminder
        Scheduler->>TeamLead: Fallback in-app / email reminder
    end
```

### 5. Month-end statement export 

```mermaid
sequenceDiagram
    autonumber
    actor Accountant
    participant System
    participant DB as Database
    actor Customer

    Accountant->>System: Request monthly statement for a contract
    System->>DB: Query completed shifts + shift_photos for the period
    DB-->>System: Shifts, photos, receipts
    alt all shifts in period have complete evidence
        System->>System: Compute total_amount from contract_items unit_price
        System->>DB: INSERT statements (period, total_amount, status = draft)
        System->>System: Render PDF with photos + signed receipts attached
        System->>DB: UPDATE statements SET status = issued, pdf_url
        System-->>Accountant: Statement ready
        Accountant->>Customer: Send PDF statement
        Accountant->>System: Confirm sent
        System->>DB: UPDATE statements SET status = sent
    else a shift is missing evidence or still disputed
        System-->>Accountant: Cannot close period, list incomplete shifts
    end
```

---

## V: System Design

Subsystem decomposition, deployment, persistent data, concurrency, external integrations:
[`04-architecture.md`](04-architecture.md).

---
