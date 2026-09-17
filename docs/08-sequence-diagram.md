# Contrack — Sequence Diagrams
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

### 6. Platform Admin onboards a new tenant

```mermaid
sequenceDiagram
    autonumber
    actor PlatformAdmin as Platform Admin
    participant System
    participant DB as Database

    PlatformAdmin->>System: Create tenant (company name, first Director email)
    System->>System: Validate — FR19
    alt tenant name and Director email are valid
        System->>DB: INSERT tenants (status = active)
        System->>DB: INSERT employees (role = Director, tenant_id, temp password)
        System-->>PlatformAdmin: Tenant created, one active Director login scoped to it
    else Director email already in use
        System-->>PlatformAdmin: Reject — employees.email is globally unique
    end
```

### 7. Platform Admin suspends or reactivates a tenant

```mermaid
sequenceDiagram
    autonumber
    actor PlatformAdmin as Platform Admin
    participant System
    participant DB as Database
    actor Employee as Any tenant employee

    PlatformAdmin->>System: Suspend tenant — FR20
    System->>DB: UPDATE tenants SET status = suspended
    System-->>PlatformAdmin: Tenant suspended
    Employee->>System: Sign in (desk credential)
    System->>DB: Resolve tenant from matched employee
    alt tenant is suspended
        System-->>Employee: Rejected before password check
    else tenant reactivated
        PlatformAdmin->>System: Reactivate tenant
        System->>DB: UPDATE tenants SET status = active
        Employee->>System: Sign in again
        System-->>Employee: Session issued as normal
    end
```

### 8. Team lead reassigns or reschedules a shift

```mermaid
sequenceDiagram
    autonumber
    actor TeamLead as Team Lead
    participant System
    participant DB as Database

    TeamLead->>System: Reassign shift to a different team member, or move its date
    System->>DB: SELECT shift status
    alt shift not yet completed
        System->>DB: UPDATE shifts SET assignee / scheduled_date
        System-->>TeamLead: Shift updated
    else shift already completed
        System-->>TeamLead: Reject — evidence is write-once (D7)
    end
```

### 9. Accountant records a cost, profitability updates

```mermaid
sequenceDiagram
    autonumber
    actor Accountant
    participant System
    participant DB as Database
    actor Director

    Accountant->>System: Save cost entry (contract, category, month, amount) — FR14
    System->>DB: UPSERT contract_costs for (category, period)
    System-->>Accountant: Cost saved
    Director->>System: Open profitability view for the contract
    System->>DB: Query contract_items revenue and that month's recorded cost
    alt month has recorded cost
        DB-->>System: Actual profit/loss = revenue − recorded cost
    else month has no recorded cost yet
        DB-->>System: Estimated profit/loss — trailing 3-month average or tenant cost ratio
    end
    System-->>Director: Profit/loss, flagged actual or estimated
```

### 10. Reconciliation: shifts due vs. shifts with evidence

```mermaid
sequenceDiagram
    autonumber
    actor Accountant
    participant System
    participant DB as Database

    Accountant->>System: Open reconciliation for a contract and period
    System->>DB: Query shifts due by each item's frequency
    System->>DB: Query shifts with complete evidence in the period
    DB-->>System: Due list, evidenced list
    System->>System: Compute variance — due but not evidenced
    System-->>Accountant: Side-by-side due vs. evidenced, variance called out
```
