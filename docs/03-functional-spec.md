# LichHD — Functional Specification

## 0. Authentication — FR22

*Cross-cutting — every function below assumes a signed-in employee with a role,
inside one tenant (NFR3, NFR6, NFR7).*

| Screens needed | API needed |
|---|---|
| Login (email/password) | `POST` session (authenticate, issue token carrying tenant + role) |
| — | `POST` session refresh/logout |

Login resolves by `email` alone — `email` is globally unique across every tenant, so
the client never sends a `tenant_id`; the tenant is derived from whichever employee
the email matches (FR22). A suspended tenant's login is rejected before password
check (FR24).

---

## 1. Contract setup — FR1, FR2, FR3, FR4

*Manager, Director create a contract with its sites and service items; the schedule
generates itself.*

| Screens needed | API needed |
|---|---|
| Contract list | `GET` contracts (list, filter by status/customer) |
| Contract create/edit form — customer, term, one or more sites, each site's service items | `POST` contract; `POST` site on a contract; `POST` item on a site |
| Contract detail — sites, items, generated schedule preview | `GET` contract (with sites, items); `GET` shifts generated for a contract |
| Contract update/delete (Director only) | `PATCH` contract; `DELETE` contract |

`Contract.generateSchedule()` (§III) runs server-side on create — no separate screen,
but its result (the generated shifts) is what the contract detail screen reads back.

---

## 2. Weekly dispatch — FR5, FR6

*System pushes the week's shifts to each team lead; team lead reassigns or reschedules
on conflict.*

| Screens needed | API needed |
|---|---|
| Team lead's weekly shift list, scoped to their team | `GET` shifts (filter: team, week) |
| Reassign shift (pick another employee) | `PATCH` shift (assignee) |
| Reschedule shift (pick another date) | `PATCH` shift (scheduled date) — same endpoint as reassign, rejected on a completed shift |

