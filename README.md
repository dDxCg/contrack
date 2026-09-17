<div align="center">

# LichHD

**Recurring Service Contract Management**

[![Status](https://img.shields.io/badge/status-pre--development%20%C2%B7%20design%20phase-orange)](#architecture)

</div>

---

## Table of contents

- [What LichHD is](#what-lichhd-is)
- [User stories](#user-stories)
- [The screens](#the-screens)
- [Architecture](#architecture)
- [Success metrics](#success-metrics)
- [Repository layout](#repository-layout)
- [Documentation](#documentation)

---

## What LichHD is

Contract management and scheduling for companies delivering **periodic services** — industrial cleaning, HVAC/elevator maintenance, pest control,
landscaping, fire-safety maintenance, etc. 

```mermaid
flowchart LR
    C["Contract<br/><small>customer · sites · service items</small>"]
    S["Schedule<br/><small>auto-generated shifts</small>"]
    P["Field Proof<br/><small>photos · signed receipt · GPS · timestamp</small>"]
    T["Statement<br/><small>monthly PDF · reconciled</small>"]

    C --> S --> P --> T

    classDef yours fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a
    classDef ours fill:#f1f5f9,stroke:#64748b,color:#0f172a
    class C yours
    class S,P,T ours
```
Specification: [docs/01-prd.md](docs/01-prd.md).

---

## User stories

| As a... | I want to... | So that... | Acceptance criteria |
|---|---|---|---|
| Team lead | know which shifts my team owes this week without chasing anyone for it | I can assign work the moment the week starts | The week's shift list reaches the team lead by Monday morning, scoped to their own team |
| Employee | leave proof that I actually did the visit | I'm protected if a customer disputes it later | A shift only reaches `completed` once before/after photos and the signed receipt are submitted, with location and time recorded |
| Manager | know a contract is about to expire before it does | I can start the renewal conversation in time | Alert fires once per contract, 30 days before expiry |
| Manager | know a visit was missed before the customer tells me | I can fix it before it becomes a complaint | Alert fires the moment a shift passes its due date uncompleted |
| Accountant | close a contract's month without reassembling evidence by hand | I can send the customer a statement in minutes, not days | One action produces the full PDF; a period with incomplete evidence is blocked and lists exactly which shifts are missing it |
| Director | see the state of every contract without asking staff for a status update | I catch a revenue or delivery problem myself, before it reaches me as a complaint | One view shows active, expiring and disputed contract counts plus projected revenue, current as of the underlying data |

Full user stories: [design-analysis.md §I](docs/02-design-analysis.md#user-stories).

---

## The screens

**1. Director dashboard.**

![The LichHD director dashboard for October 2024. Four figures read 48 hợp đồng đang chạy, 5 sắp hết hạn, 3 ca bị khiếu nại, and 245tr doanh thu dự kiến. A "Cần chú ý" list flags Keangnam Landmark 72 (còn 18 ngày) and Chung cư Golden Park (khiếu nại). Two more tiles read 94% ca có đủ bằng chứng and 41/48 bảng kê đã chốt.](docs/screenshots/prototype/director/dashboard.png)

**2. Create contract with sites and service items.** 

![Tạo hợp đồng form for customer Keangnam Landmark 72, signed and expiry dates, one site Tòa A with service Bảo trì VRV & Chiller at 2 lần/tháng and 42.000.000đ. Footer reads "Sẽ tự sinh 20 ca từ 15/01 đến 15/11/2024" next to a "Tạo & sinh lịch" button.](docs/screenshots/prototype/director/new-contract.png)
![The resulting contracts list. Keangnam Landmark 72 now shows this period's schedule progress, days left on the term and monthly value — generated from the form above, not entered separately.](docs/screenshots/prototype/manager/contracts.png)

**3. Weekly dispatch and field shift execution.**

![Lịch tổ 1 — HVAC, week 43. 8 ca tuần này, 3 đã xong, 2 chưa có người. An unassigned shift at Golden Park is highlighted with a "Phân người" button.](docs/screenshots/prototype/team_lead/team-shifts.png)
![Field execution screen on a phone for Keangnam Landmark 72, 08:30, 21/10. Three steps — before photos (2 captured), after photos, and the signed receipt — plus a GPS/timestamp panel marked recorded automatically and not editable.](docs/screenshots/prototype/employee/field.png)

**4. Dispute a shift.** 

![Ca #22 — Keangnam Landmark 72, marked Đã hoàn thành. An evidence panel shows before/after photo counts and a signed receipt; an automatic-capture panel shows GPS and submission time. Two actions: "Xác nhận bằng chứng hợp lệ" or "Đánh dấu khiếu nại".](docs/screenshots/prototype/director/shift-detail.png)
![Ghi nhận khiếu nại form for the same shift — reason (Không thấy nhân viên đến), how the customer reported it, who reported it, when, and a description.](docs/screenshots/prototype/director/new-dispute.png)

**5. Alerts: expiring contract and missed shift.**

![Cảnh báo screen, 7 việc cần xử lý. Hợp đồng sắp hết hạn: Keangnam Landmark 72 (còn 18 ngày, đã gửi Zalo) and Discovery Complex (còn 31 ngày, chưa gửi). Ca chậm tần suất: Chung cư Golden Park (quá hạn 2 ngày) and Vinhomes Skylake (còn 3 ngày).](docs/screenshots/prototype/director/alerts.png)

**6. Month-end statement export.**

![Bảng kê T10/2024 for Keangnam Landmark 72. A warning banner reads "Kỳ chưa chốt được: ca 28/10 chưa có bằng chứng." Two shift rows show evidence status Đủ and Chưa có, with a running subtotal of 21.000.000đ for the one complete shift.](docs/screenshots/prototype/accountant/statement-preview.png)

Full screen set: [`docs/screenshots/`](docs/screenshots/).

---

## Architecture

### View 1 — System context

```mermaid
flowchart TB
    customer["Customer<br/><i>outside the system</i>"]
    employee["Field employee / team lead<br/><i>person, in one tenant</i>"]
    accountant["Accountant / manager<br/><i>person, in one tenant</i>"]
    director["Director<br/><i>person, in one tenant</i>"]
    platformadmin["Platform Admin<br/><i>person, outside every tenant</i>"]

    lichhd["<b>LichHD</b><br/><i>the system, multi-tenant</i><br/>contracts, schedule,<br/>field proof, statements"]

    zalo["Zalo ZNS / SMS<br/><i>external</i><br/>reminders"]
    vietqr["VietQR<br/><i>external, planned</i><br/>payment"]

    customer -.->|"signs contract in person"| director
    customer -.->|"signs paper receipt in person"| employee
    employee -->|"opens shift link,<br/>submits photos"| lichhd
    accountant -->|"creates contracts,<br/>exports statements"| lichhd
    director -->|"views dashboard"| lichhd
    platformadmin -->|"creates / suspends tenants"| lichhd

    lichhd -->|"sends reminder"| zalo
    lichhd -->|"requests payment"| vietqr
```

Customer sits outside the system boundary: signatures and complaints are recorded
offline by staff. Platform Admin sits outside every tenant: it provisions companies,
never their contracts or shifts.

### View 2 — class diagram

Same domain classes as
[design-analysis.md §III](docs/02-design-analysis.md#iii-class-diagram), design-level
(typed attributes, typed methods).

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
    Tenant "1" --> "0..*" Customer
    Tenant "1" --> "0..*" Employee
    Tenant "1" --> "0..*" Team
    Tenant "1" --> "0..*" Contract
```

### View 3 — the core flows

The same five sequence diagrams as
[design-analysis.md §V](docs/02-design-analysis.md#v-sequence-diagrams), each with
its failure branch.

**1. Create contract with sites and service items**

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

**2. Weekly dispatch and field shift execution**

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

**3. Dispute a shift**

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

**4. Alerts: expiring contract and missed shift**

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

**5. Month-end statement export**

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

Full architecture: [docs/04-architecture.md](docs/04-architecture.md).

---

## Success metrics

| Metric | Baseline | Target |
|---|---|---|
| Month-end statement closing time | 1.5–3 days | Under 30 minutes |
| Visits with complete photo and signature evidence | Not measurable | ≥ 90% |

Full release criteria: [PRD §8](docs/01-prd.md#8-success-metrics--release-criteria).

---

## Repository layout
```
docs/
│
backend/
├── Controllers/
├── Services/
├── Repositories/
├── Models/
└── Data/
│
frontend/
├── src/
│   ├── assets/
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   ├── components/
│   ├── layouts/
│   ├── pages/
│   ├── hooks/
│   ├── services/
│   ├── types/
│   ├── routes/
│   ├── context/
│   └── utils/
├── dist/
└── public/
```

## Documentation

| # | Document | Contents |
|---|---|---|
| 1 | [PRD](docs/01-prd.md) | Problem statement, personas, MVP scope, roadmap, release criteria |
| 2 | [Design Analysis](docs/02-design-analysis.md) | FR/NFR, use cases, class diagram, sequence diagrams |
| 3 | [Functional Spec](docs/03-functional-spec.md) | Function → screens needed → API needed, per FR |
| 4 | [Architecture](docs/04-architecture.md) | arc42 + c4 |
| 5 | [API Specification](docs/05-api.md) | Endpoint contract, field-token submission path, access-control matrix |
| 6 | [API Specification (OpenAPI)](docs/05-api.yaml) | Same contract as OpenAPI 3.0 — paths, schemas, error examples |
| 7 | [Repo Layout](docs/06-repo-layout.md) | Planned source tree by architecture style — stack not yet decided |
| 8 | [Prototype](docs/ui/prototype.html) | Clickable build: login, role-scoped navigation, 22 screens |
| 9 | [ERD](docs/db/erd.md) | Entity-relationship diagram |
| 10 | [SQL Schema](docs/db/schema.sql) | ANSI SQL |

---