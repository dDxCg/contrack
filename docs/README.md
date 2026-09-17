# docs

## Overview
Specification and design documents for Contrack — recurring service contract management for
companies delivering periodic services (industrial cleaning, HVAC/elevator maintenance, pest
control, landscaping, fire-safety maintenance). A contract's schedule is auto-generated, field
staff submit photo/GPS/timestamp proof per shift, and the month-end statement exports in minutes.
Full overview: [`01-requirements-analysis.md`](01-requirements-analysis.md#overview).

## Process: mindmap to design

Each stage narrows the previous one's views - scope first, then what the
system must do, then how it looks, then how it's built:

1. **`00-mindmap.png`** — scope brainstorm: modules, roles, must/should/could-have features.
2. **`01-requirements-analysis.md`** — mindmap turned into user stories (INVEST, Given/When/Then)
   and functional/non-functional requirements (FR/NFR).
3. **`02-screens-heriarchy.md`** — FRs grouped into a screen tree per role.
4. **`03-architecture.md`** — arc42 + C4: constraints, context, containers, components, decisions,
   quality requirements, all traced back to FR/NFR.
5. **`04-erd.md`** / **`04-schema.sql`** — the domain model the architecture's containers persist to.
6. **`05-api.yaml`** — the API surface the schema is read and written through, FR-tagged per
   endpoint.
7. **`06-repo-layout.md`** — where the API's components live in the codebase.
8. **`07-class-diagram.md`** / **`08-sequence-diagram.md`** — design-level detail on top of the
   schema and API: classes with typed methods, and the runtime flows through them.
9. **`ui/prototype.html`** / **`screenshots/`** — the screens hierarchy made clickable, cross-checked
   against `02-screens-heriarchy.md` for drift.

Each later document cites the earlier ones it derives from (FR#, US#, §-refs) rather than
restating them — follow the citations back when a decision's rationale isn't on the page.

| File | Contents |
|---|---|
| [`01-requirements-analysis.md`](01-requirements-analysis.md) | Project overview, user stories (INVEST-checked), FR1–FR29, NFR1–NFR7, use-case diagram (UC-01…UC-34, one area per role, each traced to its US#/FR#) |
| [`02-screens-heriarchy.md`](02-screens-heriarchy.md) | Screens hierarchy, per role |
| [`03-architecture.md`](03-architecture.md) | arc42-structured: constraints, context, solution strategy, building blocks, deployment, decisions, quality requirements, risks, glossary |
| [`04-erd.md`](04-erd.md) | Entity-relationship diagram (mermaid) |
| [`05-api.yaml`](05-api.yaml) | OpenAPI 3.0 — paths, request/response schemas, error examples |
| [`06-repo-layout.md`](06-repo-layout.md) | Planned source tree by architecture style — Controller-Service-Repository backend (NestJS), type-based frontend (ReactJS) |
| [`07-class-diagram.md`](07-class-diagram.md) | Class diagram (incl. Tenant), design-level |
| [`08-sequence-diagram.md`](08-sequence-diagram.md) | 12 sequence diagrams — 5 core flows (each with its failure branch), 5 supporting flows from the API plan, plus login and Access Control |
| [`ui/prototype.html`](ui/prototype.html) | UI prototype: login, role-scoped navigation, 22 screens including the create and assign forms, single self-contained HTML file |
| [`screenshots/`](screenshots/) | Captures of every prototype screen, by role |
| `00-mindmap.png` | Scope mindmap |
| [`04-schema.sql`](04-schema.sql) | ANSI SQL schema |