The weekly push itself (FR5) is a system job, not a screen — see [`02-design-analysis.md`
§V sequence 4](02-design-analysis.md#v-sequence-diagrams) for the alert/push mechanism it shares.

---

## 3. Field execution — FR7, FR8, FR9, FR10

*Employee opens the assigned shift from a phone link, no app, no login — the link
itself is the credential.*

| Screens needed | API needed |
|---|---|
| Shift link landing (token in URL, no login form) | `GET` shift by token (redeem, show what's expected) |
| Before-photo capture | `POST` shift photos (type = before) |
| After-photo capture | `POST` shift photos (type = after) |
| Signed-receipt photo capture | `POST` shift receipt photo |
| Confirmation screen | `POST` shift complete (server captures GPS + timestamp itself, per NFR2 — not client input) |

---

## 4. Dispute handling — FR11

*Manager, Director review submitted evidence and record a dispute if it doesn't hold
up.*

| Screens needed | API needed |
|---|---|
| Shift detail — evidence review (photos, receipt, GPS, timestamp) | `GET` shift (with photos, receipt, capture metadata) |
| Mark disputed (reason) | `PATCH` shift status = disputed (with reason) |
| Resolve dispute | `PATCH` shift status = completed (clear dispute) |

---

## 5. Alerts — FR12, FR13, FR14

*System raises two kinds of alert — expiring contract, missed shift — and pushes both
over Zalo ZNS / SMS.*

| Screens needed | API needed |
|---|---|
| Alerts list (Director, Team Lead), both alert kinds merged | `GET` alerts (list, unresolved) |

Alert generation and channel delivery (FR12–14) are system jobs, not screens — see
[`02-design-analysis.md` §V sequence 4](02-design-analysis.md#v-sequence-diagrams).

---

## 6. Statements — FR15, FR16, FR19, FR20

*Accountant closes a contract's month into a statement, blocked while evidence is
incomplete, exported as PDF, then marks it sent. Director and Accountant can also
reconcile shifts due against shifts with complete evidence, per contract per period.*

| Screens needed | API needed |
|---|---|
| Statement generate (pick contract, period) | `POST` statement (compute from period's completed shifts) |
| Statement preview — line items, missing-evidence warnings if blocked | `GET` statement (with shifts, computed total) |
| Statement list, per contract or period | `GET` statements (list, filter) |
| Export PDF | `POST` statement export |
| Mark sent | `POST` statement send |
| Reconciliation view — shifts due vs. shifts with complete evidence, per contract per period | `GET` reconciliation (filter: period) |

`Statement.compute()`/`export()`/`send()` (§III) back the first three actions directly;
reconciliation is a read-only cross-contract report, not a `Statement` method.

---

## 7. Director dashboard — FR17

*One view, filterable by month: active/expiring/disputed contract counts, projected
revenue, late/missed shifts by month, on-time renewal rate, cancellation rate, new
contracts signed by month, profit/loss trend — current as of underlying data.*

| Screens needed | API needed |
|---|---|
| Dashboard (period picker at the top — a month picker by default, or a custom from/to date range under "Tùy chọn"; snapshot widgets use a bullet-style bar with a target/threshold tick rather than a radial gauge — reads more precisely at a glance; contract status, evidence completeness, disputes by site all stay "as of now" regardless of the filter; renewal rate and cancellation rate sit in one card as two bullet bars sharing the same 12-month cohort — contracts that reached term end, split into renewed / cancelled / expired-without-renewal, so the two rates are read together rather than as unrelated numbers; the lower half is laid out as two bento blocks, each one large hero tile (2/3 width) beside a stacked column of smaller supporting tiles (1/3) — size carries the hierarchy, so the number a Director reads first is never the same size as its supporting context. Only the financial block is a bento: hero = revenue line trend (absolute value, non-zero-based) with its headline figure and variance-to-plan badge; stacked beside it = the period's absolute profit, then profit margin (`profit / revenue`, its own small line trend), then statement-closing progress. Shift operations are three peer tiles: one period summary, the same figures broken down per site, and the attention queue. The summary splits the period's *scheduled* shifts into four non-overlapping slices, drawn as a donut: completed (finished on schedule, no dispute), overdue (its date has passed and it is still unfinished), disputed (finished but contested), and not yet due — a month filter normally contains shifts whose date hasn't arrived. The three rates printed below the donut drop that last slice from the denominator, dividing by shifts actually *due* rather than by everything scheduled, so they sum to exactly 100%; a shift whose date hasn't arrived can be neither finished nor late, and leaving it in would drag every rate down for no reason. The per-site tile repeats exactly those slices per site so a Director sees where failures cluster, ranked by full-fill rate. Revenue and margin stay on separate charts rather than one two-axis chart, since they are genuinely different measures and overlaying them risks a false-correlation read; margin, being a ratio rather than a second currency amount, still gets its own scale. New contracts signed keeps its own compact sparkline tile in the top row; no widget is labelled "by month" — every title is period-agnostic and the axis follows whatever the picker holds; each delta badge compares against the immediately preceding period of the same length (previous month in month mode, the same-length window immediately before `from` in custom mode), so a custom range is read against its own like-for-like baseline rather than against a calendar month; all trend widgets show the trailing 6 periods ending at the filtered period; renewal/cancellation rate is the trailing 12 months ending at the filtered month) | `GET` dashboard summary (`?month=YYYY-MM`, default current month; or `?from=&to=` for a custom range — the two are mutually exclusive; aggregate counts, projected revenue, trend arrays, renewal rate and cancellation rate, computed, not stored) |

A month's cost never renders as a gap: if the Accountant hasn't recorded it yet, FR28's
estimate fills it (marked as estimated, not actual — see §12).

---

## 8. Employee and team management — FR18

*Director manages employee accounts, role, manager assignment, and teams.*

| Screens needed | API needed |
|---|---|
| Employee list | `GET` employees (list, filter by role/team) |
| Employee create/edit (role, manager, team) | `POST` employee; `PATCH` employee |
| Employee deactivate/delete | `DELETE` employee |
| Team list and edit (name, code, members) | `GET`/`POST`/`PATCH` teams |

---

## 9. Customer management — FR21

*Manager, Director maintain customer records; a customer holding a non-terminated
contract can't be deleted.*

| Screens needed | API needed |
|---|---|
| Customer list | `GET` customers (list) |
| Customer create/edit (name, contact, address, segment) | `POST` customer; `PATCH` customer |
| Customer delete (Director only, blocked while an active contract references it) | `DELETE` customer |

Contract setup (§1) reads an existing customer record when creating a contract — this
section is where that record comes from.

---

## 10. Tenant management — FR23, FR24

*Platform Admin onboards and manages the operating companies (tenants) that run
LichHD — outside any tenant, not reachable by Director or any tenant-scoped role.*

| Screens needed | API needed |
|---|---|
| Tenant list (Platform Admin only) | `GET` tenants (list, filter by status) |
| Tenant create — name + first Director's email/password | `POST` tenant (creates the tenant row and its first employee, role = director) |
| Tenant suspend / reactivate | `PATCH` tenant status |

A new tenant starts with exactly one account: the Director created alongside it.
Every other employee, team, customer and contract for that tenant is created from
inside it afterward, by that Director — Platform Admin never creates them.

---

## 11. Platform dashboard — FR25

*Platform Admin's landing screen — tenant counts by status, recent onboarding activity,
tenant growth trend. Computed from the `tenants` table only; never reaches into any
tenant's contracts, shifts or statements.*

| Screens needed | API needed |
|---|---|
| Platform Dashboard (Platform Admin's landing screen) | `GET` platform dashboard summary (aggregate tenant counts + growth trend, computed, not stored) |

---

## 12. Contract profitability — FR26, FR27, FR28

*Accountant records a contract's monthly cost by category; Director and Accountant
read the resulting profit/loss (revenue from `contract_items` minus that month's
recorded — or, until recorded, estimated — cost), per contract per month.*

| Screens needed | API needed |
|---|---|
| Cost entry (per contract, per month: labor/materials/other amount) — reached from contract detail | `POST`/`PATCH` contract cost (category, period, amount) |
| Profit/loss view (per contract, by month; a month the Accountant hasn't closed shows an estimated figure, visually marked "Ước tính", not blank) | `GET` contract profit/loss (revenue vs. recorded-or-estimated cost, by month, with an `is_estimated` flag per month) |

**FR28 estimate, in order:** (1) trailing 3-month average of that contract's own
recorded costs, using whichever of the last 3 months actually have an entry; (2) if
the contract has never had a cost recorded, the tenant's average cost-to-revenue
ratio across all its contracts' recorded months, applied to this contract's revenue
for the month. Estimating is pure computation over `contract_costs` and
`contract_items` — nothing is written back, so an Accountant's later real entry
simply overrides what was shown.

Dashboard's profit/loss trend (§7) aggregates this across all contracts; it does not
replace the per-contract view here.

---

## Traceability

| FR | Function | Screens | API |
|---|---|---|---|
| FR22 | §0 Authentication | 1 | 2 |
| FR1–FR4 | §1 Contract setup | 3 | 5 |
| FR5–FR6 | §2 Weekly dispatch | 1 | 2 |
| FR7–FR10 | §3 Field execution | 4 | 4 |
| FR11 | §4 Dispute handling | 2 | 3 |
| FR12–FR14 | §5 Alerts | 1 | 1 |
| FR15, FR16, FR19, FR20 | §6 Statements | 4 | 6 |
| FR17 | §7 Dashboard | 1 | 1 |
| FR18 | §8 Employee/team management | 3 | 5 |
| FR21 | §9 Customer management | 2 | 4 |
| FR23–FR24 | §10 Tenant management | 3 | 3 |
| FR25 | §11 Platform dashboard | 1 | 1 |
| FR26–FR28 | §12 Contract profitability | 2 | 2 |

Every FR maps to at least one screen and one API operation — no orphaned requirement,
no screen without a stated purpose back to an FR.
