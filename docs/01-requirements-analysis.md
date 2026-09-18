# Contrack — Requirements Analysis

### Overview

Contrack is recurring service contract management software for companies delivering
periodic services — industrial cleaning, HVAC/elevator maintenance, pest control,
landscaping, fire-safety maintenance. Many companies run schedules in Excel and coordinate over Zalo: visits get missed with
no warning, there's no proof of work when a customer disputes a visit, and closing the
month-end statement takes an accountant days of manual reconciliation. Contracts
nearing expiry go untracked until they're already lost.

Contrack replaces that with one system: a contract's schedules are generated, field staff submit photo/GPS/timestamp proof on completion, and the month-end statement exports in minutes instead of days.

### User Stories
| ID | As a... | I want to... | So that... | Acceptance criteria |
|---|---|---|---|---|
| US-01 | employee (any role) | sign in with my email and password | I get a session scoped to my tenant, role and row-scope | Given a valid email/password, when I sign in, then I receive a token carrying tenant + role; given the email doesn't exist or the tenant is suspended, when I sign in, then I'm rejected before any password check |
| US-02 | Director | see contract status, projected revenue/profit and this period's shift-completion status in one place | I catch a delivery or revenue problem before it reaches me as a complaint | Given I open the dashboard, when it loads, then active/expiring/disputed contract counts, projected revenue and period profit reflect the current data, filterable by month; given the same load, then the period's scheduled shifts show as completed/overdue/disputed/not-yet-due, with the three completion rates computed only against shifts actually due |
| US-03 | Director | see late/missed shifts by month on the dashboard | I spot a slipping team before it costs a contract | Given I filter the dashboard by month, when it renders, then late/missed shift counts for that month are shown |
| US-04 | Director | see on-time renewal rate and cancellation rate on the dashboard | I know whether retention is improving or slipping | Given I open the dashboard, when it loads, then both rates are computed against the selected month's baseline |
| US-05 | Director | see new contracts signed by month and the profit/loss trend on the dashboard | I see growth and margin together, not in two places | Given I open the dashboard, when it loads, then both trends render for the selected date range, using the same profit/loss numbers as US-08 |
| US-06 | Director | manage employee accounts, roles and manager assignment myself | access always matches who's actually on staff, without waiting on IT | Given I create, edit or deactivate an employee, when they next call the API, then the change already applies — no redeploy, no re-login required |
| US-07 | Director, Accountant | see what's billed against what actually got done, per contract and period | I catch billing drift before it reaches the customer as a dispute | Given a contract and a period, when I open reconciliation, then shifts due by frequency sit next to shifts with complete evidence, for that contract and period only |
| US-08 | Director, Accountant | see profit/loss per contract per month | I catch a bad contract before renewing it | Given a month with recorded costs, when I open the view, then profit/loss = revenue from `contract_items` minus that month's recorded labor/materials/other cost |
| US-09 | Director | still see a profit/loss number for a month the Accountant hasn't closed yet | the dashboard never shows a gap for an unclosed month | Given a contract with no cost recorded for the month, when I open the view, then it shows a clearly marked estimate — trailing 3-month average for that contract, or the tenant's average cost-to-revenue ratio if it has no cost history |
| US-10 | Manager, Director | set up a new contract with its sites and service items in one pass | the shift schedule generates itself instead of me building a calendar by hand | Given a contract with a term, ≥1 site and ≥1 service item, when I save it, then the full set of scheduled shifts is generated immediately; given a site or item is missing frequency or unit price, when I save, then the contract is rejected with the specific field named |
| US-11 | Manager, Director | flag a shift as disputed the moment a customer complains | the complaint is tied to the actual evidence instead of living in someone's memory | Given a completed shift, when I mark it disputed with a reason, then it keeps its photos/receipt/GPS and shows the reason, separate from a normal completed shift |
| US-12 | Manager | know a contract is about to expire before it does | I can start the renewal conversation in time | Given a contract 30 days from `expires_at`, when that threshold is crossed, then one alert fires for that contract via Zalo (ZNS) with SMS fallback, and never fires twice |
| US-13 | Manager | know a visit was missed before the customer tells me | I can fix it before it becomes a complaint | Given a shift past its due date per the contract's frequency, when it's still not completed, then an alert fires the moment it passes due, via Zalo (ZNS) with SMS fallback |
| US-14 | Manager, Director | create or update a customer record, and delete it if I'm Director | the customer directory matches who we actually work with | Given a customer with an active contract, when a Director tries to delete it, then it's rejected; given no such contract, when a Director deletes it, then it succeeds |
| US-15 | Accountant | close a contract's month without reassembling evidence by hand | I can send the customer a statement in minutes, not days | Given a period where every due shift has complete evidence, when I export, then one action produces the full PDF with photos and signature; given any shift in the period is missing evidence, when I try to export, then it's blocked and the missing shifts are listed |
| US-16 | Accountant | send an exported statement to the customer and mark it sent | I have one record of what was billed and when, without a side spreadsheet | Given a statement already exported as PDF, when I send it, then it's marked sent with a timestamp, and can't be sent twice by accident |
| US-17 | Accountant | record labor and materials costs against a contract each month | the Director's profit/loss numbers are accurate, not guessed | Given I save a cost entry (category, month, amount), when it's saved, then that contract's profit/loss for that month updates immediately |
| US-18 | Team lead | know which shifts my team owes this week without chasing anyone for it | I can assign work the moment the week starts | Given it's Monday, when the week starts, then my team's shift list has already arrived, scoped to my own team only |
| US-19 | Team lead | swap the assignee or date on a shift when someone's out or a site asks to move | the week still gets covered without waiting on a manager | Given a shift not yet completed, when I reassign or reschedule it, then it succeeds; given a shift already completed, when I try the same, then it's rejected |
| US-20 | Employee | leave proof that I actually did the visit | I'm protected if a customer disputes it later | Given I open the shift link on my phone, when I submit before/after photos and the signed-receipt photo, then GPS and timestamp are captured automatically and the shift only reaches `completed` once all three are present |
| US-21 | Platform Admin | onboard a new operating company with its first Director account | a new customer of Contrack itself can start working without me touching the database | Given I create a tenant, when it's saved, then one active Director login exists, scoped to that tenant only |
| US-22 | Platform Admin | suspend or reactivate a tenant | I can cut off a non-paying or offboarded company without deleting their data | Given a suspended tenant, when any of its accounts try to sign in, then they're rejected before password check; given reactivation, when the same account signs in, then it succeeds |
| US-23 | Platform Admin | see tenant counts by status, recent onboarding activity and tenant growth trend | I track platform health without querying the database myself | Given I open the platform dashboard, when it loads, then all three views reflect current tenant data |
| US-24 | Director | create, rename or delete a team | field staff are organized into the group a team lead actually dispatches, not left as one undifferentiated pool | Given a name and a code unique within my tenant, when I save a team, then it's created; given a team that still has members, when I try to delete it, then it's rejected |

