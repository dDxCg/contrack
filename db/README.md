# db

Data model for LichHD.

| File | Contents |
|---|---|
| [`schema.sql`](schema.sql) | 15 tables, DDL with constraints and indexes |
| [`erd.md`](erd.md) | Entity-relationship diagram (mermaid) |

## Tables

**Lookup** — `roles`, `customer_segments`, `employee_statuses`, `contract_statuses`,
`shift_statuses`, `photo_types`, `statement_statuses`. Enumerations are lookup tables
rather than SQL `ENUM` types: portable across engines, and values are added without
a schema migration.

**Core** — `customers` → `contracts` → `contract_sites` → `contract_items` → `shifts`
→ `shift_photos`, plus `employees` (self-referencing via `manager_id`) and
`statements` (one per contract per period, unique on `(contract_id, period)`).

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
