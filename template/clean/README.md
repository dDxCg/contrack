# Contrack — Clean Architecture reference port

This is a from-scratch, framework-honest port of one slice of `backend/` —
the **contracts** domain (contracts, contract sites, contract items, and
schedule generation) — built to Uncle Bob's Clean Architecture layering. It
exists as a *reference*: a worked example of how the rest of `backend/`'s
~12 domains (customers, employees, teams, shifts, statements, alerts,
platform…) could be restructured, without actually doing that work for all
of them. Only `contracts` is fully implemented and tested here.

## Why this exists

`backend/` is a conventional NestJS + TypeORM application: controllers call
services, services call TypeORM repositories, and domain rules (Contract's
site/item invariants, ContractItem's frequency rules, Money's rounding, the
schedule generator's date math) live inside classes that are still reachable
from NestJS decorators and TypeORM column metadata. That's a defensible
choice for a small team, but it means you cannot unit test a business rule
without a compiled Nest/TypeORM toolchain in the loop, and nothing stops a
future change from reaching into a TypeORM entity's column setter from
inside, say, a controller.

This port draws a harder line, and demonstrates what you get for it: every
test under `entities/` and `use-cases/` runs with **zero** NestJS, zero
TypeORM, zero database — see `npx jest` below.

## The four layers, and the dependency rule

```
frameworks-drivers  →  interface-adapters  →  use-cases  →  entities
   (outermost)                                              (innermost)
```

Dependencies only point inward. An inner layer's source file never imports
anything from an outer layer — not even a type. Concretely, in this repo:

- **`entities/`** — enterprise business rules. Plain TypeScript classes:
  `Contract`, `ContractSite`, `ContractItem`, `Money`, and the `DomainError`
  hierarchy. No import of `@nestjs/*`, `typeorm`, or anything from
  `use-cases/`, `interface-adapters/`, or `frameworks-drivers/`. `Contract`
  is the aggregate root and owns the "at least one site, each site at least
  one item, every item internally consistent" invariant
  (`Contract.validateForCreation()`) rather than that rule living in a
  service function that merely *uses* the entities.
- **`use-cases/`** — application business rules. One class per use case
  (`CreateContractUseCase`, `AddContractSiteUseCase`, …), each with an
  explicit input type and output type. This layer **owns the gateway
  interfaces** (`use-cases/ports.ts`: `ContractRepository`,
  `ContractSiteRepository`, `ContractItemRepository`) — that is the crux of
  the dependency rule: the *inner* layer declares the contract that an
  *outer* layer (`frameworks-drivers/orm/`) must implement, never the other
  way around. `GenerateScheduleUseCase` wraps the ported, still pure
  `ScheduleGenerator` date math.
- **`interface-adapters/`** — translators, nothing else.
  - `controllers/` take an already-tenant-resolved, already-shaped request
    object and call a use case. They know nothing about Express, Nest
    decorators, or HTTP verbs.
  - `presenters/` (`ContractPresenter`) turn a use case's output entities
    into the exact snake_case wire shape `backend/dtos/contracts/
    contracts.response.dto.ts` uses, so a client can't tell the difference.
  - `gateways/` is deliberately empty here — nothing between
    `interface-adapters` and `frameworks-drivers` needed its own adapter
    beyond what the presenters and the ORM repositories already do. The
    folder is kept as a placeholder for the day a real one earns its place
    (e.g. an outbound webhook gateway).
- **`frameworks-drivers/`** — everything that knows about a specific
  framework or driver.
  - `orm/` — TypeORM persistence entities (`ContractOrmEntity`, …, distinct
    from the domain `Contract`) and repository classes that *implement* the
    `use-cases/ports.ts` interfaces, with explicit `toDomain`/`toRow`
    mapping functions (no shared object between the domain and the ORM
    layer, ever).
  - `web/` — the actual `@Controller()` NestJS classes (thin: they parse the
    tenant id, hand off to the matching `interface-adapters/controllers/*`,
    and return the result), `class-validator` request DTOs, and
    `contracts.module.ts`, which is the one file in the whole module allowed
    to know that NestJS dependency injection and a TypeORM `DataSource`
    exist.
  - `db/` — `DataSource` construction (`data-source.ts`, mirrors
    `backend/data/db-context/data-source.ts`'s shape) plus a pg-mem-backed
    `in-memory-data-source.ts` used only by the repository integration test.

## Deliberate simplifications vs. `backend/contracts`

- **Access control is stubbed.** `backend/services/access-control/` (JWT
  auth, role + row-scope resolution) is its own bounded context and out of
  scope for this port. `frameworks-drivers/web/tenant-header.ts` reads a
  plain `x-tenant-id` header instead. Every use case still takes `tenantId`
  as a mandatory first argument (mirroring `backend/repositories/
  tenant-scoped.repository.ts`), so wiring in real auth later only touches
  `frameworks-drivers/web/`.
- **Shift generation and rebalancing are out of scope.** The backend's
  `contract-assembler.ts` and `schedule-rebalancer.ts` turn a new contract's
  items into `Shift` rows, respecting team capacity — that reaches into the
  `shifts`/`teams` domains, which this narrowed port doesn't include.
  `GenerateScheduleUseCase` ports the pure date-math (`schedule-generator.
  service.ts`) faithfully and exposes it as its own use case (given a term +
  frequency, return the calendar dates), but nothing here persists a `Shift`.
- **Lookup tables are flattened.** The backend normalizes `status` and
  `frequency_unit` through `contract_statuses`/`frequency_units` lookup
  tables with a `lookupId()` helper. This port stores them as plain varchar
  columns on the ORM entities, so no seed data is required to run against
  pg-mem or a fresh Postgres database.
- **Alerts (`ScheduleOverload`) are omitted**, since they are downstream of
  the rebalancer above.
- **`day_of_week`/`day_of_month` range checks moved into the entity.** The
  backend enforces `0-6`/`1-31` partly via a Postgres `CHECK` constraint and
  partly via `class-validator` `@Min`/`@Max` on the DTO. With no DB
  constraint layer here, `ContractItem.assertValid()` checks the range
  directly — a strengthening, not a behavior change.

## Running it

```bash
cd template/clean
npm install
npm run build      # tsc -p tsconfig.build.json — zero framework code touches entities/use-cases
npx jest            # entities/ and use-cases/ tests: zero Nest, zero TypeORM, zero DB
npm start           # boots Nest on :3100, GET /api/v1/health, GET /api/v1/contracts (needs a real Postgres — see frameworks-drivers/db/data-source.ts)
```

`npx jest` covers:
- `entities/__tests__/` — `Money` rounding, `ContractItem`'s frequency
  invariants (day_of_week XOR day_of_month, unit-matching, range checks),
  `Contract`'s site/item aggregate invariant.
- `use-cases/__tests__/` — `CreateContractUseCase` rejecting a zero-site
  contract, `ListContractsUseCase` tenant scoping, `AddContractSiteUseCase`'s
  looser "items optional" rule, and `GenerateScheduleUseCase`'s ported date
  math (weekly day-of-week anchoring, monthly day-of-month clamping,
  interval fallback), all against in-memory fakes of the `use-cases/ports.ts`
  interfaces.
- `frameworks-drivers/__tests__/` — one integration test proving the TypeORM
  repositories actually satisfy those same interfaces, using pg-mem (pure
  JS, already a `backend/` devDependency, no native build tools) instead of
  a real Postgres server.

## Worked walkthrough: porting the next module ("customers")

`backend/services/customers/customer.service.ts` and
`backend/models/customers/customer.entity.ts` are the next candidate. Here is
the skeleton this port's pattern implies — no code below, just the folder
listing and what would go in each file, following exactly the same recipe
used for `contracts/` above:

```
src/modules/customers/
  entities/
    customer.ts                  # framework-free Customer class: name, contact
                                  # fields, whatever invariant customer.entity.ts
                                  # currently enforces (e.g. required contact info)
    errors.ts                    # CustomerNotFoundError extends DomainError,
                                  # its own getStatus() — no shared lookup table
  use-cases/
    ports.ts                     # CustomerRepository interface, owned here
    create-customer.use-case.ts
    update-customer.use-case.ts
    delete-customer.use-case.ts  # backend/models/domain-errors.ts's
                                  # CustomerHasActiveContractsException means
                                  # this use case's port likely needs a
                                  # read-only query into the contracts module —
                                  # see note below
    list-customers.use-case.ts
    get-customer-detail.use-case.ts
  interface-adapters/
    controllers/customers.controller.ts
    presenters/customer.presenter.ts
  frameworks-drivers/
    orm/customer.orm-entity.ts, customer.repository.ts
    web/customers.controller.ts, customers.module.ts, dto/customer.dto.ts
```

The one wrinkle `customers` surfaces that `contracts` alone doesn't:
`DeleteCustomerUseCase` needs to know whether the customer has active
contracts (`CustomerHasActiveContractsException`), which is a query into
*this* module. The clean-architecture answer is not to import
`contracts/entities/contract.ts` — that would be a peer-module dependency,
not an inward one, and it's exactly the kind of coupling this layering is
meant to prevent. Instead, `customers/use-cases/ports.ts` would declare a
narrow interface it owns, e.g. `ActiveContractsLookup { hasActiveContracts
(tenantId, customerId): Promise<boolean> }`, and
`frameworks-drivers/orm/active-contracts.lookup.ts` would implement it by
querying the `contracts` module's own ORM table directly — the two modules
stay decoupled at the use-case level, and only meet inside
`frameworks-drivers`, exactly where framework-level wiring is expected to
live.
