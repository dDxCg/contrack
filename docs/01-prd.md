# PRD — LichHD
### Recurring Service Contract Management Software

---

## 1. Introduction & Purpose

**Problem being solved:** Recurring-service companies (industrial cleaning, HVAC/elevator maintenance, pest control, landscaping, fire-safety maintenance) currently manage work schedules in Excel and coordinate over Zalo. Result: missed visits → customer complaints/lost contracts; no proof of work when customers dispute; accountants spend 1.5–3 days each month-end reconciling manually; nobody tracks contracts nearing expiry → lost customers from missed renewals.

**Target users:** Recurring-service companies with 10–80 employees and 20–150 active contracts.

**Business goals:**
- Help customers stop losing contracts to missed visits.
- Provide complete proof of work (photos, GPS, timestamp, signature).
- Cut month-end statement closing time from 1.5–3 days to under 30 minutes.

**Product positioning:** LichHD is recurring service contract management software — the RECURRING CONTRACT is the central unit, unlike CMMS (asset-centric) and international field service software such as Jobber/MaintainX (built for ad-hoc jobs, no Vietnamese/Zalo/VietQR support).

**Competitive landscape:**

| Software category | Serves whom | Why it doesn't fit the target customer |
|---|---|---|
| CMMS (SpeedMaint, Vietsoft…) | Factories self-maintaining assets | Asset-centric, not customer-contract-centric |
| International field service (Jobber, Swept, MaintainX) | Service contractors | Right model but built for ad-hoc jobs, weak on long-term fixed-frequency contracts; no Vietnamese/Zalo/VietQR |
| B2C marketplaces (bTaskee, JupViec) | Individual consumers | Wrong business model |

---

## 2. Target Audience & User Personas

| Role | Specific person | Current pain | What they get from LichHD |
|---|---|---|---|
| Payer | Director | Loses contracts to missed visits; doesn't know which contracts are profitable | Stops losing contracts; sees profit/loss per contract |
| Champion | Accountant / admin | 3 days at month-end to reconcile | Export a statement in 10 minutes |
| Daily user | Team lead, field staff | Asked "did you do it yet", blamed when there's no proof | Has proof to protect themselves |
| Blocker | Long-tenured team lead | Afraid of exposing inflated hours/materials claims | Needs careful internal communication: not positioned as surveillance, avoid the word "monitoring" |

---

## 3. Features & Functionality

### Must-have (MVP)

| Module | Core functionality |
|---|---|
| Contracts | Create contract (customer, term) → add one or more service sites, each site has service items (frequency, unit price), work requirements, notes → auto-generate schedule per item; alert on contracts expiring soon (30 days) |
| Scheduling & Dispatch | Weekly/monthly schedule by team/employee; auto-push weekly work to team leads; reschedule on ad-hoc changes |
| Field execution | Link opens on phone (no app install); before/after photos; customer signs a paper receipt, employee photographs the signed receipt as evidence, brings the original back to file later; GPS + timestamp stamped automatically |
| Alerts & Reminders | Remind on visits not completed at the required frequency; remind on contracts expiring soon; remind via Zalo/SMS |
| Statements & Invoicing | One button to export the monthly statement (with photos + signature) as PDF to send the customer; automatic reconciliation |

### Should-have

| Module | Core functionality |
|---|---|
| Profit/loss per contract | Record costs (labor, materials) per contract → show profit/loss per contract |
| Renewal & light CRM | Automatic renewal reminders with contract templates; customer history, contact log |

### Could-have

| Module | Core functionality |
|---|---|
| Field workforce management | GPS-based time tracking; team/employee performance; individual work history |
| Payment | VietQR integration for customers to pay directly from the PDF statement |
| Director reporting | Overview dashboard: active contracts, contracts expiring soon, contracts with issues, projected revenue |

### Won't-have (this phase)

- Deep integration with accounting/ERP software (MISA, Fast…).
- Native mobile app (web link on phone only).
- Multi-language/multi-market support beyond Vietnam.

---

## 4. User Flows & Design

**Current process (AS-IS):**

1. Sign contract (e.g., building X, window cleaning twice a month, 12 months).
2. Accountant opens "Schedule 2025.xlsx" → manually types 24 rows for 12 months.
3. Start of week: manager scans the Excel schedule → copies into a Zalo group.
4. Team lead reads Zalo → assigns people → they go do the work.
5. Work done: photos sent to Zalo group (photos scroll away after 2 weeks).
6. Customer signs a paper confirmation → team lead holds it → brought to the office 3 days later (sometimes lost).
7. Month-end: accountant digs through Zalo + paper → reconciles against Excel → builds the statement → issues invoice.
8. Risk: discover a missed visit at building Y → customer already complained → can't invoice the full amount.

**New process (TO-BE) with LichHD:**

