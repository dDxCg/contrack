# Contrack — DDD reference port (contracts bounded context)

This is a from-scratch, framework-conscious reference implementation of
**one** slice of the Contrack backend — contracts, contract sites, contract
items, and schedule generation — rebuilt with explicit Domain-Driven Design
tactical patterns. It exists to answer a concrete question: *"what would it
look like if we organized the backend by bounded context and layer instead
of by NestJS module type?"* It is not a replacement for `backend/`, and it
does not attempt to port the other ~12 domains (customers, employees, teams,
shifts, statements, alerts, auth, platform admin, …) — those get a
walkthrough at the bottom of this file instead of real code.

`cd template/ddd && npm install && npm run build && npx jest` builds and
tests this package completely standalone; it does not depend on anything
under `backend/`.

## Why this exists

The original `backend/` is organized by **technical layer across the whole
app**: `controllers/`, `services/`, `models/`, `repositories/`, `dtos/`. That
is a perfectly reasonable way to build a NestJS app, but it means the rules
that make a contract valid — "a contract needs at least one site, each site
needs at least one item", "day_of_week and day_of_month are mutually
exclusive" — live inside a `@Injectable()` service method
(`ContractService#create` / the module-level `validate()` helper in
`backend/services/contracts/contract.service.ts`) sitting next to
transaction handling, alert-firing and shift generation. Nothing stops a
caller from constructing a `ContractItem` entity in an invalid state and
forgetting to call `.assertValid()`.

This port flips the organizing principle: **organize by bounded context
first** (`contexts/contracts/`), and **inside each context, organize by
architectural layer** (`domain/`, `application/`, `infrastructure/`). The
payoff is that the invariants above become impossible to bypass —
`Frequency.create(...)` either returns a valid `Frequency` or throws, there
is no third option — and `domain/` + `application/` become testable with
plain Jest and zero database, zero HTTP server, zero NestJS DI container.

## Folder layout

```
src/
  shared-kernel/                    # concepts every bounded context can use
    tenant-id.ts                    # TenantId — threaded through every layer
    domain-error.ts                 # DomainError base (no HTTP status baked in)
    money.ts                        # Money — Big.js-backed, 2dp half-up rounding

  contexts/
    contracts/                      # the ONE bounded context ported in full
      domain/                       # <- zero framework dependencies. See below.
        value-objects/
          frequency-unit.ts
          frequency.ts               # immutable, self-validating
          date-range.ts
        contract-item.entity.ts      # entity local to the aggregate
        contract-site.entity.ts      # entity local to the aggregate
        contract.aggregate.ts        # AGGREGATE ROOT — the consistency boundary
        contract-repository.port.ts  # interface only — no TypeORM types
        schedule-generator.domain-service.ts
        errors.ts                    # DomainError subclasses, no HTTP status

      application/                  # <- depends only on domain/ + the port
        use-cases/                   # one class per use-case
          create-contract.use-case.ts
          list-contracts.use-case.ts
          get-contract-detail.use-case.ts
          update-contract.use-case.ts
          delete-contract.use-case.ts
          add-contract-site.use-case.ts
          add-contract-item.use-case.ts
          update-contract-item.use-case.ts
          generate-schedule.use-case.ts
        dto/
          contract.dto.ts             # camelCase application-layer shapes
          contract.mapper.ts          # domain <-> application DTO

      infrastructure/               # <- the only layer allowed to know about
                                     #    NestJS, TypeORM, HTTP, SQL
        persistence/
          contract.orm-entity.ts          # TypeORM entity (NOT the domain entity)
          contract-site.orm-entity.ts
          contract-item.orm-entity.ts
          contract.persistence-mapper.ts  # explicit domain <-> ORM mapping
          typeorm-contract.repository.ts  # implements contract-repository.port.ts
        http/
          dto/
            contract-request.dto.ts   # snake_case wire shape, class-validator
            contract-response.dto.ts
            page-query.dto.ts
          contracts.http-mapper.ts    # snake_case wire <-> camelCase application DTO
          contracts.controller.ts     # NestJS controller, HTTP <-> use-case only
          contracts.module.ts         # NestJS Module: binds port -> TypeOrmContractRepository
          domain-error.filter.ts      # the ONLY place a DomainError becomes an HTTP status
          validation.ts               # class-validator errors -> ValidationFailedError

  data-source.ts                    # trimmed TypeORM DataSource (contracts entities only)
  health.controller.ts
  app.module.ts                     # wires ContractsModule + global ValidationPipe
  main.ts                           # NestFactory bootstrap

tests/
  shared-kernel/                    # Money, TenantId — plain Jest, no framework
  domain/contracts/                 # Frequency, Contract aggregate invariants,
                                     # ScheduleGeneratorDomainService date math
  application/contracts/            # use-cases against an in-memory fake repository
  support/
    in-memory-contract.repository.ts  # fake ContractRepositoryPort for tests
```