### Functional Requirements

| # | Role | Requirement |
|---|---|---|
| FR1 | Director, Accountant, Manager, Team Lead, Employee | Sign in with an email and password; the session carries the account's tenant, role and row scope for every later request |
| FR2 | Director | View dashboard: active/expiring/disputed contract counts, projected revenue, late/missed shifts by month, on-time renewal rate, cancellation rate, new contracts signed by month, profit/loss trend — filterable by month |
| FR3 | Director | Read, create, update or deactivate employee accounts, including role and manager assignment; deactivation is a soft delete — the account and its shift/cost history are retained |
| FR4 | Director, Accountant | View profit/loss per contract per month: revenue from `contract_items` minus that month's recorded or estimated cost |
| FR5 | Manager, Director | Create a contract for a customer with a signed date and expiry date. Update/delete: Director only |
| FR6 | Manager, Director | Add one or more sites to a contract. Update/delete: Director only |
| FR7 | Manager, Director | Add service items to a site (name, frequency, unit price). Update/delete: Director only |
| FR8 | Manager, Director | Mark a shift as disputed and record the reason |
| FR9 | Manager, Director | Create or update a customer record (name, contact, address, segment). Delete: Director only, blocked while the customer holds an active contract |
| FR10 | Accountant | Generate a monthly statement per contract from its completed shifts |
| FR11 | Accountant | Export a statement as PDF with photos and receipts attached |
| FR12 | Accountant | Send an exported statement to the customer, marking it sent |
| FR13 | Accountant, Director | View reconciliation: shifts due by frequency vs. shifts with complete evidence, per contract per period |
| FR14 | Accountant | Record or update a contract's monthly cost (category: labor, materials, other) |
| FR15 | Team Lead | Reassign or reschedule a shift when a conflict arises |
| FR16 | Employee | Open an assigned shift via a phone link, no app install |
| FR17 | Employee | Submit before/after photos for a shift |
| FR18 | Employee | Submit the signed paper receipt photo as evidence |
| FR19 | Platform Admin | Create a new tenant (operating company) with its first Director account | 
| FR20 | Platform Admin | Suspend or reactivate a tenant; a suspended tenant's accounts can't sign in |
| FR21 | Platform Admin | View platform dashboard: tenant counts by status, recent onboarding activity, tenant growth trend |
| FR22 | System | Auto-generate the shift schedule from each service item's frequency |
| FR23 | System | Auto-push the current week's shifts to each team lead |
| FR24 | System | Capture GPS coordinates and timestamp automatically on submission |
| FR25 | System | Alert when a contract is within 30 days of expiry |
| FR26 | System | Alert when a shift has not been completed at the contract's required frequency |
| FR27 | System | Send alerts via Zalo (ZNS) and/or SMS |
| FR28 | System | Estimate a contract's month cost when the Accountant hasn't recorded it yet — trailing 3-month average of that contract's own recorded costs, or the tenant's average cost-to-revenue ratio if the contract has no recorded cost history — so FR2/FR4 never show a gap for an unclosed month |
| FR29 | Director | Create, rename or delete a team (name, code unique per tenant); delete blocked while the team still has members |

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

