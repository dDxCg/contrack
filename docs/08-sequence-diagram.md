# Contrack — Sequence Diagrams
### 1. Login

```mermaid
sequenceDiagram
    autonumber
    actor Employee
    participant API
    participant AuthService
    participant DB as Database

    Employee->>API: POST /auth/login (email, password)
    API->>AuthService: login(email, password)
    AuthService->>DB: Find employee by email
    alt no matching employee, or inactive, or no password set
        AuthService-->>Employee: 401 auth.invalid_credentials
    else employee found
        AuthService->>DB: Find employee's tenant
        alt tenant suspended
            AuthService-->>Employee: 401 auth.invalid_credentials — before password check
        else tenant active
            AuthService->>AuthService: Verify password hash
            alt password wrong
                AuthService-->>Employee: 401 auth.invalid_credentials
            else password correct
                AuthService->>AuthService: Sign access + refresh token (tenant_id, role, sub)
                AuthService-->>Employee: 200 token, refresh_token, employee
            end
        end
    end
```

### 2. Access Control — a protected request

```mermaid
sequenceDiagram
    autonumber
    actor Employee
    participant API
    participant Guard as AccessControlGuard
    participant Resolvers as Tenant/Role/Scope Resolver
    participant DB as Database

    Employee->>API: Request with Authorization: Bearer <token>
    API->>Guard: canActivate()
    Guard->>Guard: Verify bearer token signature + expiry
    alt token missing, malformed or expired
        Guard-->>Employee: 401 auth.credential_expired
    else token valid
        Guard->>Resolvers: Resolve tenant_id from token claims
        Guard->>DB: Find employee by (tenant_id, sub)
        alt employee not found or deactivated since token issued
            Guard-->>Employee: 401 auth.credential_expired
        else employee active
            Guard->>Resolvers: requireRole(resource, operation, role)
            alt role not granted
                Guard-->>Employee: 403 auth.forbidden_role
            else role granted
                Guard->>Resolvers: Resolve row scope — own/team/unit/all
                Guard->>API: Attach AccessContext
                API-->>Employee: Handler runs, scoped to tenant + row scope
            end
        end
    end
```

### 3. Create contract with sites and service items

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

### 4. Weekly dispatch and field shift execution

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
        System->>DB: UPDATE shift — completed, with location
        System->>DB: INSERT shift_photos (before, after)
        System-->>Employee: Shift marked completed
    else no GPS signal
        System->>DB: UPDATE shift — completed, no location
        System-->>Employee: Shift completed, flagged for missing location
    end
```

### 5. Dispute a shift

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

### 6. Alerts: expiring contract and missed shift

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

### 7. Month-end statement export 

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

### 8. Platform Admin onboards a new tenant

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
        System->>DB: INSERT first Director account (role = director, temp password)
        System-->>PlatformAdmin: Tenant created, one active Director login scoped to it
    else Director email already in use
        System-->>PlatformAdmin: Reject — employees.email is globally unique
    end
```

### 9. Platform Admin suspends or reactivates a tenant

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

### 10. Team lead reassigns or reschedules a shift

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
        System-->>TeamLead: Reject — shift already completed
    end
```

### 11. Accountant records a cost, profitability updates

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
        DB-->>System: Actual profit/loss
    else month has no recorded cost yet
        DB-->>System: Estimated profit/loss
    end
    System-->>Director: Profit/loss, flagged actual or estimated
```

### 12. Reconciliation: shifts due vs. shifts with evidence

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
