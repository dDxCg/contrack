# db

Data model for LichHD.

| File | Contents |
|---|---|
| [`schema.sql`](schema.sql) | 17 tables, DDL with constraints and indexes |
| [`erd.md`](erd.md) | Entity-relationship diagram (mermaid) |

## Tables

**Lookup** — `roles`, `customer_segments`, `employee_statuses`, `contract_statuses`,
`shift_statuses`, `photo_types`, `statement_statuses`.

**Core** — `customers` → `contracts` → `contract_sites` → `contract_items` → `shifts`
→ `shift_photos`, plus `teams`, `employees` and `statements` (one per contract per
period, unique on `(contract_id, period)`).

**Teams.** `employees.team_id` is the only record of membership and is `NULL` for
desk staff. `manager_id` is the reporting line and is not read to resolve a team.
The lead is the member holding the team-lead role — `teams` carries no `lead_id`.

**Tenants.** `tenants` exists for the cloud package only — one shared deployment
serving several operating companies. `tenant_id` sits on `contracts`, `employees`
and `teams`, the tables a tenant directly creates; `contract_sites`, `contract_items`,
`shifts`, `shift_photos` and `statements` resolve their tenant by joining up to
`contracts`, same as they already resolve their customer. `customers` carries no
`tenant_id` — a customer is the operating company's own client, not a LichHD
subscriber, and is reached only through `contracts.customer_id`; a customer added
before any contract exists has no tenant-scoping path yet ([03-architecture.md
§11](../docs/03-architecture.md#11-risks-and-technical-debt)). Every `tenant_id` is
`NULL` for a self-host deployment, which has no tenant filtering at all.

## Conventions

- Identity primary keys: `INTEGER GENERATED ALWAYS AS IDENTITY`.
- Foreign keys named `fk_<table>_<target>`; indexes named `idx_<table>_<column>`.
- `ON DELETE CASCADE` follows contract ownership: deleting a contract removes its
  sites, items, shifts, photos and statements.
- Money as `NUMERIC(14,2)`; GPS as `NUMERIC(9,6)`.
- Field evidence columns on `shifts` (`latitude`, `longitude`, `captured_at`,
  `receipt_photo_url`) are write-once by application rule — see
  [NFR2](../docs/02-design-analysis.md#non-functional-requirements).

Requirements this model implements: [`docs/02-design-analysis.md`](../docs/02-design-analysis.md).
