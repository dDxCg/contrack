# docs

Specification and design documents for LichHD.

| File | Contents |
|---|---|
| [`01-prd.md`](01-prd.md) | Problem statement, personas, MVP scope (Must/Should/Could/Won't), AS-IS and TO-BE flows, technical requirements, risks, roadmap, release criteria |
| [`02-design-analysis.md`](02-design-analysis.md) | FR1–FR24, NFR1–NFR7, user stories, use-case diagram, class diagram (incl. Tenant), sequence diagrams, system design |
| [`03-functional-spec.md`](03-functional-spec.md) | Function → screens needed → API needed, per FR — written before UI/UX and DB design |
| [`04-architecture.md`](04-architecture.md) | arc42-structured: constraints, context, solution strategy, building blocks, deployment, decisions, quality requirements, risks, glossary |
| [`05-api.md`](05-api.md) | Endpoint contract per requirement, field-token submission path, tenant × role × resource × row-scope access-control matrix, status and error-code catalogue, platform (tenant) administration |
| [`05-api.yaml`](05-api.yaml) | Same contract as OpenAPI 3.0 — paths, request/response schemas, error examples |
| [`06-repo-layout.md`](06-repo-layout.md) | Planned source tree by architecture style — Controller-Service-Repository backend, type-based frontend — stack not yet decided |
| [`ui/wireframe.html`](ui/wireframe.html) | 17 screens across 5 roles, single self-contained HTML file |
| [`ui/prototype.html`](ui/prototype.html) | Clickable build of the wireframe: login, role-scoped navigation, 22 screens including the create and assign forms |
| [`screenshots/`](screenshots/) | Captures of every prototype screen, by role |
| `00-mindmap.pdf` | Scope mindmap |
| [`db/schema.sql`](db/schema.sql) | ANSI SQL schema, 19 tables, multi-tenant (`tenant_id` on every core table) |
| [`db/erd.md`](db/erd.md) | Entity-relationship diagram (mermaid) |
