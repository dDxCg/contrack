# db

Data model for LichHD.

| File | Contents |
|---|---|
| [`schema.sql`](schema.sql) | 16 tables, DDL with constraints and indexes |
| [`erd.md`](erd.md) | Entity-relationship diagram (mermaid) |

## Tables

**Lookup** — `roles`, `customer_segments`, `employee_statuses`, `contract_statuses`,
`shift_statuses`, `photo_types`, `statement_statuses`. Enumerations are lookup tables
rather than SQL `ENUM` types: portable across engines, and values are added without
a schema migration.

**Core** — `customers` → `contracts` → `contract_sites` → `contract_items` → `shifts`
→ `shift_photos`, plus `teams` and `employees`, and `statements`
(one per contract per period, unique on `(contract_id, period)`).

**Teams.** `employees.team_id` is the only record of membership, and it is `NULL` for desk staff —
they belong to no team. `manager_id` is the reporting line and is never read to decide which team
someone is in. A team's lead is the member whose role is team lead; `teams` holds no `lead_id`, so
there is no pair of columns that can disagree.

## Conventions

- Identity primary keys: `INTEGER GENERATED ALWAYS AS IDENTITY`.
- Foreign keys named `fk_<table>_<target>`; indexes named `idx_<table>_<column>`.
- `ON DELETE CASCADE` follows contract ownership: deleting a contract removes its
  sites, items, shifts, photos and statements.
- Money as `NUMERIC(14,2)`; GPS as `NUMERIC(9,6)`.
- Field evidence columns on `shifts` (`latitude`, `longitude`, `captured_at`,
  `receipt_photo_url`) are write-once by application rule — see
  [NFR2](../docs/design-analysis.md#non-functional-requirements).

Requirements this model implements: [`docs/design-analysis.md`](../docs/design-analysis.md).
