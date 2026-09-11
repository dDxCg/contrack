# LichHD

Software for managing recurring service contracts (industrial cleaning, HVAC/elevator maintenance, pest control, landscaping, fire safety...).

*[Bản tiếng Việt](README.vi.md)*

## Problem

Recurring-service companies currently manage schedules in Excel and coordinate over Zalo. Result: missed visits lose contracts, no proof of work when customers dispute, accountants spend 2–3 days each month-end reconciling manually, and nobody tracks contracts nearing expiry.

## Target users

Recurring-service companies with 10–80 employees and 20–150 active contracts.

## Core features

- **Contracts** — create a contract, auto-generate the yearly schedule, alert on expiring contracts
- **Scheduling & Dispatch** — weekly/monthly schedule by team, auto-push weekly work to team leads
- **Field execution** — link opens on phone, before/after photos, photograph the customer-signed paper receipt
- **Alerts & Reminders** — remind via Zalo/SMS
- **Statements & Invoicing** — export monthly statement with photos + signature, as PDF

## Documentation

- [docs/prd.md](docs/prd.md)
- [docs/wireframe.html](docs/wireframe.html)
- [docs/mindmap.pdf](docs/mindmap.pdf)
- [db/erd.md](db/erd.md)
- [db/schema.sql](db/schema.sql)
