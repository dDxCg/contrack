# docs

Specification and design documents for LichHD.

| File | Contents |
|---|---|
| [`01-prd.md`](01-prd.md) | Problem statement, personas, MVP scope (Must/Should/Could/Won't), AS-IS and TO-BE flows, technical requirements, risks, roadmap, release criteria |
| [`02-design-analysis.md`](02-design-analysis.md) | FR1–FR18, NFR1–NFR7, use-case diagrams per role, use-case descriptions, sequence diagrams, system design |
| [`03-architecture.md`](03-architecture.md) | arc42-structured: constraints, context, solution strategy, building blocks, deployment, decisions, quality requirements, risks, glossary |
| [`04-api.md`](04-api.md) | Endpoint contract per requirement, field-token submission path, role × resource × row-scope access-control matrix, status and error-code catalogue |
| [`ui/wireframe.html`](ui/wireframe.html) | 17 screens across 5 roles, single self-contained HTML file |
| [`ui/prototype.html`](ui/prototype.html) | Clickable build of the wireframe: login, role-scoped navigation, 22 screens including the create and assign forms |
| [`screenshots/`](screenshots/) | Captures of every wireframe screen, by role |
| `00-mindmap.pdf` | Scope mindmap |

## Document order

Numbering is citation order: a later-numbered document may cite an earlier one,
never the reverse. `01-prd.md` defines scope and cites nothing here.
`02-design-analysis.md` derives requirements and use cases from it.
`03-architecture.md` decides the mechanisms; `04-api.md` turns them into an
endpoint contract. Each wireframe screen maps to a use case in
[design-analysis §II](02-design-analysis.md#ii-use-cases).

`03-architecture.md` and `04-api.md` open with a `Status:` / `Audience:` / `Answers:`
banner stating what is settled and what is still open.

## Wireframe and prototype

Both open directly in a browser — no build step, no server.

`ui/wireframe.html` is the screen inventory: role is picked from the top bar, and
navigation, identity and reachable screens follow it.

`ui/prototype.html` is the same screens wired as an application. It opens on the login
screen; the account selected there sets the role, and a screen outside that role is
not rendered even when addressed directly. Accounts, any password: `hoang.tm`
director · `mai.lt` manager · `trang.pt` accountant · `hung.nv` team lead ·
`toan.nv` employee. Field staff do not log in — the shift link carries their access.

It adds five screens the wireframe has no place for: assign a shift, record a
complaint, add a customer, add an employee, create a team. Submitting returns to the
originating list; nothing persists across a reload.

Both accept `#<role>/<screen>` deep links, which skip the login screen. Screenshots
are regenerated with [`scripts/capture-wireframe.sh`](../scripts/capture-wireframe.sh).
