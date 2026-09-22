# Contrack — architecture reference ports

Two from-scratch, standalone reference implementations of one slice of
`backend/` — the **contracts** domain (contracts, contract sites, contract
items, schedule generation) — rebuilt under two different architecture
styles, so you can compare them on the same real business rules instead of
on toy examples:

- **[`ddd/`](ddd/README.md)** — Domain-Driven Design (tactical patterns:
  bounded context, aggregate root, value objects, repository port, domain
  events-shaped errors).
- **[`clean/`](clean/README.md)** — Clean Architecture (Uncle Bob's four
  concentric layers, strict dependency rule, inner-layer-owned gateway
  interfaces).

Neither touches `backend/` — both are self-contained NestJS + TypeORM
packages with their own `package.json`:

```bash
cd template/ddd   && npm install && npm run build && npx jest
cd template/clean && npm install && npm run build && npx jest
```

Only `contracts` is fully ported in either. The other ~12 domains
(customers, employees, teams, shifts, statements, alerts, auth, dashboard,
field, platform, tenants, contract-costs) are **not** implemented — each
README ends with a worked "how you'd port `customers` next" walkthrough
instead.

## They are not the same folders with different names

DDD and Clean Architecture overlap heavily in spirit (both want business
rules isolated from frameworks, both end up with something that smells like
"entities" and "use cases" and "framework-free unit tests"), which is
exactly why it's easy to build two identical trees and slap different labels
on them. These two ports are deliberately organized around a genuinely
different primary axis, and it shows up as a real structural difference, not
just naming:

| | `ddd/` | `clean/` |
|---|---|---|
| **Primary organizing axis** | *Bounded context* first (`contexts/contracts/`), architectural layer second. A second context (e.g. `contexts/customers/`) would be a sibling directory with its own domain/application/infrastructure, not a shared layer folder. | *Dependency-direction layer* first (`entities/`, `use-cases/`, `interface-adapters/`, `frameworks-drivers/`), module second. Every domain would share the same four top-level layer names; `contracts` is one `modules/` subtree among others. |
| **Where cross-cutting concepts live** | `shared-kernel/` — a named DDD concept for primitives every bounded context can use (`TenantId`, `Money`, `DomainError`) without one context depending on another's internals. | No shared-kernel concept; `Money`/`DomainError` simply live in `entities/` as part of this module's enterprise rules. Cross-module reuse isn't modeled because only one module exists here — Clean Architecture doesn't prescribe a kernel concept the way DDD does. |
| **The "root" object** | An **aggregate root** (`contract.aggregate.ts`): `Contract` is the only externally-mutable object; `ContractSite`/`ContractItem` cannot be constructed and attached from outside it. The concept of a consistency boundary is explicit and named. | An **entity** (`entities/contract.ts`) enforcing the same invariant, but Clean Architecture doesn't have a named "aggregate root vs. plain entity" distinction — everything in `entities/` is just "enterprise business rules". |
| **Who owns the repository interface** | `domain/contract-repository.port.ts` — owned by the *domain* layer specifically, because in DDD the domain model (not the use cases) is the thing infrastructure serves. | `use-cases/ports.ts` — owned by the *use-case* layer specifically, because Clean Architecture's dependency rule is stated in terms of use cases as the application's organizing layer; entities are even more inward and don't reference persistence at all. |
| **Application layer's job** | `application/use-cases/*` — described as *application services* orchestrating the domain, explicitly secondary to the domain model, which is where DDD says the real business meaning lives. | `use-cases/*` — described as *the* application business rules layer, the second-innermost ring, with explicit input/output boundary types per use case; this is Clean Architecture's central unit, not a thin orchestration layer over something else. |
| **HTTP-facing translation** | `infrastructure/http/contracts.http-mapper.ts` + `domain-error.filter.ts` — infrastructure's job to adapt in *and* out. | A dedicated `interface-adapters/presenters/` layer, structurally separate from `frameworks-drivers/web/` — Clean Architecture explicitly names "controller" and "presenter" as distinct interface-adapter roles, one layer inward of the actual framework glue. |
| **Next module you'd add** | A sibling bounded context: `contexts/customers/{domain,application,infrastructure}/`. | A sibling module under the *same* four layers: `modules/customers/{entities,use-cases,interface-adapters,frameworks-drivers}/`. |

The practical rule of thumb this repo settled on: **if you're asking "what
business capability is this?" you're doing DDD's job (bounded context); if
you're asking "how far is this file from a database/HTTP framework?" you're
doing Clean Architecture's job (layer)**. Both are legitimate answers to
"keep business rules independent of frameworks" — DDD gets there by naming
business capabilities and their boundaries, Clean Architecture gets there by
naming a strict inward dependency direction. A production rewrite of
`backend/` could reasonably combine both (bounded contexts on the outside,
Clean Architecture layers inside each context) — that combination is
intentionally left as an exercise, not built here, to keep each reference
small enough to read in one sitting.

## Shared simplifications

Both ports made the identical set of scope cuts, for the identical reason —
faithfully porting *only* `contracts` means anything reaching into another
domain gets stubbed, not built:

- **Access control stubbed** to a plain `x-tenant-id` header; every
  use-case/application-service still takes a tenant id as a mandatory first
  argument, matching `backend/repositories/tenant-scoped.repository.ts`'s
  discipline, so wiring in real auth later is a `frameworks-drivers`/
  `infrastructure` change only.
- **No shift generation, schedule rebalancing, or overload alerts** —
  `backend/services/contracts/contract-assembler.ts` and
  `schedule-rebalancer.ts` reach into the Shifts/Teams/Alerts domains. Only
  the pure date math (`schedule-generator.service.ts`) is ported, exposed as
  its own "generate schedule" operation.
- **Lookup-table foreign keys flattened** to plain varchar columns — the
  value objects (`Frequency`/`ContractItem`) are what actually enforce which
  values are legal, so the extra indirection isn't needed to preserve
  correctness, only to preserve the exact original schema.
- **`pg-mem`** (already a `backend/` devDependency, pure JS, no native build
  step) over a native sqlite driver for the one infrastructure-level
  integration test each port has proving its ORM repository satisfies its
  own port/gateway interface.

See each package's own README for the full, module-specific list and the
"port `customers` next" walkthrough.
