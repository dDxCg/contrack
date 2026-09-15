# LichHD — Design Analysis

## I: Requirements Analysis

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
| FR17 | Director | View dashboard: active contracts, expiring contracts, disputed contracts, projected revenue |
| FR18 | Director | Read, create, update or delete employee accounts, including role and manager assignment |
| FR19 | Accountant | Send an exported statement to the customer, marking it sent |
| FR20 | Accountant, Director | View reconciliation: shifts due by frequency vs. shifts with complete evidence, per contract per period |
| FR21 | Manager, Director | Create or update a customer record (name, contact, address, segment). Delete: Director only, blocked while the customer holds a non-terminated contract |

### Non-Functional Requirements

| # | Category | Requirement |
|---|---|---|
| NFR1 | Performance | Field pages (photo capture) must load on weak 3G/4G connections at job sites |
| NFR2 | Integrity | Evidence data (photos, GPS, timestamp) is non-editable once captured |
| NFR3 | Security | Role-based access control: director, accountant, manager, team lead, employee |
| NFR4 | Retention | Photos and signed receipts retained at least 12 months |
| NFR5 | Portability | Statements exportable as PDF; raw data exportable as CSV/Excel |
| NFR6 | Scalability | Single-tenant deployment — no cross-company data isolation required |
| NFR7 | Usability | No native app install; access via a shared web link on any phone |

---

## II: Use Cases

### Employee

```mermaid
flowchart LR
    Employee((Employee))

    subgraph Boundary["LichHD"]
        UC3([Complete shift])
        UC4([Submit before / after photos])
        UC5([Submit signed receipt photo])
        UC6([View assigned shifts])
    end

    Employee --- UC3
    Employee --- UC6

    UC3 -.->|&laquo;include&raquo;| UC4
    UC3 -.->|"&laquo;include&raquo;"| UC5
```

### Team Lead

```mermaid
flowchart LR
    TeamLead((Team Lead))

    subgraph Boundary["LichHD"]
        UC6([View assigned shifts])
        UC7([Reassign / reschedule shift])
    end

    TeamLead --- UC6
    TeamLead --- UC7
```

### Manager

```mermaid
flowchart LR
    Manager((Manager))

    subgraph Boundary["LichHD"]
        UC6([View assigned shifts])
        UC9([Manage contract])
        UC9P(["Read, create"])
        UC17([Generate shift schedule])
        UC19([Review shift evidence])
        UC10([Mark shift as disputed])
        UC21([Manage customer])
        UC21P(["Read, create"])
    end

    Manager --- UC6
    Manager --- UC9
    Manager --- UC10
    Manager --- UC21

    UC9 -.->|"&laquo;include&raquo;"| UC9P
    UC9 -.->|"&laquo;include&raquo;"| UC17
    UC10 -.->|"&laquo;include&raquo;"| UC19
    UC21 -.->|"&laquo;include&raquo;"| UC21P
```

### Accountant

```mermaid
flowchart LR
    Accountant((Accountant))

    subgraph Boundary["LichHD"]
        UC12([Export monthly statement])
        UC13([Generate statement data])
        UC14([Reconcile billed vs completed shifts])
        UC20([Send statement to customer])
    end

    Accountant --- UC12
    Accountant --- UC14
    Accountant --- UC20

    UC12 -.->|"&laquo;include&raquo;"| UC13
```

### Director

```mermaid
flowchart LR
    Director((Director))

    subgraph Boundary["LichHD"]
        UC6([View assigned shifts])
        UC9([Manage contract])
        UC9P(["Read, create, update, delete"])
        UC17([Generate shift schedule])
        UC19([Review shift evidence])
        UC10([Mark shift as disputed])
        UC15([View dashboard])
        UC16([Manage account])
        UC16P(["Read, create, update, delete"])
        UC14([Reconcile billed vs completed shifts])
        UC21([Manage customer])
        UC21P(["Read, create, update, delete"])
    end

    Director --- UC6
    Director --- UC9
    Director --- UC10
    Director --- UC15
    Director --- UC16
    Director --- UC14
    Director --- UC21

    UC9 -.->|"&laquo;include&raquo;"| UC9P
    UC9 -.->|"&laquo;include&raquo;"| UC17
    UC16 -.->|"&laquo;include&raquo;"| UC16P
    UC10 -.->|"&laquo;include&raquo;"| UC19
    UC21 -.->|"&laquo;include&raquo;"| UC21P
```

### Use Case Descriptions

