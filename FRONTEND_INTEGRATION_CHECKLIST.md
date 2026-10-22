# Frontend Integration Checklist

This checklist tracks the frontend work needed to make the existing screens work with the backend. A screen can exist before its data and workflows are connected.

## Mock data policy

- Keep the current frontend mock examples while their module is being integrated.
- Move equivalent examples into the database seed data before switching that screen to API data. Preserve meaningful names, statuses, dates, amounts, relationships, and workflow states where the schema supports them.
- Keep seed operations repeatable so running the seed more than once does not create duplicate examples.
- After the seeded examples load through the API, the UI can switch from local mock arrays to database responses. Do not delete the examples from the frontend until that integration is complete.
- Do not replace or remove seeded examples later unless the project owner asks; they are useful demonstration data.

## Integration order

Each module is complete only when its sample records are seeded, its frontend reads and writes through the API, loading/error/empty states are handled, and its core workflow works against persisted records.

| Order | Module / screens | Current frontend/API state | Seed examples | Integration status |
|---:|---|---|---|---|
| 1 | Customers list and editor | Schema, migration, seed examples, API mapping, and page CRUD wiring are in place. The page retains its example array but reads live API data. | Eight example records use stable IDs and repeatable upserts. | **Implementation complete; runtime confirmation pending** |
| 1b | Client 360 profile | Detail page and interaction creation use the client API; interactions persist in the client's profile JSON. Missing 360 data has safe empty defaults. | Eight complete profile examples, including history, totals, services, contracts, invoices, and documents, are stored in the repeatable customer seed. | **Implementation complete; deployment pending** |
| 2 | Field visits | Page loads and filters API records, shows visit details, and creates/updates visits through the API with loading and error states. | Ten UI examples use a repeatable seed that updates matching company/date records instead of duplicating them. | **Implementation complete; deployment pending** |
| 3 | Leads and sales pipeline | Opportunity backend route exists; pages contain mock data and need API/service wiring. | Seed example leads/opportunities and preserve pipeline stages and follow-ups. | Not started |
| 4 | Executive dashboard | KPI service/backend endpoint exist; page includes mock dashboard data. | Use the seeded business records as its source; connect KPI/chart queries. | Not started |
| 5 | Employees and team | Employee service/backend exist; employee, department, workload, salary, attendance pages use mock data. | Seed examples for each supported model and align all related pages. | Not started |
| 6 | Projects, milestones, tasks, timesheets | Project/task services and backend routes exist; pages use mock data. | Seed relationships and workflow states; connect milestone and timesheet records where supported. | Not started |
| 7 | Contracts and client services | Contract backend routes exist; pages use mock data; frontend service is missing. | Seed contract and renewal examples with valid client/project links. | Not started |
| 8 | Invoices, payments, income, expenses | Finance service/backend routes exist; pages use mock data. | Seed invoices, payments, income and expenses consistently; connect P&L totals. | Not started |
| 9 | Users, roles, settings, product catalog, audit trail | User routes exist; settings pages contain mock data; product/audit APIs need confirmation or implementation. | Seed roles/users/products/audit examples supported by the schema. | Not started |
| 10 | Campaigns, tenders, training | Pages contain mock data; API coverage needs confirmation. | Seed example campaigns, tenders, and sessions once models/endpoints are ready. | Not started |
| 11 | Support and knowledge base | Pages contain mock data; API coverage needs confirmation. | Seed tickets/articles and preserve lifecycle states. | Not started |
| 12 | Documents, communication, meetings, reception, procurement | Pages exist and contain mock data; API/storage coverage needs confirmation. | Seed metadata and related examples; uploaded files need real storage handling. | Not started |
| 13 | Notifications and reports | Pages contain mock data; APIs need confirmation. | Derive reports from seeded records; seed notifications only if they are persistent records. | Not started |

## Per-module completion checklist

- [ ] Compare frontend example records with the database schema and current seed data.
- [ ] Add or align repeatable database seed records for the examples, including required relationships.
- [ ] Confirm the relevant backend endpoints, authorization, validation, filters, and response shapes.
- [ ] Add or complete the frontend service with typed request/response contracts.
- [ ] Replace page-local mock state with API loading and persisted create/update/status actions.
- [ ] Keep useful loading, error, and empty states; avoid silently falling back to stale examples after an API error.
- [ ] Confirm the seeded examples appear in the UI and that a change survives a reload.
- [ ] Update this checklist and the README status when the module is complete.

## Notes

- This is a living integration plan, not a claim that every listed feature is in the initial release.
- Several requirements in the root business documents describe later scope, such as customer portals, electronic signatures, automated messaging, and advanced accounting. Confirm release scope before adding new pages or backend models for those items.
- Existing work may already be in progress. Review current changes before editing shared backend seed or API files.
- Customer list/editor: the profile migration and targeted customer seed were applied to the configured Neon database. The wider seed script was not run. Runtime UI confirmation remains pending because this checkout is missing frontend and backend package links required for TypeScript checks.
- Client 360: the same eight UI examples are exported into `backend/prisma/clientProfileSamples.json` and upserted as nested profile data. The targeted seed ran successfully against Neon on 2026-10-22. A local backend build could not resolve the installed Express packages in this environment; production deployment still needs to build and serve the API and frontend.
- Field Visits: ten frontend examples are exported to `backend/prisma/fieldVisitSamplesData.json` and seeded with the demo sales user and matching clients when available. The targeted seed ran successfully against Neon on 2026-10-22. Local type-checking is limited by unresolved Express and Lucide package links in this checkout; no errors were reported in the seed helper itself.
