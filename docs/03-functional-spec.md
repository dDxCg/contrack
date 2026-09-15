# LichHD — Functional Specification

## 0. Authentication

*Cross-cutting — every function below assumes a signed-in employee with a role
(NFR3, NFR7).*

| Screens needed | API needed |
|---|---|
| Login (username/password) | `POST` session (authenticate, issue token) |
| — | `POST` session refresh/logout |

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

*One view: active/expiring/disputed contract counts, projected revenue, current as of
underlying data.*

| Screens needed | API needed |
|---|---|
| Dashboard | `GET` dashboard summary (aggregate counts + projected revenue, computed, not stored) |

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

## Traceability

| FR | Function | Screens | API |
|---|---|---|---|
| FR1–FR4 | §1 Contract setup | 3 | 5 |
| FR5–FR6 | §2 Weekly dispatch | 1 | 2 |
| FR7–FR10 | §3 Field execution | 4 | 4 |
| FR11 | §4 Dispute handling | 2 | 3 |
| FR12–FR14 | §5 Alerts | 1 | 1 |
| FR15, FR16, FR19, FR20 | §6 Statements | 4 | 6 |
| FR17 | §7 Dashboard | 1 | 1 |
| FR18 | §8 Employee/team management | 3 | 5 |
| FR21 | §9 Customer management | 2 | 4 |

Every FR maps to at least one screen and one API operation — no orphaned requirement,
no screen without a stated purpose back to an FR.
