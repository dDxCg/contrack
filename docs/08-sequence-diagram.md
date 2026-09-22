# Contrack — Sequence Diagrams
### 1. Login

```mermaid
sequenceDiagram
    autonumber
    actor Employee
    participant API
    participant AuthService
    participant DB as Database

    Employee->>API: Login (email, password)
    API->>AuthService: email, password
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
    participant Resolvers as Permission Resolver
    participant DB as Database

    Employee->>API: Send Request
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
    participant Rebalancer as ScheduleRebalancer
    participant DB as Database

    Manager->>System: Submit new contract (customer, term, sites, items)
    System->>System: Validate frequency + unit price per item
    alt validation failed
        System-->>Manager: 422 Reject (missing frequency / invalid price), nothing written
    else validation passed
        System->>System: Generate each item's shift dates (ScheduleGeneratorService, anchored to the signed day-of-month)
        rect rgb(245, 245, 245)
            note over System,DB: single DB transaction
            System->>DB: INSERT contract, contract_sites, contract_items
            System->>DB: Team capacity for tenant
            System->>DB: countsForTenantInRange — one batched query, term.from..term.to
            System->>Rebalancer: resolve(candidates, existing counts) — in-memory, no per-date query
            Rebalancer-->>System: placements (moved to nearest under-capacity date within +/-7 days, or kept as-is)
            System->>DB: INSERT shifts (batch)
            System->>DB: countsForTenantInRange again — post-insert, to detect overload
        end
        System-->>Manager: Contract created, schedule generated
        opt any date still over team capacity after rebalancing
            System->>System: fireAlert(schedule_overload) per overloaded date — see diagram 6 for dedup
        end
    end
```

### 4. Dispatch (manager → team lead → employee) and field shift execution

```mermaid
sequenceDiagram
    autonumber
    actor Manager
    actor TeamLead as Team Lead
    actor Employee
    actor Customer
    participant System
    participant DB as Database

    Manager->>System: Assign a team to the shift (assignTeam)
    System->>DB: UPDATE shifts SET team_id
    System-->>Manager: Shift now owned by the team
    TeamLead->>System: Reassign shift to a team member (own team only)
    System->>System: Verify caller is Team Lead, shift.team_id == caller's team, assignee is on that team
    alt shift already completed
        System-->>TeamLead: Reject — shift already completed
    else shift not yet completed
        System->>DB: UPDATE shifts SET assignee_id
        System-->>TeamLead: Shift assigned
    end
    Employee->>System: Open shift link on phone (signed field token)
    Employee->>System: Submit before / after photos
    Customer->>Employee: Sign paper receipt
    Employee->>System: Submit photo of signed receipt
    System->>System: Capture GPS + timestamp, check against site geofence
    System->>DB: UPDATE shift — completed, geo_verified = within geofence?
    System->>DB: INSERT shift_photos (before, after, receipt)
    System-->>Employee: Shift marked completed (flagged if outside the geofence)
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

### 6. Alerts: expiring contract and missed shift (daily job, dedup-safe)

```mermaid
sequenceDiagram
    autonumber
    participant Cron as AlertJobScheduler
    participant Lock as DistributedLock
    participant Job as AlertJobService
    participant DB as Database
    participant Channel as ChannelClient

    Cron->>Lock: try daily alert
    alt another instance already holds the lock
        Lock-->>Cron: busy
        Cron->>Cron: skip this tick — no duplicate run
    else lock acquired
        Cron->>Job: runAll()
        loop each active tenant, sequentially
            Job->>DB: contracts expiring within 30 days (tenant's own timezone)
            Job->>DB: shifts overdue vs. item frequency
            loop each candidate alert (contract_expiring / shift_overdue / schedule_overload)
                Job->>DB: INSERT alerts (UNIQUE tenant_id, kind, subject_id)
                alt row already exists (duplicate)
                    DB-->>Job: unique violation
                    Job->>Job: skip — already fired, never re-sends
                else first time for this (tenant, kind, subject)
                    DB-->>Job: inserted
                    Job->>Channel: send(message)
                    Channel-->>Job: delivery status (sent / not_sent — never blocks the insert)
                    Job->>DB: UPDATE alerts SET delivery_status
                end
            end
        end
        Job-->>Cron: summary (sent, skipped)
        Cron->>Lock: release("alerts:daily")
    end
```

### 7. Month-end statement — compute, export, send (three separate actions)

```mermaid
sequenceDiagram
    autonumber
    actor Accountant
    participant System
    participant PDF as PdfKitStatementRenderer
    participant S3 as "ObjectStorageClient (resilient - retry + circuit breaker)"
    participant DB as Database
    participant Channel as ChannelClient

    Accountant->>System: Compute statement for a contract + period
    System->>DB: Query shifts for the period
    alt a shift is missing evidence or still disputed
        System-->>Accountant: Cannot close period, list incomplete shifts — nothing saved
    else all shifts in period have complete evidence
        System->>System: total_amount = sum(contract_items.unit_price)
        System->>DB: INSERT statements (period, total_amount, status = draft, pdf_url = null)
        System-->>Accountant: Draft statement
    end

    Accountant->>System: Export statement (draft -> issued)
    System->>System: statement.export() — status guard
    System->>PDF: renderStatement(period, lines, total) — no photos, text only
    PDF-->>System: PDF buffer
    System->>S3: putObject(statements/{tenant}/{id}.pdf)
    S3-->>System: stored (retried on transient failure, circuit opens after repeated failures)
    System->>S3: presignDownload(key)
    S3-->>System: pdf_url
    System->>DB: UPDATE statements SET status = issued, pdf_url
    System-->>Accountant: pdf_url ready to download

    Accountant->>System: Send statement (issued -> sent)
    System->>System: statement.send() — status guard
    System->>Channel: send(text message with period, total, pdf_url)
    Channel-->>System: delivery status (not_sent until a real channel is configured)
    System->>DB: UPDATE statements SET status = sent
    System-->>Accountant: Sent
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

### 10. Reassign or reschedule a shift — role and team-scope checks

```mermaid
sequenceDiagram
    autonumber
    actor TeamLead as Team Lead
    participant System
    participant DB as Database

    TeamLead->>System: Reassign shift to a different team member, and/or move its date
    alt caller is not a Team Lead
        System-->>TeamLead: 403 auth.forbidden_role — only Team Lead calls this endpoint
    else caller is a Team Lead
        System->>DB: Find shift
        alt shift.team_id is not the caller's own team
            System-->>TeamLead: 404 auth.out_of_scope — cannot touch another team's shift
        else shift belongs to the caller's team
            opt new assignee given and caller's row scope is Team
                System->>DB: Find assignee
                alt assignee is on a different team
                    System-->>TeamLead: Reject — assignee must be on the caller's team
                end
            end
            alt shift already completed
                System-->>TeamLead: Reject — shift already completed
            else shift not yet completed
                System->>DB: UPDATE shifts SET assignee_id / scheduled_date
                System-->>TeamLead: Shift updated
            end
        end
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