### Use Cases
#### Platform Admin

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
    PlatformAdmin((Platform<br/>Admin))

    subgraph Contrack["Contrack"]
        subgraph PlatformAdminBox["Platform Admin"]
            PA_Login(["UC-01 · Sign in"])
            PA_Onboard(["UC-02 · Onboard tenant"])
            PA_TenantStatus(["UC-04 · Suspend / reactivate tenant"])
            PA_PlatformDash(["UC-05 · View platform dashboard"])
            PA_FirstDirector(["UC-03 · Create first Director account"])
        end
    end

    classDef box fill:#f8fafc,stroke:#94a3b8,color:#0f172a
    classDef actor fill:#f1f5f9,stroke:#64748b,color:#0f172a
    classDef uc fill:#dbeafe,stroke:#1d4ed8,color:#0f172a
    classDef inc fill:#f8fafc,stroke:#1d4ed8,color:#0f172a,stroke-dasharray: 5 5
    class Contrack,PlatformAdminBox box
    class PlatformAdmin actor
    class PA_Login,PA_Onboard,PA_TenantStatus,PA_PlatformDash uc
    class PA_FirstDirector inc

    PlatformAdmin --- PA_Login
    PlatformAdmin --- PA_Onboard
    PlatformAdmin --- PA_TenantStatus
    PlatformAdmin --- PA_PlatformDash

    PA_Onboard -.->|"&laquo;include&raquo;"| PA_FirstDirector