## Why `domain/` has zero framework dependencies

Open any file under `contexts/contracts/domain/` and you will not find a
single `import` from `@nestjs/*`, `typeorm`, `express`, or any HTTP-shaped
type. That is not an accident of this particular port — it is the entire
point of putting `domain/` in its own directory. Two consequences fall out
of it directly:

1. **Every domain rule is testable with `new` and `expect`, no setup.**
   `tests/domain/contracts/frequency.test.ts` does
   `Frequency.create({ count: 1, unit: FrequencyUnit.Week, dayOfMonth: 15 })`
   and asserts it throws `InvalidFrequencyError` — no `TestingModule`, no
   in-memory database, no HTTP client. Compare this to testing
   `ContractItem#assertValid()` in `backend/`, which is also framework-free
   today, but nothing in the file layout *enforces* that it stays that way;
   here, a domain file that tried to `import { Injectable } from
   '@nestjs/common'` would be an obvious layering violation on sight, and
   this port simply never introduces one.
2. **The domain model can be swapped onto a different delivery mechanism**
   (a CLI, a queue worker, a different web framework) by writing a new
   `infrastructure/` layer, without touching a single invariant.

`application/` is allowed one more dependency than `domain/`: the
repository **port** (an interface, `ContractRepositoryPort`), never a
concrete implementation. That's what makes
`tests/application/contracts/*.test.ts` able to run a real use-case
(`CreateContractUseCase`, `ListContractsUseCase`, …) against
`InMemoryContractRepository` — a ~60-line fake — instead of a database.

## What "aggregate root" and "repository port" mean here

**Aggregate root** (`contract.aggregate.ts`): `Contract` is the only object
external code is allowed to obtain and mutate directly. `ContractSite` and
`ContractItem` live *inside* a `Contract` — you cannot construct a
`ContractSite` with orphan items and staple it onto a contract from outside;
you either pass fully-formed sites into `Contract.create(...)` (which
enforces "≥1 site, each site ≥1 item" right there, throwing
`ContractRequiresSiteError` / `ContractSiteRequiresItemError` if violated)
or you call `contract.addSite(...)` / `site.addItem(...)`, which are the
only mutation paths that exist. This is what "consistency boundary" means
in practice: the invariant is enforced by the shape of the API, not by
convention or a service-layer checklist.