| Use case | Actor | Description | Precondition |
|---|---|---|---|
| Complete shift | Employee | Submit before/after photos and the signed receipt photo for an assigned shift; system captures GPS and timestamp | Shift is scheduled and assigned to the employee |
| View assigned shifts | Employee, Team Lead, Manager, Director | View the shift list, scoped by role: Employee sees own shifts, Team Lead sees the team's, Manager sees their managed unit's, Director sees all | User is authenticated |
| Reassign / reschedule shift | Team Lead | Change the assignee or date of a shift when a conflict arises | Shift exists and is not yet completed |
| Manage contract | Manager, Director | Read, create, update or delete a contract and its sites/service items (customer, term, frequency, price). Director holds all four (read/create/update/delete); Manager holds read/create only | Customer and contract terms are agreed offline |
| Mark shift as disputed | Manager, Director | Manually record a shift as disputed, based on a customer complaint received by phone or in person | Customer has reported an issue outside the system |
| Export monthly statement | Accountant | Export the monthly statement for a contract as PDF | A statement's underlying data has been generated for the period |
| Send statement to customer | Accountant | Record that an exported statement was sent to the customer | Statement has been exported |
| Reconcile billed vs completed shifts | Accountant, Director | Compare what a statement bills against the shifts actually completed | A statement exists for the period |
| View dashboard | Director | View active/expiring/disputed contracts and projected revenue | User is authenticated as director |
| Manage account | Director | Read, create, update or delete an employee account, including its role and manager assignment | User is authenticated as director |
| Manage customer | Manager, Director | Read, create, update or delete a customer record (name, contact, address, segment). Director holds all four; Manager holds read/create only | Deleting requires no non-terminated contract references the customer |

---

## III: Class Diagram

Design-level: attributes are private with a type, methods are public with parameter and
return types. Trivial getters are omitted by convention — a field with no listed accessor
is read through the object that owns it, not exposed for direct mutation.

```mermaid
classDiagram
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
        -username: string
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

    Customer "1" --> "0..*" Contract
    Contract "1" *-- "1..*" ContractSite
    ContractSite "1" *-- "1..*" ContractItem
    ContractItem "1" --> "0..*" Shift : generates
    Shift "1" *-- "0..*" ShiftPhoto
    Contract "1" --> "0..*" Statement
    Employee "1" --> "0..*" Shift : assignee
    Employee "0..1" --> "0..*" Employee : manager
    Team "0..1" --> "0..*" Employee : members
```
---

## IV: Activity Diagrams

### 1. Create contract with sites and service items 

```mermaid
stateDiagram-v2
    [*] --> Submitted: manager submits contract (customer, term, sites, items)
    Submitted --> Validating: validate frequency + unit price per item
    Validating --> Rejected: invalid
    Validating --> Inserted: valid
    Rejected --> [*]: missing frequency / invalid price
    Inserted --> ScheduleGenerated: generate shift schedule from each item's frequency
    ScheduleGenerated --> ShiftsCreated: insert shifts, status = scheduled
    ShiftsCreated --> [*]
```

### 2. Weekly dispatch and field shift execution 

```mermaid
stateDiagram-v2
    [*] --> ListPushed: system pushes week's shift list (Monday)
    ListPushed --> Assigned: team lead assigns shift to employee
    Assigned --> LinkOpened: employee opens shift link on phone
    LinkOpened --> PhotosCaptured: capture before / after photos
    PhotosCaptured --> ReceiptSigned: customer signs paper receipt
    ReceiptSigned --> ReceiptPhotographed: employee photographs signed receipt
    ReceiptPhotographed --> GpsCaptured: capture GPS + timestamp
    GpsCaptured --> CompletedWithLocation: GPS available
    GpsCaptured --> CompletedFlagged: no GPS signal
    CompletedWithLocation --> [*]
    CompletedFlagged --> [*]: flagged for missing location
```

### 3. Dispute a shift 

```mermaid
stateDiagram-v2
    [*] --> EvidenceFetched: manager fetches shift evidence
    EvidenceFetched --> Reviewed: review photos, receipt, GPS, timestamp
    Reviewed --> DisputeDismissed: evidence supports the visit
    Reviewed --> Disputed: evidence is insufficient
    DisputeDismissed --> [*]
    Disputed --> [*]: excluded from next statement until resolved
```

### 4. Alerts: expiring contract and missed shift 

```mermaid
stateDiagram-v2
    [*] --> ExpiryQueried: query contracts expiring within 30 days
    ExpiryQueried --> OverdueQueried: query shifts overdue vs. item frequency
    OverdueQueried --> Sent: send alerts via channel
    Sent --> Delivered: channel available
    Sent --> FallbackSent: channel unavailable
    Delivered --> [*]
    FallbackSent --> [*]: in-app / email reminder
```

### 5. Month-end statement export 

```mermaid
stateDiagram-v2
    [*] --> Requested: accountant requests statement for a contract + period
    Requested --> Queried: query completed shifts + shift_photos for the period
    Queried --> Blocked: evidence incomplete or disputed
    Queried --> TotalComputed: all shifts have complete evidence
    Blocked --> [*]: list incomplete shifts
    TotalComputed --> PdfRendered: render PDF with photos + signed receipts
    PdfRendered --> Issued: mark statement issued
    Issued --> SentToCustomer: send PDF to customer
    SentToCustomer --> [*]: mark statement sent
```

---

## V: Sequence Diagrams

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

## VI: System Design

Subsystem decomposition, deployment, persistent data, concurrency, external integrations:
[`04-architecture.md`](04-architecture.md).

---
