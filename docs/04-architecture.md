# LichHD — Architecture (arc42)

> **Status:** Draft — §5 technology selection and the items in §11 are open
> **Audience:** Developers picking up the build; reviewers of the design
> **Answers:** How is LichHD put together, and which decisions are already settled?

---

## 1. Introduction and Goals

### 1.1 Requirements overview

LichHD manages recurring service contracts end to end: a contract is entered once,
shifts are generated from each service item's frequency, field staff submit
evidence per shift from a phone, and monthly statements are computed from
completed shifts. Full scope, personas and MVP boundary: [`01-prd.md`](01-prd.md).

### 1.2 Quality goals

| # | Quality goal | Why it matters here | Priority |
|---|---|---|---|
| G1 | **Evidence integrity** | A statement, and a dispute's resolution, both rest on evidence nobody — including LichHD's own staff — can alter after capture (NFR2) | 1 |
| G2 | **Field usability with no login** | The one workflow reached with no training and the worst network is the one a new hire executes on day one (NFR7, NFR1) | 1 |
| G3 | **Correct row-scoped access** | Five roles share one system; a manager seeing another manager's team, or an employee seeing another's shift, is a trust failure, not a bug report (NFR3) | 1 |
| G4 | **Correct tenant isolation** | One shared deployment serves many operating companies (tenants); one tenant reading or writing another's row is a trust failure worse than a role/scope bug — it leaks between paying customers of LichHD itself (NFR6) | 1 |
| G5 | **Evidence retained and exportable** | Reconciliation and disputes reach back months; a photo or a statement that cannot be produced later defeats the point of capturing it (NFR4, NFR5) | 2 |

G1–G4 are architecture-defining: a design choice that trades one of them away
needs a decision recorded in §9, not a silent shortcut.

### 1.3 Stakeholders

| Role | Concern |
|---|---|
| Director | Portfolio visibility — revenue, expiring contracts, disputes — without chasing staff |
| Manager | Dispatch shifts and resolve disputes without re-keying what the field already reported |
| Accountant | A statement that closes only when every shift in it is backed by evidence |
| Team lead | See and reassign the team's own shifts, nothing wider |
| Employee | Submit a shift's evidence from a personal phone in one visit, no install, no password |
| Platform Admin | Onboard a new tenant company in one step; suspend one without touching any other tenant's data |
| Customer *(outside the system, §3.1)* | Evidence trustworthy enough to settle a dispute without a site revisit |

---

## 2. Architecture Constraints

