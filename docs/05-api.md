# LichHD — API specification

> **Status:** Draft — endpoint shapes settled, transport details follow the stack decision ([`04-architecture.md`](04-architecture.md#11-risks-and-technical-debt) R1)
> **Audience:** Developers building the server or a client against it
> **Answers:** Which operations exist, who may call them, and over what rows?

Every endpoint traces to a requirement in [`02-design-analysis.md`](02-design-analysis.md). Field names match
the columns in [`db/schema.sql`](db/schema.sql).

Machine-readable version: [`05-api.yaml`](05-api.yaml), OpenAPI 3.0 — every operation, request/response
schema and error-code example below also lives there, loadable in Swagger UI, Redoc or any OpenAPI-aware
client. This file is the prose walkthrough; `05-api.yaml` is the contract.

---

## 1. Conventions

**Base path** `/api/v1`. JSON request and response bodies, UTF-8.

**Authentication.** Three mechanisms, per [`04-architecture.md`](04-architecture.md#81-authorisation):

| Surface | Mechanism |
|---|---|
| Desk endpoints (`/contracts`, `/shifts`, …) | Session or bearer token issued by `POST /auth/login`, carrying `tenant_id` + `role`, carried on every request |
| Field endpoints (`/field/*`) | Per-shift signed token in the path; no session, no login |
| Platform endpoints (`/platform/*`, [§10](#10-platform-administration--fr23-fr24)) | Bearer token issued by `POST /platform/auth/login` against `platform_admins` — carries no `tenant_id`, cannot reach any `/api/v1/*` desk or field endpoint |

**Tenant scope.** Every desk token names exactly one `tenant_id`, resolved once at login and never
switched without logging in again. Every query below — list or single-resource — is filtered by it
first, before role or row scope: a `GET /contracts/{id}` for a contract in another tenant returns `404`,
identically to a row outside the caller's row scope ([`04-architecture.md`](04-architecture.md#81-authorisation)).

**Row scope.** Within that tenant, authorisation is role plus scope — a role grants an operation, the
scope restricts which rows it applies to. Scopes: `own` (rows where the caller is the assignee), `team`
(employees sharing the caller's `employees.team_id`, which is `NULL` for desk staff — they hold no `team`
scope), `unit` (employees reporting to the caller via `employees.manager_id`), `all` (every row **in the
caller's tenant** — never cross-tenant).

**Errors.** A single shape, HTTP status plus a stable code:

```json
{ "error": { "code": "shift.already_completed", "message": "Ca đã hoàn thành", "details": {} } }
```

Success statuses:

| Status | Returned by |
|---|---|
| 200 | Every `GET`, and any `PATCH` or action `POST` that returns the updated resource |
| 201 | `POST /contracts`, `/contracts/{id}/sites`, `/sites/{siteId}/items`, `/statements`, `/customers`, `/employees` — `Location` names the new resource |
| 202 | `POST /contracts/{id}/schedule:regenerate`, `POST /statements/{id}/export`, `POST /alerts/{id}/send` — work that completes out of band; body carries the job reference |
| 204 | Every `DELETE`, and `POST /auth/logout` — no body |

Error statuses:

| Status | Used for |
|---|---|
| 400 | Malformed body or failed validation (`details` lists the offending fields) |
| 401 | Missing or expired credential; expired field token |
| 403 | Authenticated but out of role or out of scope |
| 404 | Not found, or found but outside the caller's scope — the two are not distinguished |
| 409 | State conflict: re-submitting a completed shift, closing a period with unresolved shifts |
| 413 | Upload exceeds the per-image limit |
| 422 | Well-formed and permitted, but not satisfiable — a frequency that yields no shifts in the term |
| 429 | Field-token endpoints only: too many redemption or upload attempts on one token |
| 502 | An external provider (Zalo ZNS, SMS) rejected the request |

Codes are listed in full in [§9](#9-error-codes).

**Collections** return `{ "items": [...], "total": n, "limit": n, "offset": n }`. Default limit 25,
maximum 100.

**Timestamps** are ISO 8601 UTC and server-assigned. A client-supplied time is never trusted for
evidence ([`04-architecture.md`](04-architecture.md#82-evidence-integrity-and-retention)).

---

## 2. Authentication — FR22

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/login` | Exchange `tenant_id` (or a tenant-unique slug) + `username` + `password` for a credential. Returns the employee's `tenant_id`, `role` and `id`. `401 tenant.suspended` if the tenant is not active. |
| POST | `/auth/logout` | Invalidate the current credential. |
| GET | `/auth/me` | Current employee, tenant, role, and manager chain — drives client-side navigation scoping. |

---

## 3. Contracts — FR1, FR2, FR3

| Method | Path | Purpose |
|---|---|---|
| GET | `/contracts` | List. Filters: `status`, `expiring_within_days`, `customer_id`, `q`. |
| POST | `/contracts` | Create with customer, `signed_at`, `expires_at`, and nested sites and items. Generates shifts — see §4.1. |
| GET | `/contracts/{id}` | Contract with sites, items, current-period progress and statement history. |
| PATCH | `/contracts/{id}` | Update term or status. **Director only.** |
| DELETE | `/contracts/{id}` | Cascades to sites, items, shifts, photos, statements. **Director only.** |
| POST | `/contracts/{id}/sites` · PATCH · DELETE `/sites/{siteId}` | Sites. Update and delete are Director only. |
| POST | `/sites/{siteId}/items` · PATCH · DELETE `/items/{itemId}` | Service items — `name`, `frequency`, `unit_price`. Update and delete are Director only. |

`POST /contracts` returns `400` with `contract.item_invalid` when an item is missing a frequency or
carries a non-positive `unit_price`, matching the `alt validation failed` branch of sequence 1.

### 3.1 Schedule generation — FR4

Creating a contract generates `shifts` for every item across the term from the item's `frequency`.
Frequency currently has **no grammar** — see [`04-architecture.md`](04-architecture.md#11-risks-and-technical-debt) R2;
this endpoint cannot be finished until that is resolved.

| Method | Path | Purpose |
|---|---|---|
| POST | `/contracts/{id}/schedule:regenerate` | Regenerate future shifts after an item or term change. Never touches a completed or disputed shift. |

---

## 4. Shifts — FR5, FR6, FR11

| Method | Path | Purpose |
|---|---|---|
| GET | `/shifts` | List, always scope-filtered. Filters: `from`, `to`, `status`, `assignee_id`, `contract_id`, `team_id`, `manager_id`. |
| GET | `/shifts/{id}` | Shift with contract, site, item, assignee, evidence and GPS. |
| PATCH | `/shifts/{id}` | Reassign (`assignee_id`) or reschedule (`scheduled_date`). Rejected on a completed shift. **Team lead, within team.** |
| POST | `/shifts/{id}/dispute` | Mark disputed with a reason recorded by staff on the customer's behalf. **Manager, Director.** |
| POST | `/shifts/{id}/dispute:resolve` | Evidence upheld — return the shift to completed. **Manager, Director.** |
| GET | `/shifts/{id}/link` | Issue the per-shift field token and its URL. **Team lead, Manager, Director.** |

`GET /shifts` is the single endpoint behind four different screens; the scope column in §8 is what
makes "Ca của tôi", "Lịch tổ" and "Lịch điều phối" different views of it.

---

## 5. Field submission — FR7, FR8, FR9, FR10

Unauthenticated in the session sense; authorised by the token, which names exactly one shift.

| Method | Path | Purpose |
|---|---|---|
| GET | `/field/{token}` | Shift context: site, service item, scheduled time, and which evidence steps remain. `401` with `token.expired` once past its lifetime. |
| POST | `/field/{token}/uploads` | Request an upload target per image. Returns a direct object-storage URL and the key to cite on submit. |
| POST | `/field/{token}/submit` | Complete the shift: `photo_keys[]` typed before/after, `receipt_photo_key`, `latitude`, `longitude`. |

On submit the server stamps `captured_at` from its own clock, inserts `shift_photos`, sets
`shifts.status = completed`, and writes `receipt_photo_url`. Re-submitting returns `409`
`shift.already_completed` — evidence is write-once
([`04-architecture.md`](04-architecture.md#9-architecture-decisions) D7).

`latitude` and `longitude` may be null; the shift still completes and is flagged for missing location,
matching the `else no GPS signal` branch of sequence 2.

---

## 6. Statements — FR15, FR16, FR19, FR20

| Method | Path | Purpose | Requirement |
|---|---|---|---|
| GET | `/statements` | List by `period` and `status`. | FR15 |
| POST | `/statements` | Compute a draft for `contract_id` + `period` from completed shifts × `contract_items.unit_price`. | FR15 |
| GET | `/statements/{id}` | Statement with its shift lines and evidence references. | FR15 |
| POST | `/statements/{id}/export` | Render the PDF with photos and receipts embedded; sets `status = issued`, writes `pdf_url`. | FR16 |
| POST | `/statements/{id}/send` | Record that it was sent to the customer; sets `status = sent`. | FR19 |
| GET | `/reconciliation?period=` | Per contract: shifts due by frequency, shifts with complete evidence, and the variance. | FR20 |

`POST /statements` returns `409` `statement.period_incomplete` with the offending shifts in `details`
when any shift in the period lacks evidence or is disputed
([`04-architecture.md`](04-architecture.md#9-architecture-decisions) D6).

---

## 7. Alerts, dashboard, customers, employees

| Method | Path | Purpose | Requirement |
|---|---|---|---|
| GET | `/alerts` | Expiring contracts and overdue shifts, with per-alert delivery status. | FR12, FR13 |
| POST | `/alerts/{id}/send` | Re-send through Zalo ZNS or SMS. | FR14 |
| GET | `/dashboard` | Active, expiring and disputed contract counts; projected revenue. **Director.** | FR17 |
| GET POST PATCH DELETE | `/customers` , `/customers/{id}` | Customer records. | FR21 |
| GET POST PATCH DELETE | `/employees` , `/employees/{id}` | Accounts with `role_id`, `manager_id` and `team_id`. **Director only.** | FR18 |
| GET POST PATCH DELETE | `/teams` , `/teams/{id}` | Teams with `name` and `code`; the response derives `lead` and `member_count` from `employees`. Create, update and delete are **Director only**. | FR18 |

---

## 8. Access control

Role grants the operation; scope restricts the rows. `—` is no access. This table is the contract
that `SCREEN_ROLES` in [`prototype.html`](ui/prototype.html) must agree with.

| Resource | Director | Manager | Accountant | Team lead | Employee | Platform Admin |
|---|---|---|---|---|---|---|
| Contracts | R C U D · all | R C · all | R · all | — | — | — |
| Sites, service items | R C U D · all | R C · all | R · all | — | — | — |
| Shifts | R · all | R · unit | — | R U · team | R · own | — |
| Shift evidence | R · all | R · unit | R · all | R · team | R · own | — |
| Dispute a shift | C U · all | C U · unit | — | — | — | — |
| Field submission | — | — | — | token · one shift | token · one shift | — |
| Statements | R · all | R · all | R C U · all | — | — | — |
| Reconciliation | R · all | — | R · all | — | — | — |
| Alerts | R U · all | R U · unit | — | R · team | — | — |
| Dashboard | R · all | — | — | — | — | — |
| Customers | R C U D · all | R C · all | R · all | — | — | — |
| Employees | R C U D · all | — | — | — | — | — |
| Teams | R C U D · all | R · all | — | R · own team | — | — |
| Tenants | — | — | — | — | — | R C U · all |

R read · C create · U update · D delete. Every row and column above is additionally scoped to the
caller's own tenant — a `Director`'s `all` on `Contracts` means all contracts **in their tenant**, never
another tenant's. `Platform Admin` is the mirror case: it holds rights only on `Tenants`, and `—`
everywhere a tenant-scoped role has access, because it belongs to no tenant to scope into.

Two notes. **Field submission is not a role grant** — it is reached only with a per-shift token, which
is why employees and team leads have no create right on shifts elsewhere in the table. And a `404` is
returned for a row outside the caller's scope — tenant or row scope alike — rather than a `403`, so that
scope boundaries do not leak the existence of rows.

---

## 9. Error codes

`code` is stable and safe to branch on; `message` is Vietnamese display text and may change. `details`
carries what the client needs to act — the offending fields, the blocking rows — and is `{}` when
there is nothing to add.

### Authentication and authorisation

| Code | Status | Returned when | `details` |
|---|---|---|---|
| `auth.invalid_credentials` | 401 | `POST /auth/login` or `POST /platform/auth/login` with an unknown `(tenant_id, username)` / `username`, or wrong password. The two are not distinguished. | — |
| `auth.credential_expired` | 401 | Session or bearer token past its lifetime. | — |
| `auth.forbidden_role` | 403 | The role does not hold the operation in [§8](#8-access-control). | `required_role` |
| `auth.out_of_scope` | 404 | The row exists but falls outside the caller's row scope, or belongs to a different tenant. Deliberately indistinguishable from a missing row. | — |
| `tenant.suspended` | 401 | `POST /auth/login` for a tenant whose `tenants.status` is `suspended`. Checked before password verification. | — |
| `tenant.not_found` | 400 | `POST /platform/tenants/{id}` (`PATCH`) names no tenant. | `tenant_id` |

### Field token — `/field/*`

| Code | Status | Returned when | `details` |
|---|---|---|---|
| `token.invalid` | 401 | Signature does not verify, or the token names no shift. | — |
| `token.expired` | 401 | Past its lifetime ([`04-architecture.md`](04-architecture.md#11-risks-and-technical-debt) R6). | `expired_at` |
| `token.shift_mismatch` | 403 | The token's shift is not the shift being submitted. | — |
| `token.rate_limited` | 429 | Repeated redemption or upload attempts on one token. | `retry_after_seconds` |

### Contracts and schedule generation

| Code | Status | Returned when | `details` |
|---|---|---|---|
| `contract.item_invalid` | 400 | An item is missing `frequency` or carries a non-positive `unit_price` — sequence 1's `alt validation failed`. | `items[]` with the offending index and field |
| `contract.term_invalid` | 400 | `expires_at` is not after `signed_at`. | `signed_at`, `expires_at` |
| `contract.customer_not_found` | 400 | `customer_id` names no customer. | `customer_id` |
| `contract.frequency_unparsable` | 422 | `frequency` does not match the generator's grammar — blocked on [`04-architecture.md`](04-architecture.md#11-risks-and-technical-debt) R2. | `item_id`, `frequency` |
| `schedule.no_shifts_generated` | 422 | The frequency parses but yields no occurrence inside the term. | `item_id` |
| `schedule.regenerate_blocked` | 409 | Regeneration would move a completed or disputed shift. | `shift_ids[]` |

### Shifts and evidence

| Code | Status | Returned when | `details` |
|---|---|---|---|
| `shift.already_completed` | 409 | Re-submitting, reassigning or rescheduling a completed shift — evidence is write-once ([`04-architecture.md`](04-architecture.md#9-architecture-decisions) D7). | `completed_at` |
| `shift.evidence_incomplete` | 400 | Submit is missing a required photo type or `receipt_photo_key`. | `missing[]` |
| `shift.assignee_out_of_team` | 403 | Reassigning to an employee outside the caller's team. | `assignee_id` |
| `shift.not_disputed` | 409 | `dispute:resolve` on a shift that is not disputed. | `status` |
| `shift.already_disputed` | 409 | `dispute` on a shift already disputed. | `disputed_at` |
| `upload.too_large` | 413 | An image exceeds the per-image limit after client-side downscaling. | `limit_bytes`, `actual_bytes` |
| `upload.unsupported_type` | 400 | Content type is not an accepted image type. | `content_type` |
| `upload.key_unknown` | 400 | Submit cites an object key that was never issued for this token. | `keys[]` |

### Statements and reconciliation

| Code | Status | Returned when | `details` |
|---|---|---|---|
| `statement.period_incomplete` | 409 | A shift in the period lacks evidence or is disputed ([`04-architecture.md`](04-architecture.md#9-architecture-decisions) D6). | `shift_ids[]` grouped by reason |
| `statement.already_exists` | 409 | A statement already exists for that `contract_id` + `period`. | `statement_id` |
| `statement.not_issued` | 409 | `send` before `export` — there is no PDF yet. | `status` |
| `statement.immutable` | 409 | Editing a statement already `issued` or `sent`. | `status` |

### Alerts, customers, employees

| Code | Status | Returned when | `details` |
|---|---|---|---|
| `alert.channel_unavailable` | 502 | Zalo ZNS and SMS both rejected the send; the alert falls back in-app ([`04-architecture.md`](04-architecture.md#8-crosscutting-concepts) §8.3). | `channel`, `provider_code` |
| `customer.has_active_contracts` | 409 | Deleting a customer that still holds a non-terminated contract. | `contract_ids[]` |
| `employee.has_assigned_shifts` | 409 | Deleting an employee still assigned to future shifts. | `shift_ids[]` |
| `employee.username_taken` | 409 | `username` is already in use. | `username` |
| `employee.manager_cycle` | 400 | `manager_id` would create a cycle in the reporting chain. | `path[]` |
| `team.code_taken` | 409 | `code` is already in use by another team. | `code` |
| `team.has_members` | 409 | Deleting a team that still has members. | `employee_ids[]` |
| `team.lead_conflict` | 409 | The team already has a member with the team-lead role. | `employee_id` |

An unrecognised code is handled as its HTTP status. Clients must not parse `message`.

---

## 10. Platform Administration — FR23, FR24

Reached only via `/platform/*`, authenticated only via `POST /platform/auth/login` against
`platform_admins` — disjoint from every endpoint above §2–§7. No `/platform/*` operation reads or
writes a `contract`, `shift`, `statement`, `customer`, `employee` or `team` row; the only resource is
`tenants` itself ([§8](#8-access-control)).

| Method | Path | Purpose |
|---|---|---|
| POST | `/platform/auth/login` | Exchange `username` + `password` (against `platform_admins`) for a platform credential. |
| GET | `/platform/tenants` | List tenants. Filters: `status`. |
| POST | `/platform/tenants` | Create a tenant (`name`) and its first employee in one call (`director_username`, `director_password`) — FR23. Returns the new `tenant_id` and `employee_id`. |
| PATCH | `/platform/tenants/{id}` | Set `status` to `suspended` or `active` — FR24. A suspended tenant's `POST /auth/login` starts failing with `tenant.suspended` immediately; a session already issued before suspension is not retroactively revoked — an open risk tracked alongside [`04-architecture.md`](04-architecture.md#11-risks-and-technical-debt) R6's token-lifetime work. |

---
