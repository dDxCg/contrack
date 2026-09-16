# db

Data model for LichHD.

| File | Contents |
|---|---|
| [`schema.sql`](schema.sql) | 21 tables, DDL with constraints and indexes |
| [`erd.md`](erd.md) | Entity-relationship diagram (mermaid) |

## Tables

**Platform** — `tenants` (one row per operating company), `tenant_statuses`, and
`platform_admins` — LichHD's own ops identity, outside every tenant, the only role
that can create or suspend a `tenants` row.

**Lookup** — `roles`, `customer_segments`, `employee_statuses`, `contract_statuses`,
`shift_statuses`, `photo_types`, `statement_statuses`, `cost_categories`.

**Core** — `customers` → `contracts` → `contract_sites` → `contract_items` → `shifts`
→ `shift_photos`, plus `teams`, `employees`, `statements` (one per contract per
period, unique on `(contract_id, period)`) and `contract_costs` (one per contract
per cost category per month, unique on `(contract_id, category_id, period)` — FR26,
labor/materials/other costs an Accountant records to compute profit/loss per
contract). Every core table carries `tenant_id` — a tenant's rows never join across
into another tenant's.

**Teams.** `employees.team_id` is the only record of membership and is `NULL` for
desk staff. `manager_id` is the reporting line and is not read to resolve a team.
The lead is the member holding the team-lead role — `teams` carries no `lead_id`.

## Conventions

- Identity primary keys: `INTEGER GENERATED ALWAYS AS IDENTITY`.
- Foreign keys named `fk_<table>_<target>`; indexes named `idx_<table>_<column>`.
- `ON DELETE CASCADE` follows contract ownership: deleting a contract removes its
  sites, items, shifts, photos and statements.
- Money as `NUMERIC(14,2)`; GPS as `NUMERIC(9,6)`.
- Field evidence columns on `shifts` (`latitude`, `longitude`, `captured_at`,
  `receipt_photo_url`) are write-once by application rule — see
  [NFR2](../02-design-analysis.md#non-functional-requirements).
- `tenant_id` on every core table is NOT NULL, indexed, and every repository query
  filters on it — see [NFR6](../02-design-analysis.md#non-functional-requirements)
  and [D1](../04-architecture.md#9-architecture-decisions).
- `employees.username` and `teams.code` are unique **per tenant**
  (`uq_employees_tenant_username`, `uq_teams_tenant_code`), not globally — two
  tenants may each have a `director` login.

Requirements this model implements: [`02-design-analysis.md`](../02-design-analysis.md).