| # | Constraint | Type | Implication |
|---|---|---|---|
| C1 | Budget and team are scoped to the 5 Must-have modules only ([PRD §6](01-prd.md#6-assumptions--constraints)) | Organisational | Should/Could-have items (VietQR, ERP integration) are named but not designed for here |
| C2 | No ERP/accounting integration in the MVP | Organisational | The accountant enters costs manually; no accounting-system interface is designed |
| C3 | Must run [`db/schema.sql`](db/schema.sql) unmodified | Technical | Rules out an engine without ANSI SQL, identity columns and `NUMERIC` |
| C4 | Many 10–80 staff operator companies share one LichHD deployment | Business | Multi-tenant from day one; drives D1 |
| C5 | No native app install (NFR7) | Technical | Browser-only client; field access cannot depend on app-store distribution |
| C6 | Technology stack not yet selected | Organisational | §5 states criteria instead of naming a language, framework or database |
| C7 | Design phase only — no implementation phase follows this plan | Organisational | §7's deployment view and §5's technology criteria describe an intended shape, not a provisioned environment |

---

## 3. Context and Scope

### 3.1 Business context (C4 - level 1)

Five roles use the system inside one tenant — director, manager, accountant, team
lead, employee. A sixth role, **Platform Admin**, sits outside every tenant and
exists only to create and suspend them (FR23, FR24) and view an aggregate platform
dashboard over the `tenants` table (FR25) — it never reads a contract, shift or
statement. The **customer is outside the system boundary**: they sign the
contract and the paper receipt in person and raise complaints by phone, all of
which tenant staff record on their behalf. Two external services are integrated:
Zalo ZNS and/or SMS for reminders (FR14), and VietQR for payment (Could-have, not
in MVP).

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
    platformadmin -->|"creates / suspends tenants,<br/>views platform dashboard"| lichhd

    lichhd -->|"sends reminder"| zalo
    lichhd -->|"requests payment"| vietqr
```

### 3.2 External interfaces

| Interface | Direction | Protocol | Contract owner | Failure mode |
|---|---|---|---|---|
| Field link | in | HTTPS, signed token, no login | API server | expired or invalid token refused, `401` |
| Zalo ZNS / SMS | out | provider HTTP API | Alert job | delivery failure falls back to in-app (§8.3) |
| VietQR | out | provider HTTP API | Billing (Could-have) | not built in MVP |
| Object storage | both | S3-compatible API | API server | upload retried; an unresolvable upload blocks shift completion |

---

## 4. Solution Strategy

| Quality goal | Strategy | Where |
|---|---|---|
| G1 evidence integrity | Write-once evidence, enforced in the API rather than by database permission | D7, §8.2 |
| G2 field usability | Per-shift signed token, no login; the field page is the lightest page in the system | D3, §8.4 |
| G3 row-scoped access | One authorisation model — role plus own/team/unit/all scope, evaluated inside a tenant — reused by every screen and endpoint | §8.1, `05-api.md` §8 |
| G4 tenant isolation | `tenant_id` on every core table (`db/schema.sql`); every repository method takes the caller's `tenant_id` as a mandatory first filter, not an optional one | D1, §8.1 |
| G5 retention and export | Object storage with a lifecycle rule (§8.2); PDF and CSV/Excel export stated as a technology criterion (§5.1) | D2 |

**The one-sentence strategy:** *enforce every irreversible fact — captured evidence,
a closed statement, which tenant a row belongs to — once at the API boundary, and
keep the one path with no login and the worst network the lightest thing in the
system.*

---

## 5. Building Block View

### 5.1 Containers (C4 - level 2)

```mermaid
flowchart LR
    subgraph client["Client — browser only, no native app"]
        desk_ui["Desk UI<br/><i>authenticated</i>"]
        field_ui["Field UI<br/><i>token, mobile-first</i>"]
    end

    subgraph server["Server"]
        api["API<br/>contracts · shifts · statements"]
        gen["Schedule generator"]
        alerts["Alert job"]
        pdf["PDF renderer"]
    end

    db[("Relational DB")]
    store[("Object storage<br/>photos · receipts · PDFs")]
    channel["Zalo ZNS / SMS"]

    desk_ui --> api
    field_ui --> api
    api --> db
    api --> store
    gen --> db
    alerts --> db
    alerts --> channel
    pdf --> store
```

**The stack is not selected yet** (C6, §11 R1). Any candidate must meet:

| Criterion | Source |
|---|---|
| Responsive web, no native app install | NFR7, FR7 |
| Runs [`db/schema.sql`](db/schema.sql) unmodified — ANSI SQL, identity columns, `NUMERIC` | C3 |
| Server-side PDF rendering with embedded images | FR16 |
| S3-compatible object storage client | §9 D2 |
| Scheduled job execution | FR4, FR12, FR13 |
| Multi-tenant: one shared deployment, `tenant_id` filtering in every query, no per-tenant host | C4, D1 |

### 5.2 Components (C4 - level 3)

C4 Level 3, zoomed into the one container worth decomposing — the API groups
five responsibilities that `05-api.md` already separates by section, and
`SCREEN_ROLES` in [`prototype.html`](ui/prototype.html) depends on the same split.
`Access Control` is cross-cutting (§8.1): every other component calls it, not the
reverse.

```mermaid
flowchart TB
    subgraph clients["Clients"]
        desk_ui2["Desk UI"]
        field_ui2["Field UI<br/><i>token, no login</i>"]
    end

    subgraph apic["API container"]
        auth["Access Control<br/><i>[Component]</i><br/>Resolves tenant + role + row scope<br/>own / team / unit / all — §8.1"]
        contracts["Contracts & Schedule<br/><i>[Component]</i><br/>CRUD contracts, sites, items<br/>05-api.md §3"]
        shifts["Shifts & Dispatch<br/><i>[Component]</i><br/>List, reassign, dispute<br/>05-api.md §4"]
        field["Field Submission<br/><i>[Component]</i><br/>Token redemption, upload, submit<br/>05-api.md §5"]
        statements["Statements & Reconciliation<br/><i>[Component]</i><br/>Compute, export, reconcile<br/>05-api.md §6"]
        directory["Directory & Alerts<br/><i>[Component]</i><br/>Customers, employees, teams,<br/>dashboard, alerts — 05-api.md §7"]
    end

    gen["Schedule Generator"]
    alertjob["Alert Job"]
    pdf["PDF Renderer"]
    db[("Database")]
    store[("Object storage")]
    channel["Zalo ZNS / SMS"]

    desk_ui2 --> auth
    field_ui2 --> field
    auth -.->|"scope check"| contracts
    auth -.->|"scope check"| shifts
    auth -.->|"scope check"| statements
    auth -.->|"scope check"| directory

    contracts --> db
    contracts --> gen
    gen --> db
    shifts --> db
    field --> db
    field --> store
    statements --> db
    statements --> pdf
    pdf --> store
    directory --> db
    directory --> alertjob
    alertjob --> channel
```

`Field Submission` is the one component `Access Control` does not gate — D3's
per-shift token is its own authorisation, resolved inside the component rather
than by the shared scope check.

---

## 6. Runtime View

The five scenarios, each with its failure branch, are diagrammed in
[design-analysis.md §IV](02-design-analysis.md#iv-sequence-diagrams): [create
contract](02-design-analysis.md#1-create-contract-with-sites-and-service-items),
[field submission](02-design-analysis.md#2-weekly-dispatch-and-field-shift-execution),
[dispute](02-design-analysis.md#3-dispute-a-shift),
[alerts](02-design-analysis.md#4-alerts-expiring-contract-and-missed-shift),
[month-end close](02-design-analysis.md#5-month-end-statement-export).

---

## 7. Deployment View

A target shape stated for estimating cost and operational surface, not a
provisioned environment — C6 and C7 keep §5.1's technology criteria unnamed, so
this names roles rather than products, beyond D2's choice of MinIO.

```mermaid
flowchart LR
    client["Desk & field browsers<br/><i>every tenant</i>"] -->|HTTPS| app
    platformclient["Platform Admin browser"] -->|HTTPS| app

    subgraph host["Shared host, all tenants (C4, D1)"]
        app["App process<br/>API + schedule generator + alert job<br/>every query tenant_id-filtered"]
        db[("Database<br/>one schema, tenant_id on every core table")]
        store[("Object storage<br/>keyed per tenant")]
    end

    app --> db
    app --> store
    app -->|HTTPS| zalo["Zalo ZNS / SMS"]
```

| Environment | Node | Runs | Note |
|---|---|---|---|
| Production, shared | App host | API, schedule generator, alert job | One shared host serves every tenant (C4, D1); scales by adding hosts behind a load balancer, not one host per tenant |
| Production, shared | Database | The 19-table relational model, one schema | Every core table's `tenant_id` is the isolation boundary — no per-tenant schema or database |
| Production, shared | Object storage | MinIO or a managed S3-compatible bucket | Object keys are prefixed by `tenant_id`; a bucket policy denies cross-prefix reads |

---

## 8. Crosscutting Concepts

### 8.1 Authorisation

Three distinct mechanisms, checked in order:

- **Tenant** is the outermost boundary and is checked first, before role or row scope even loads:
  every desk credential's token carries `tenant_id`, and every repository method takes it as a
  mandatory filter — there is no code path that queries `contracts`, `shifts`, `employees` or any
  other core table without one. A row belonging to a different tenant is not a `403`, it does not
  exist — same non-disclosure rule as §8's `404` for out-of-scope rows, one level up.
- **Desk roles**, inside that tenant, authenticate with `employees.email` / `password_hash`
  (unique globally, not per tenant — `db/schema.sql`'s `uq_employees_email`; login resolves the
  tenant from the matched employee, so the client never sends a `tenant_id`) and are authorised
  by role plus a row scope — own, team, managed unit, or all. The full matrix is in `05-api.md` §8.
- **Field access** carries a per-shift token (D3) and can reach exactly one shift; the token's
  `shift_id` already pins a `tenant_id` transitively, so no separate tenant check is needed there.

**Platform Admin** is a fourth, disjoint mechanism: `platform_admins` is not `employees`, carries no
`tenant_id`, and its credential can only reach `05-api.md` §10 and §11 — it cannot present a token
that resolves to any tenant's contracts, shifts or statements. Its dashboard (FR25) is bound by the
same rule: the aggregate it reads is computed from the `tenants` table alone and never joins into any
tenant-scoped table. There is no role that spans both worlds.

The two desk scopes rest on different columns: `team` resolves through `employees.team_id`, so a team
lead sees the shifts of the team they belong to; `unit` resolves through `employees.manager_id`, so a
manager sees everyone reporting to them. A director sees everything **inside their own tenant** — `all`
scope is still tenant-filtered, never cross-tenant. Desk staff have a `manager_id`
but no `team_id`, which is why they hold `unit` or `all` scope and never `team` — the small-company
target has field teams, not departments.

### 8.2 Evidence integrity and retention

Photos, GPS and timestamps are written once (D7). Server time is authoritative for `captured_at`; the
client clock is not trusted. Objects are retained at least 12 months (NFR4) via a bucket lifecycle
rule, which must outlive the statement that cites them.

### 8.3 Alert delivery and fallback

[PRD §7](01-prd.md#7-risks--dependencies) names channel reliability as a medium risk and requires a
fallback. Delivery is attempted on the configured channel (Zalo ZNS, SMS, or both); on failure the
alert is recorded in-app so it is visible on the Cảnh báo screen rather than silently dropped.

### 8.4 Weak-network behaviour

NFR1 requires the field page to work on 3G/4G at job sites and in basements. The design commitment is
that the field page is the lightest page in the system and images are downscaled in the browser
before upload. The remaining mechanics — resumable upload, offline queue — are open (§11 R4).

---

## 9. Architecture Decisions

| # | Decision | Context and options | Consequence | Revisit when |
|---|---|---|---|---|
| D1 | **Multi-tenant, shared schema, `tenant_id` row-level isolation** | LichHD is sold to many operating companies. Alternatives: a database per tenant, or a schema per tenant. Both isolate more strongly but multiply migration and backup work per tenant at a scale where that cost dominates; shared-schema with a mandatory `tenant_id` filter is the standard SaaS default at this profile. | Every core table carries `tenant_id` (`db/schema.sql`); every repository method requires it, not accepts it optionally. `employees.email` is unique globally (login resolves the tenant from the matched employee), while `teams.code` stays unique per tenant. A leak is a code-review-catchable bug (missing filter), not a schema question. (NFR6, G4) | Tenant count or per-tenant data volume grows enough that noisy-neighbor query load, not isolation, becomes the bottleneck — revisit toward schema-per-tenant or per-tenant read replicas then. |
| D2 | **Evidence in S3-compatible object storage (MinIO)** | Alternatives: blobs in the database, or a directory on the app server. Photos are the bulk of the data and are retained ≥ 12 months. | DB stays small and easy to back up; retention (NFR4) becomes a bucket lifecycle rule; a storage service must be operated alongside the database. | A managed object-storage tier becomes available at a cost point the operating budget cannot ignore, or self-hosting MinIO turns out to need more operational effort than the team has. |
| D3 | **Per-shift signed token for field access** | FR7 and NFR7 require a link that opens and works on a phone with no install. Alternatives: employee login, or a magic link per employee. | No password at a job site. The token names one shift, expires, and authorises only that shift's submission. Whoever holds the link can submit — acceptable because the evidence itself carries GPS and time. | A forwarded link is found to have been used by someone other than the assignee, or the business needs to know *who* submitted rather than only *that* the assigned shift was submitted. |
| D4 | **Photographed paper receipt, not on-screen signature** | The customer already signs paper today and the original is filed. | No signature-capture component; the evidence is an image like any other. The paper original remains the legal artifact. | A customer disputes a photographed receipt as illegible or fraudulent often enough that an on-screen signature becomes worth building. |
| D5 | **Customer is not a system actor** | The customer signs in person and complains by phone. | No customer login, no portal, no notification to customers in MVP. A manager records disputes manually (FR11). | Customers ask for self-service visibility into schedule or statements — a Should/Could-have already named in the PRD roadmap. |
| D6 | **Statements exclude disputed and evidence-less shifts** | A period cannot close while a shift is unresolved. | The accountant sees a blocked close with the offending shifts listed rather than an understated total. (FR15, seq. 5) | A customer needs a statement issued before every shift's dispute is resolved, which would require partial statements — not currently a use case. |
| D7 | **Evidence is write-once** | NFR2. Enforced in the API, not by database permissions. | A completed shift rejects a second submission; evidence columns and `shift_photos` rows are never updated after insert. Deletion follows contract cascade only. | A legitimate need for correction surfaces (wrong photo attached to the wrong shift) with no path but re-doing the whole shift. |

---

## 10. Quality Requirements

Each NFR restated as a concrete scenario with a pass/fail measure, so acceptance is
checkable rather than a matter of opinion. `02-design-analysis.md` states the NFRs;
this table states how each is tested.

| # | Source NFR | Scenario | Required response | Measure |
|---|---|---|---|---|
| QR1 | NFR1 | Employee opens the field page over a throttled 3G connection at a basement job site | Page becomes usable — photo capture available | Time to interactive ≤ 5 s on a 3G profile (~400 kbps, 400 ms RTT); page payload excluding photos ≤ 200 KB |
| QR2 | NFR2 | A completed shift is submitted again with the same or different evidence | Second submission is rejected; original evidence is untouched | `409 shift.already_completed`; no row in `shifts` or `shift_photos` for that shift changes after first completion |
| QR3 | NFR3 | An account of role X requests a resource or row outside its role/scope in `05-api.md` §8 | Request is refused | `403` for a wrong role, `404` for a right role but wrong scope — zero exceptions found against the matrix |
| QR4 | NFR4 | 12 months pass after a shift's evidence is captured | Photos remain retrievable | Bucket lifecycle rule confirms no object is deleted before `captured_at + 12 months` |
| QR5 | NFR5 | Accountant exports a statement, then exports contract data | Both formats open in their target tool | PDF renders with photos and receipt embedded; CSV/Excel opens with every `contract_items` and `shifts` column named in `db/schema.sql` |
| QR6 | NFR6 | An authenticated account of tenant A requests, by id, a resource belonging to tenant B (contract, shift, employee, statement, customer) | Request is refused exactly like an out-of-scope row | `404` for every core resource type, zero exceptions — automated per-endpoint sweep with two seeded tenants |
| QR7 | NFR7 | A newly hired field employee receives a shift link on a personal phone, no prior app install | Employee completes the shift | Zero installs, zero passwords entered, shift reaches `completed` |

QR1 and QR4 cannot be measured until R1 (stack) and R4 (weak-network mechanics) in
§11 are resolved — they are stated now so the target is fixed before the mechanism
is chosen.

---

## 11. Risks and Technical Debt

| # | Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|---|
| R1 | **Stack not yet selected.** Everything in §5.1 is stated as criteria rather than a name. | Blocks estimation, hiring, and turns §7's deployment view from concrete to hypothetical | High — certain until decided | Decide before sprint planning or committing a delivery date |
| R2 | **Resolved.** `contract_items.frequency` (`VARCHAR(100)` free text) is split into `frequency_count` (integer) and `frequency_unit_id` (FK to a `frequency_units` lookup) — both structured, so FR4's generator schedules off them directly with no parsing. A separate `frequency_rule` stays free text for the exact agreed placement when one exists (e.g. "thứ 7 hàng tuần"); real contracts negotiate placements too varied to fix into a grammar, so it is kept as a staff-facing note only and is never parsed — a director moves individual shifts by hand to match it. | — | — | Implemented in [`db/schema.sql`](db/schema.sql) |
| R3 | **Schedule generation timing undecided** — eager on contract creation, or a rolling job that keeps a horizon filled | Medium — affects term-change cost and initial contract-creation latency | Medium | Default to eager, as seq. 1 implies; revisit if term changes prove frequent |
| R4 | **Weak-network mechanics undecided** — resumable upload, offline queue, retry policy | High — QR1 cannot be verified without this | Medium | Design before the field page is built; §8.4 states the goal only |
| R5 | **ZNS sender identity, template registration and fallback order undecided** | Medium — blocks FR14; ZNS templates need registration lead time | Medium | Register ZNS templates early — an external dependency, independent of the stack decision |
| R6 | **Token lifetime and reissue policy for D3 undecided** | Low–Medium — too short breaks a delayed shift, too long keeps a forwarded link live | Low | Pick a conservative default; revisit after pilot feedback |
| R7 | **A single missing `tenant_id` filter in one repository method leaks one tenant's rows to another** | High — a cross-tenant data leak is a trust failure with every tenant at once, not one customer | Medium until enforced structurally | Make the filter structural, not a per-query habit — a base repository class or ORM global scope that every query inherits automatically; QR6's sweep is the regression test |
| R8 | **Noisy-neighbor load: one large-chain tenant's query volume degrades another tenant's response time** | Medium — grows with tenant count and size spread (C4) | Low at MVP tenant counts | Index every `tenant_id` column (done, `db/schema.sql`); revisit connection pooling / read replicas if a pilot tenant's chain scale shows contention |

**Accepted for this design phase:** no customer-facing portal (D5), no on-screen
signature (D4), no ERP integration (C2) — each is a named non-goal, not an
oversight.

---

## 12. Glossary

| Term | Definition |
|---|---|
| Tenant | One operating company using LichHD (`tenants`) — the isolation boundary. Not to be confused with `Customer`, which is a tenant's own client |
| Platform Admin | LichHD's own operator identity (`platform_admins`), outside every tenant; creates and suspends `tenants` rows and nothing else |
| Contract | The recurring service agreement between a tenant and one of its customer companies; the entity sites, items, shifts and statements derive from |
| Contract site | One physical location covered by a contract |
| Contract item | One billable service line at a site, carrying a frequency and unit price |
| Shift | One scheduled occurrence of a contract item, generated from its frequency |
| Evidence | Before/after photos, GPS, timestamp and photographed signed receipt captured at a shift |
| Statement | The monthly PDF billing document computed from a period's completed shifts |
| Field token | The per-shift signed link that authorises evidence submission with no login (D3) |
| Row scope | The own/team/unit/all boundary that narrows which rows a role's operation applies to |
| Team | An explicit group of field staff (`teams`); membership is `employees.team_id`, separate from the reporting line `manager_id` |
| Dispute | A customer complaint recorded by staff on the customer's behalf; excludes the shift from the next statement until resolved |
| Reconciliation | The accountant's view comparing shifts due by frequency against shifts with complete evidence |

---

