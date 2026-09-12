# docs

Specification and design documents for LichHD. English is the primary language;
`*.vi.md` files are the Vietnamese counterparts and track the English content.

| File | Contents |
|---|---|
| [`prd.md`](prd.md) · [`prd.vi.md`](prd.vi.md) | Problem statement, personas, MVP scope (Must/Should/Could/Won't), AS-IS and TO-BE flows, technical requirements, risks, roadmap, release criteria |
| [`design-analysis.md`](design-analysis.md) · [`design-analysis.vi.md`](design-analysis.vi.md) | FR1–FR18, NFR1–NFR7, use-case diagrams per role, use-case descriptions, sequence diagrams, system design |
| [`architecture.md`](architecture.md) | Context, component breakdown and technology criteria, key decisions, cross-cutting concerns, open questions |
| [`api.md`](api.md) | Endpoint contract per requirement, field-token submission path, role × resource × row-scope access-control matrix, status and error-code catalogue |
| [`wireframe.html`](wireframe.html) | 17 screens across 5 roles, single self-contained HTML file |
| [`prototype.html`](prototype.html) | Clickable build of the wireframe: login, role-scoped navigation, 22 screens including the create and assign forms |
| [`screenshots/`](screenshots/) | Captures of every wireframe screen, by role |
| `mindmap.pdf` | Scope mindmap |

## Document order

The PRD defines scope. The design analysis derives requirements and use cases from
it, and feeds the architecture views in the top-level [README](../README.md) and the
data model in [`db/`](../db). Architecture decides the mechanisms; the API
specification turns them into an endpoint contract. Each wireframe screen maps to a
use case in [design-analysis §II](design-analysis.md#ii-use-cases).

`architecture.md` and `api.md` open with a `Status:` / `Audience:` / `Answers:`
banner stating what is settled and what is still open.

## Wireframe and prototype

Both open directly in a browser — no build step, no server.

`wireframe.html` is the screen inventory: role is picked from the top bar, and
navigation, identity and reachable screens follow it.

`prototype.html` is the same screens wired as an application. It opens on the login
screen; the account selected there sets the role, and a screen outside that role is
not rendered even when addressed directly. Accounts, any password: `hoang.tm`
director · `mai.lt` manager · `trang.pt` accountant · `hung.nv` team lead ·
`toan.nv` employee. Field staff do not log in — the shift link carries their access.

It adds five screens the wireframe has no place for: assign a shift, record a
complaint, add a customer, add an employee, create a team. Submitting returns to the
originating list; nothing persists across a reload.

Both accept `#<role>/<screen>` deep links, which skip the login screen. Screenshots
are regenerated with [`scripts/capture-wireframe.sh`](../scripts/capture-wireframe.sh).

## Editing the bilingual pairs

Change the English file first, then mirror it in the `.vi.md` counterpart. Headings,
section numbering and diagram content stay aligned so links between the two resolve.
