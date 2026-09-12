# docs

Specification and design documents for LichHD. English is the primary language;
`*.vi.md` files are the Vietnamese counterparts and track the English content.

| File | Contents |
|---|---|
| [`prd.md`](prd.md) · [`prd.vi.md`](prd.vi.md) | Problem statement, personas, MVP scope (Must/Should/Could/Won't), AS-IS and TO-BE flows, technical requirements, risks, roadmap, release criteria |
| [`design-analysis.md`](design-analysis.md) · [`design-analysis.vi.md`](design-analysis.vi.md) | FR1–FR18, NFR1–NFR7, use-case diagrams per role, use-case descriptions, sequence diagrams, system design |
| [`wireframe.html`](wireframe.html) | 14 screens across 5 roles, single self-contained HTML file |
| [`screenshots/`](screenshots/) | Captures of every wireframe screen, by role |
| `mindmap.pdf` | Scope mindmap |

## Document order

The PRD defines scope. The design analysis derives requirements and use cases from
it, and is the source for the architecture views in the top-level
[README](../README.md) and for the data model in [`db/`](../db). The wireframe
realises the use cases; each screen maps to use cases in
[design-analysis §II](design-analysis.md#ii-use-cases).

## Wireframe

Open `wireframe.html` directly — no build step, no server. Role is selected from the
top bar; navigation, identity and reachable screens follow the role. Deep link to a
specific view with `wireframe.html#<role>/<screen>`, where role is one of `director`,
`manager`, `accountant`, `team_lead`, `employee`.

Screenshots are regenerated with [`scripts/capture-wireframe.sh`](../scripts/capture-wireframe.sh).

## Editing the bilingual pairs

Change the English file first, then mirror the change in the `.vi.md` counterpart —
headings, section numbering and diagram content are kept aligned so links between the
two resolve.
