# docs

Specification and design documents for Contrack.

| File | Contents |
|---|---|
| [`01-requirements-analysis.md`](01-requirements-analysis.md) | Project overview, user stories (INVEST-checked), FR1–FR28, NFR1–NFR7, use-case diagram |
| [`02-ui-ux-design.md`](02-ui-ux-design.md) | Information architecture → screens hierarchy → UI/UX, per role, derived from FR1–FR28 |
| [`03-architecture.md`](03-architecture.md) | arc42-structured: constraints, context, solution strategy, building blocks, deployment, decisions, quality requirements, risks, glossary |
| [`04-erd.md`](04-erd.md) | Entity-relationship diagram (mermaid) |
| [`05-api.yaml`](05-api.yaml) | OpenAPI 3.0 — paths, request/response schemas, error examples |
| [`06-class-diagram.md`](06-class-diagram.md) | Class diagram (incl. Tenant), design-level |
| [`07-sequence-diagram.md`](07-sequence-diagram.md) | The 5 core-flow sequence diagrams, each with its failure branch |
| [`08-repo-layout.md`](08-repo-layout.md) | Planned source tree by architecture style — Controller-Service-Repository backend, type-based frontend — stack not yet decided |
| [`ui/prototype.html`](ui/prototype.html) | UI prototype: login, role-scoped navigation, 22 screens including the create and assign forms, single self-contained HTML file |
| [`screenshots/`](screenshots/) | Captures of every prototype screen, by role |
| `00-mindmap.pdf` | Scope mindmap |
| [`04-schema.sql`](04-schema.sql) | ANSI SQL schema, 19 tables, multi-tenant (`tenant_id` on every core table) |