1. Sign contract → enter once (customer, sites, service items + frequency + unit price per site, term) → system auto-generates the schedule.
2. Monday morning: system auto-pushes this week's work list to each team lead.
3. Employee opens the link on their phone → takes before/after photos → customer signs a paper receipt → employee photographs the signed receipt.
4. Field photos + signed receipt photo + GPS + timestamp are stamped. Employee brings the original paper back to file later.
5. System alerts: "Building Y contract has 3 days left before the 2nd visit is due."
6. Month-end: one button → statement + proof photos + signature → PDF sent to customer.
7. Alert: "5 contracts expiring within 30 days → need renewal."

---

## 5. System & Technical Requirements

| Category | Requirement |
|---|---|
| Platform | Responsive web app, accessed via a link on the phone — no app install required |
| Field evidence | Field photos, customer signed-receipt photo, GPS, timestamp |
| Reminder channels | Send notifications via Zalo (ZNS) and/or SMS |
| Payment | VietQR integration for payment flow (Could-have) |
| Performance | The field-photo page must load on weak 3G/4G mobile connections (job sites, basements) |
| Security & access control | Role-based access: director, accountant, manager, team lead, employee; evidence data logs cannot be deleted or edited |
| Scalability | Two packages: **self-host** (one deployment per customer company, today's target) and **cloud** (one shared deployment serving several customer companies) |
| Data retention | Retain photos/signatures for at least 12 months for reconciliation and contract disputes |
| Data export | Export statements/invoices as PDF; export raw data (CSV/Excel) for accounting reconciliation |

---

## 6. Assumptions & Constraints

**Assumptions:**
- Target customers and field employees have smartphones and 3G/4G connectivity at the work site.
- Zalo remains the most common communication channel among the target customer segment for the foreseeable future.

**Constraints:**
- Initial budget and development team are scoped to the 5 Must-have modules only.
- No ERP/accounting integration in the MVP phase — detailed financial data (Should/Could-have) depends on the accountant manually entering costs.
- Pricing (roughly 1.5 million VND/month per the sales scenario) needs to be validated through surveys/pilots before being finalized.

---

## 7. Risks & Dependencies

| Risk / Dependency | Level | Notes |
|---|---|---|
| Long-tenured team leads resist due to fear of exposed hours/materials transparency | High | Requires careful internal communication during rollout — not positioned as a "surveillance" tool |
| Dependency on the reliability of Zalo ZNS/SMS channels for reminders | Medium | Need a fallback (in-app/email reminders) if the channel is disrupted |
| Competition: international players (Jobber, MaintainX) localize faster than expected | Low–Medium | The Vietnamese/Zalo/VietQR first-mover advantage needs to be reinforced early |
| Dependency on input cost data (labor, materials) to compute profit/loss (Should-have) | Medium | Requires a cost-entry process from accounting, otherwise the profit/loss module will be inaccurate |

---

## 8. Success Metrics & Release Criteria

| Metric | Meaning | Target |
|---|---|---|
| Missed visits per contract per month | Direct measure of the core "never miss a visit" value | Near zero after 1 month of use |
| Time for accountant to close the month-end statement | Measures effectiveness of the Statements & Invoicing module | From 1.5–3 days to under 30 minutes |
| On-time contract renewal rate | Measures effectiveness of the expiry-alert module | Increase vs. baseline before using the software |
| Share of field employees using the photo-capture link on every visit | Measures real-world adoption | ≥ 90% of visits have complete photo/signature evidence |

**MVP release criteria:**
- All 5 Must-have modules run reliably on mobile (including on weak networks).
- Photos/GPS/timestamp cannot be edited after submission — security testing passes.
- Pilot tested with at least 1 customer through a full monthly cycle (from contract signing to statement export) with no critical bugs.

---

## 9. Roadmap & Release Plan

| Phase | Timeline | Scope |
|---|---|---|
| MVP | 0–3 months | 5 Must-have modules: Contracts, Scheduling & Dispatch, Field Execution, Alerts & Reminders, Statements & Invoicing |
| Pilot | Months 3–4 | Trial rollout with 1–3 target customers, collect feedback |
| Phase 2 | Months 4–9 | Should-have modules: Profit/loss per contract, Renewal & light CRM |
| Phase 3 | Month 9+ | Could-have modules: Field workforce management, VietQR payment, Director dashboard |

The MVP ships as **self-host** — one deployment per customer company, the model
[System & Technical Requirements](#5-system--technical-requirements) and the rest
of this document assume throughout. **Cloud** is a packaging option, not a new
module: the same MVP scope, sold as a shared subscription instead of a dedicated
deployment. It is not required for MVP or pilot.

---

## 10. Stakeholder Review & Sign-off

| Stakeholder | Role in review | Approval status |
|---|---|---|
| Founder / Product owner | Approve MVP scope and positioning | Pending approval |
| Development team (technical) | Review technical feasibility of Section 5 | Pending review |
| Sales / GTM team | Review positioning messaging and sales scenario | Pending review |
| Pilot customer (representative) | Give feedback on the TO-BE process before full rollout | Not yet contacted |

---