```

#### Director

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
    Director((Director))

    subgraph Contrack["Contrack"]
        subgraph DirectorBox["Director"]
            D_Login(["UC-01 · Sign in"])
            D_Dashboard(["UC-06 · View dashboard"])
            D_Accounts(["UC-07 · Manage employee accounts"])
            D_Teams(["UC-08 · Manage teams"])
            D_ProfitLoss(["UC-09 · View profit / loss"])
            D_Customers(["UC-10 · Manage customers"])
            D_Contract(["UC-11 · Manage contract"])
            D_ViewShifts(["UC-14 · View shifts and evidence"])
            D_Dispute(["UC-15 · Flag shift disputed"])
            D_Reconcile(["UC-17 · View reconciliation"])
            D_Sites(["UC-12 · Manage sites"])
            D_Items(["UC-13 · Manage service items"])
            SYS_Schedule(["UC-29 · Generate shift schedule"])
            D_Review(["UC-16 · Review shift evidence"])
            SYS_Estimate(["UC-34 · Estimate month cost"])
        end
    end

    classDef box fill:#f8fafc,stroke:#94a3b8,color:#0f172a
    classDef actor fill:#f1f5f9,stroke:#64748b,color:#0f172a
    classDef uc fill:#dbeafe,stroke:#1d4ed8,color:#0f172a
    classDef inc fill:#f8fafc,stroke:#1d4ed8,color:#0f172a,stroke-dasharray: 5 5
    class Contrack,DirectorBox box
    class Director actor
    class D_Login,D_Dashboard,D_Accounts,D_Teams,D_ProfitLoss,D_Customers,D_Contract,D_ViewShifts,D_Dispute,D_Reconcile uc
    class D_Sites,D_Items,D_Review,SYS_Schedule,SYS_Estimate inc

    Director --- D_Login
    Director --- D_Dashboard
    Director --- D_Accounts
    Director --- D_Teams
    Director --- D_ProfitLoss
    Director --- D_Customers
    Director --- D_Contract
    Director --- D_ViewShifts
    Director --- D_Dispute
    Director --- D_Reconcile

    D_Dashboard -.->|"&laquo;include&raquo;"| SYS_Estimate
    D_ProfitLoss -.->|"&laquo;include&raquo;"| SYS_Estimate
    D_Contract -.->|"&laquo;include&raquo;"| D_Sites
    D_Contract -.->|"&laquo;include&raquo;"| D_Items
    D_Contract -.->|"&laquo;include&raquo;"| SYS_Schedule
    D_Dispute -.->|"&laquo;include&raquo;"| D_Review
```

#### Manager

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
    Manager((Manager))

    subgraph Contrack["Contrack"]
        subgraph ManagerBox["Manager"]
            M_Login(["UC-01 · Sign in"])
            M_Customers(["UC-10 · Manage customers"])
            M_Contract(["UC-11 · Manage contract"])
            M_ViewShifts(["UC-14 · View shifts and evidence"])
            M_Dispute(["UC-15 · Flag shift disputed"])
            M_Sites(["UC-12 · Manage sites"])
            M_Items(["UC-13 · Manage service items"])
            SYS_Schedule(["UC-29 · Generate shift schedule"])
            M_Review(["UC-16 · Review shift evidence"])
        end
    end

    classDef box fill:#f8fafc,stroke:#94a3b8,color:#0f172a
    classDef actor fill:#f1f5f9,stroke:#64748b,color:#0f172a
    classDef uc fill:#dbeafe,stroke:#1d4ed8,color:#0f172a
    classDef inc fill:#f8fafc,stroke:#1d4ed8,color:#0f172a,stroke-dasharray: 5 5
    class Contrack,ManagerBox box
    class Manager actor
    class M_Login,M_Customers,M_Contract,M_ViewShifts,M_Dispute uc
    class M_Sites,M_Items,M_Review,SYS_Schedule inc

    Manager --- M_Login
    Manager --- M_Customers
    Manager --- M_Contract
    Manager --- M_ViewShifts
    Manager --- M_Dispute

    M_Contract -.->|"&laquo;include&raquo;"| M_Sites
    M_Contract -.->|"&laquo;include&raquo;"| M_Items
    M_Contract -.->|"&laquo;include&raquo;"| SYS_Schedule
    M_Dispute -.->|"&laquo;include&raquo;"| M_Review
```

#### Accountant

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
    Accountant((Accountant))

    subgraph Contrack["Contrack"]
        subgraph AccountantBox["Accountant"]
            A_Login(["UC-01 · Sign in"])
            A_ProfitLoss(["UC-09 · View profit / loss"])
            A_Reconcile(["UC-17 · View reconciliation"])
            A_Cost(["UC-25 · Record monthly cost"])
            A_Send(["UC-28 · Send statement to customer"])
            SYS_Estimate(["UC-34 · Estimate month cost"])
            A_Export(["UC-27 · Export statement as PDF"])
            A_StmtData(["UC-26 · Generate statement data"])
        end
    end

    classDef box fill:#f8fafc,stroke:#94a3b8,color:#0f172a
    classDef actor fill:#f1f5f9,stroke:#64748b,color:#0f172a
    classDef uc fill:#dbeafe,stroke:#1d4ed8,color:#0f172a
    classDef inc fill:#f8fafc,stroke:#1d4ed8,color:#0f172a,stroke-dasharray: 5 5
    class Contrack,AccountantBox box
    class Accountant actor
    class A_Login,A_ProfitLoss,A_Reconcile,A_Cost,A_Export,A_Send uc
    class A_StmtData,SYS_Estimate inc

    Accountant --- A_Login
    Accountant --- A_ProfitLoss
    Accountant --- A_Reconcile
    Accountant --- A_Cost
    Accountant --- A_Send

    A_ProfitLoss -.->|"&laquo;include&raquo;"| SYS_Estimate
    A_Send -.->|"&laquo;include&raquo;"| A_Export
    A_Export -.->|"&laquo;include&raquo;"| A_StmtData
```