**Repository port** (`contract-repository.port.ts`): a TypeScript
`interface`, nothing else. `application/use-cases/*.ts` depend on this
interface type; `infrastructure/persistence/typeorm-contract.repository.ts`
is the one and only class that implements it with real TypeORM calls.
Because the use-cases only ever see the interface, `tests/application/`
can hand them `InMemoryContractRepository` instead and exercise real
business logic (e.g. "`CreateContractUseCase` rejects a contract with zero
sites", "`ListContractsUseCase` only returns the requesting tenant's
contracts") with no database in the loop at all. The port also always takes
a `TenantId` first — the same tenant-scoping discipline as
`backend/repositories/tenant-scoped.repository.ts`, just expressed as a
required parameter type instead of a base class convention.

## Deliberate simplifications vs. `backend/contracts`

This is a **reference port**, not a rewrite of the production system. Things
intentionally left out or simplified, and why:

- **Shift generation, schedule rebalancing, and overload alerts are not
  ported.** `ContractAssembler` + `ScheduleRebalancer` in the original code
  turn each item's scheduled dates into `Shift` rows, spread across team
  capacity, and fire `AlertKind.ScheduleOverload` alerts when a day is
  overloaded. That machinery depends on the Shifts, Teams and Alerts bounded
  contexts (their repositories, their capacity math), which are out of scope
  for a contracts-only port. What *is* ported near-verbatim is the pure date
  math: `ScheduleGeneratorDomainService`, exposed through the
  `GenerateSchedule` use-case, which returns each item's scheduled dates
  without creating any Shift.
- **Lookup-table foreign keys (`status_id`, `frequency_unit_id`) are
  collapsed to plain varchar columns.** The original schema resolves
  `ContractStatus`/`FrequencyUnit` enum values against `contract_statuses` /
  `frequency_units` lookup tables via `TenantScopedRepository#lookupId`.
  This port stores the enum value directly as a string column — the
  Frequency value object is what actually enforces which values are legal,
  so the extra indirection through a lookup table isn't needed to preserve
  correctness here, only to preserve the exact original schema, which this
  port doesn't attempt to do.
- **Access control is stubbed out entirely.** The original controllers use
  `@Access(Resource, Operation)` + `@CurrentAccess()`, backed by an
  `AccessControlGuard` that resolves a JWT into an `AccessContext` (tenant +
  role). That is the access-control bounded context's job, not the
  contracts context's. `ContractsController` here reads the tenant id
  straight off an `x-tenant-id` header with no auth and no role check — a
  real deployment would put a real guard in front of it, the same way the
  original app does.
- **Controller surface is a faithful-but-consolidated subset.** The original
  has three controllers (`contracts.controller.ts`, `sites.controller.ts`,
  `items.controller.ts`); this port has one `ContractsController` exposing
  the same operations (list/create/get/update/delete a contract, add a
  site, add an item to a site, update an item) plus one addition —
  `GET /contracts/:id/schedule` — added specifically to surface
  `GenerateSchedule` over HTTP, since the original never exposed schedule
  computation as its own endpoint (it only ran as a side effect of
  `POST /contracts`). `UpdateSite`, `DeleteSite` and `DeleteItem` are not
  ported; the same pattern as `UpdateContractItem`/`AddContractItem` would
  extend directly to them if they were needed.
- **No migrations directory.** `data-source.ts` accepts
  `DB_SYNCHRONIZE=true` for local/dev use (TypeORM creates the schema from
  the entities); the original backend runs real migrations via
  `typeorm-ts-node-commonjs migration:run`. A production-grade version of
  this port would add a `migrations/` directory the same way.
- **`pg-mem` over a native sqlite driver**, per the task brief: it's already
  a `backend/` devDependency, pure JS, and needs no native build step. This
  reference port's own tests don't currently need a real (or in-memory)
  Postgres at all — `domain/` and `application/` tests use plain objects and
  the `InMemoryContractRepository` fake — so `pg-mem` is included as a
  devDependency for exactly the kind of infrastructure-level integration
  test (spinning up `TypeOrmContractRepository` against a real `DataSource`)
  that a next contributor would reach for, without requiring a real
  Postgres server to run `npx jest`.

## How you'd port the next module: "customers"

This section is a walkthrough, not code — `customers` is not implemented in
this reference port. If you were doing it for real, here is the shape it
would take, following exactly the same recipe used for `contracts`.

1. **Read the source of truth first**: `backend/models/customers/customer.entity.ts`,
   `backend/services/customers/customer.service.ts`,
   `backend/repositories/customers/customer.repository.ts`,
   `backend/controllers/customers/customers.controller.ts`,
   `backend/dtos/customers/*`. Note down the actual invariants (e.g. can a
   customer be deleted while it has active contracts? — see
   `CustomerHasActiveContractsException` in `backend/models/domain-errors.ts`,
   which is exactly the kind of rule that belongs on the aggregate or in a
   domain service, not scattered across a controller).

2. **Add a new context folder**, mirroring contracts' shape:

   ```
   src/contexts/customers/
     domain/
       value-objects/            # e.g. ContactInfo, if the schema warrants a VO
       customer.aggregate.ts     # aggregate root
       customer-repository.port.ts
       errors.ts                 # CustomerNotFoundError, CustomerHasActiveContractsError, ...
     application/
       use-cases/
         create-customer.use-case.ts
         update-customer.use-case.ts
         delete-customer.use-case.ts   # <- this is where the
                                        #    "no active contracts" rule gets
                                        #    enforced, likely by depending on
                                        #    ContractRepositoryPort as a
                                        #    SECOND port — cross-context
                                        #    reads are fine; cross-context
                                        #    aggregate mutation is not.
         list-customers.use-case.ts
         get-customer-detail.use-case.ts
       dto/
         customer.dto.ts
         customer.mapper.ts
     infrastructure/
       persistence/
         customer.orm-entity.ts
         customer.persistence-mapper.ts
         typeorm-customer.repository.ts
       http/
         dto/customer-request.dto.ts
         dto/customer-response.dto.ts
         customers.http-mapper.ts
         customers.controller.ts
         customers.module.ts
   ```

3. **Write `tests/domain/customers/*` and `tests/application/customers/*`
   first**, same TDD discipline as this repo's `AGENTS.md` requires
   elsewhere: a failing test for "deleting a customer with an active
   contract throws `CustomerHasActiveContractsError`" before writing the
   check itself.

4. **Cross-context dependencies go through ports, never through internal
   types.** If `DeleteCustomerUseCase` needs to know whether a customer has
   active contracts, it depends on `ContractRepositoryPort` (already
   defined in the contracts context) — never on `Contract` the aggregate's
   internals, and never by reaching into `contexts/contracts/infrastructure/`.
   This is the same rule `contract-repository.port.ts`'s docstring calls out
   for `application/`: depend on interfaces, not implementations, even
   across context boundaries.

5. **Wire it up in `app.module.ts`** by importing the new
   `CustomersModule`, exactly the way `ContractsModule` is imported today.

Repeating this once per remaining domain (`employees`, `teams`, `shifts`,
`statements`, `alerts`, `auth`, `dashboard`, `field`, `platform`, …) is what
would turn this reference port into a full DDD rewrite of `backend/`. This
repo stops at one context on purpose, to keep the reference small enough to
actually read.