#### Team Lead

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
    TeamLead((Team<br/>Lead))

    subgraph Contrack["Contrack"]
        subgraph TeamLeadBox["Team Lead"]
            T_Login(["UC-01 · Sign in"])
            T_Week(["UC-18 · View this week's shifts"])
            T_Reschedule(["UC-19 · Reassign / reschedule shift"])
        end
    end

    classDef box fill:#f8fafc,stroke:#94a3b8,color:#0f172a
    classDef actor fill:#f1f5f9,stroke:#64748b,color:#0f172a
    classDef uc fill:#dbeafe,stroke:#1d4ed8,color:#0f172a
    classDef inc fill:#f8fafc,stroke:#1d4ed8,color:#0f172a,stroke-dasharray: 5 5
    class Contrack,TeamLeadBox box
    class TeamLead actor
    class T_Login,T_Week,T_Reschedule uc

    TeamLead --- T_Login
    TeamLead --- T_Week
    TeamLead --- T_Reschedule
```

#### Employee

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

    subgraph Contrack["Contrack"]
        subgraph EmployeeBox["Employee"]
            E_Login(["UC-01 · Sign in"])
            E_OpenShift(["UC-20 · Open shift from phone link"])
            E_Submit(["UC-21 · Submit shift evidence"])
            E_Photos(["UC-22 · Capture before / after photos"])
            E_Receipt(["UC-23 · Capture signed-receipt photo"])
            E_GPS(["UC-24 · Capture GPS and timestamp"])
        end
    end

    classDef box fill:#f8fafc,stroke:#94a3b8,color:#0f172a
    classDef actor fill:#f1f5f9,stroke:#64748b,color:#0f172a
    classDef uc fill:#dbeafe,stroke:#1d4ed8,color:#0f172a
    classDef inc fill:#f8fafc,stroke:#1d4ed8,color:#0f172a,stroke-dasharray: 5 5
    class Contrack,EmployeeBox box
    class Employee actor
    class E_Login,E_OpenShift,E_Submit uc
    class E_Photos,E_Receipt,E_GPS inc

    Employee --- E_Login
    Employee --- E_OpenShift
    Employee --- E_Submit

    E_Submit -.->|"&laquo;include&raquo;"| E_Photos
    E_Submit -.->|"&laquo;include&raquo;"| E_Receipt
    E_Submit -.->|"&laquo;include&raquo;"| E_GPS
```

#### System-triggered

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
    Scheduler((Scheduler))
    Zalo((Zalo ZNS / SMS))

    subgraph Contrack["Contrack"]
        subgraph SystemBox["System-triggered"]
            S_Push(["UC-30 · Push this week's shifts"])
            S_Expiry(["UC-31 · Alert expiring contracts"])
            S_Missed(["UC-32 · Alert overdue shifts"])
            S_Alert(["UC-33 · Send alert via Zalo (ZNS) / SMS"])
        end
    end

    classDef box fill:#f8fafc,stroke:#94a3b8,color:#0f172a
    classDef actor fill:#f1f5f9,stroke:#64748b,color:#0f172a
    classDef uc fill:#dbeafe,stroke:#1d4ed8,color:#0f172a
    classDef inc fill:#f8fafc,stroke:#1d4ed8,color:#0f172a,stroke-dasharray: 5 5
    class Contrack,SystemBox box
    class Scheduler,Zalo actor
    class S_Push,S_Expiry,S_Missed uc
    class S_Alert inc

    Scheduler --- S_Push
    Scheduler --- S_Expiry
    Scheduler --- S_Missed
    S_Alert --- Zalo

    S_Expiry -.->|"&laquo;include&raquo;"| S_Alert
    S_Missed -.->|"&laquo;include&raquo;"| S_Alert
```