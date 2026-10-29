# Changelog — SAN-BMS

Every change to SAN-BMS, newest first. Each entry says **what changed**, **where to find it** in the app,
and **what changed underneath** (API, database, demo data).

- [README.md](README.md) — what the system does today
- **CHANGELOG.md** (this file) — how it got there, change by change
- [SETUP.md](SETUP.md) — how to run it on your own computer

Version numbers before 1.1.0 were assigned afterwards, from the git history.

| Version | Date (2026) | Highlights |
|---|---|---|
| **1.2.0** | 29 Oct | Document library (clients, projects, search, edit, delete), real file storage, PDF quotations and invoices, financial statements, login fix |
| **1.1.0** | 28–29 Oct | Every page reads and saves through the API; all demo data seeded in Neon |
| **1.0.0** | 26–28 Oct | Real login and the core pages on the database |
| **0.3.0** | 22–25 Oct | Client 360 and field visit workflows |
| **0.2.0** | 14–21 Oct | Remaining pages built with sample data; first seed and API service layer |
| **0.1.0** | 11–13 Oct | Foundation: first pages, backend skeleton, hosting on Vercel, Render and Neon |

---

## 1.2.0 — 29 October 2026

### My Tasks visible to every role
- **What:** Every role now has **Team → My Tasks**. Before, Admin (HR), Finance Managers, the Sales
  Manager, the Marketing Manager and Sales Staff had seeded tasks but no menu item to open them.
- **Where:** sidebar → **Team** → **My Tasks**. Roles without the other Team pages see a Team menu
  that holds only My Tasks.
- **Rules:** My Tasks only ever shows the logged-in person's own tasks. The other Team pages
  (Employees, Salary, …) keep their old access.
- **Technical:** `roleAccess` in `frontend/src/store/authStore.ts` gives `my-tasks` to Admin, Finance
  Manager, Sales Manager and Marketing Manager. `Sidebar.tsx` now shows a menu when the role can open
  at least one page in it. No API or database change; the tasks API already returned each user's own tasks.
- **Tested:** frontend type check.

### Documentation: changelog started, README and SETUP brought up to date
*Commit 4a59fc2*
- **What:** This changelog now records every change. README.md describes every page, grouped like the
  sidebar, with where to find it. SETUP.md has the correct demo logins and setup steps.
- **Also fixed:** `backend/.env.example` was missing `DIRECT_URL`, which the database schema requires.
- **Rule from now on:** every change adds an entry here in the same commit, and updates README.md when
  what the system does changes.

### Documents: permanent delete for admins
*Commit 7f820b3*
- **What:** Admins can now delete a document for good. Before, Archive and Edit were the only options.
- **Where:** Documents → All Documents → **Archive** the document → set **Status** to *Archived* →
  red **Delete** → confirm.
- **Rules:**
  - Only Super Admin and Admin see **Delete**; the API refuses everyone else.
  - Only archived documents can be deleted, so one wrong click can't remove a file.
  - The stored file is removed too, unless another document or a signed contract uses the same file.
  - Each deletion is written to the Audit Trail (document, client, project, uploader).
- **Technical:** `DELETE /api/documents/:id` → `deleteDocument` in `officeController.ts`;
  `documentService.remove` on the frontend. No database change.
- **Tested:** 9 automated checks on a local test database; the live API was checked without touching real data.

### Documents: clients, projects, search, filters and edit
*Commit b7e815d*
- **What:**
  - Link each document to a client and, optionally, one of that client's projects. Leave the client
    empty for company documents (policies, templates).
  - Search by name, description, client or project. Filter by category, client, project, status
    (Active / Archived / All) and date range. **Clear filters** resets them.
  - **Edit Document** changes the details or replaces the file.
  - Client 360 → **Documents** lists the client's uploaded documents and signed contracts (Download)
    and its quotations and invoices (PDF).
- **Where:** Documents → All Documents; CRM → Customers → **View Profile** → Documents.
- **Rules:**
  - Choosing a project fills in its client. The API refuses a project that belongs to another client.
  - Only the uploader or an admin can edit, archive or restore a document. Every change is audited.
  - Archived documents stay hidden unless the Status filter asks for them.
- **Technical:**
  - Migration `20261029200000_document_client_project_links`: optional `clientId` and `projectId` on
    `documents`. If the client or project is deleted, the link is cleared and the document stays.
  - `GET /api/documents` accepts `search`, `category`, `clientId` (`none` = company documents),
    `projectId`, `status`, `from` and `to`, and returns the counts for the stat cards.
  - `PUT /api/documents/:id` edits a document. The client detail API now includes the client's
    active documents.
- **Demo data (seeded in Neon):** existing documents linked to their clients and projects; 3 new client
  documents (ECOBANK proposal, Rwanda Mountain Ride handover report, N&T PLASTIC SANTRACK user manual);
  sample PDF files attached so **Download** works in a demo.
- **Tested:** 21 automated checks on a local test database.

### Financial statements
*Commit c85e906*
- **What:** A new **Statements** tab:
  - **Balance sheet:** cash and bank, accounts receivable and equipment, against accounts payable and equity.
  - **Cash flow by month:** opening cash, cash received, operating payments, equipment purchases, closing cash.
  - **Accounts payable:** approved or ordered purchases not yet delivered, plus unpaid salaries.
  - **Accounts receivable:** what clients still owe on issued invoices.
- **Where:** Finance → Overview & P&L → **Statements**.
- **Rules:**
  - Visible to Super Admin, Admin and Finance Manager (checked by the API).
  - The opening cash balance is set on the same tab.
  - Expenses in the *Equipment* category count as fixed assets (investing), not running costs.
  - These are simplified statements built from the system's own records.
- **Technical:** `GET /api/finance/statements` and `PUT /api/finance/opening-cash` in
  `financeController.ts`; `StatementsTab.tsx`. The opening cash is stored in the `settings` table
  (key `finance`), so there is no migration.
- **Demo data (seeded in Neon):** opening cash of RWF 15,000,000.

### Real file storage for documents and signed contracts
*Commit 121bfd4*
- **What:** Uploads now keep the file itself, not just its name, so it can be opened and downloaded later.
- **Where:**
  - Documents → **Upload Document**.
  - Contracts → open a contract → **Attach signed contract file**, then **Open signed document**.
    A contract can become Active only once this file is attached.
- **Rules:**
  - Accepted files: PDF, Word, Excel, images (PNG, JPG, GIF, WebP), text/CSV or zip, up to 5 MB each.
  - Only logged-in users can open or download files.
- **Technical:**
  - Files are stored in the database (`stored_files` table, migration `20261029180000_stored_files`),
    because Render's free plan wipes its disk on every deploy.
  - `POST /api/files` uploads a file (sent as base64). `GET /api/files/:id` returns it; add `?download`
    to download it.
  - `fileService.ts` on the frontend. Uploads are audited.

### Quotations and invoices as PDF
*Commit b063acb*
- **What:** One click turns a quotation or invoice into a branded A4 page. It shows the company details,
  client and contact, line items, VAT, total, payment terms and notes. The browser's print window opens;
  choose **Save as PDF**.
- **Where:**
  - Sales → Quotations → open a quotation → **PDF**.
  - Finance → Invoices & Payments → open an invoice → **PDF**.
  - Client 360 → Documents.
- **Technical:** `frontend/src/lib/printDocument.ts`, which reads the company details from
  Settings → Company Profile. No backend or database change.

### Tighter page spacing
*Commits 96f50a3, 4860652*
- Smaller gaps between cards, grid items and page sections on every page (`frontend/src/index.css`).

### Imigongo background kept as it was
*Commits 048d190, 03cd4f5*
- We tried showing the Imigongo pattern behind page cards (048d190), then reverted it (03cd4f5) to keep
  the original background.

### Every demo login has tasks
*Commit 077cfb3*
- **What:** Every demo account has tasks on **Team → My Tasks**, so no login opens an empty page in a demo.
- **Technical:** new seed step `prisma/seeds/tasksForEveryone.ts` (seeded in Neon).

### Login: clear error messages, no more lock-outs
*Commit 79f6cc8*
- **What:**
  - A wrong password shows **"Invalid email or password."** under the form. Before, the page reloaded
    and the message vanished.
  - If the server can't be reached (Render waking up), the page says so and asks you to wait 30 seconds.
  - Too many wrong passwords show a clear message instead of failing silently.
- **Rules:** only failed logins count, 10 per 15 minutes per visitor; successful logins never count.
  Before, everyone shared one limit behind Render's proxy, so a few bad attempts could lock out the whole office.
- **Technical:** `app.set('trust proxy', 1)` and a login-only rate limiter with `skipSuccessfulRequests`
  (`backend/src/index.ts`). The 401 handler in `frontend/src/lib/api.ts` ignores the login request.

---

## 1.1.0 — 28–29 October 2026

Every page now reads and saves through the API. The sample (mock) data was moved into the Neon database, so
demos show realistic records and new records can be created live.

### README updated for the connected system
*Commit 9ada78d*
- Demo logins, how the modules feed each other, database schema, and how to seed Neon.

### Last sample-data pages connected
*Commit 623d4ce*
- **Pages:** Documents, Attendance & Leave, Tenders, Procurement, Training (SANHUB), Knowledge Base,
  Company Profile, Roles & Permissions.
- **Rules added:**
  - Approving leave notifies the employee and marks them *On Leave* when the leave covers today.
  - Checking yourself in after 08:30 is marked *Late*.
  - Purchases go Pending → Approved → Ordered → Delivered. Delivery books the expense in Finance, and
    nobody approves their own request.
  - A paid training fee books Training income. Certificates are given only after attendance.
  - Knowledge Base drafts are private to their author, and articles count their views.
  - Tender deadlines create reminders.
  - The Roles page shows the real access rules and live user counts.
  - Unknown `/api` addresses return 404.
- **Technical:** migration `20261029160000_documents_attendance_tenders_procurement_training_kb_settings`.
  The old sample arrays are kept as JSON in `prisma/seeds/data/` and loaded by the seed.

### Client Services & Renewals, Campaigns, Timesheets
*Commit aa17ce8*
- **Client services:**
  - **Mark Paid** books Finance income; **Renew** moves the date forward one billing cycle.
  - Unpaid services past their renewal date become overdue.
  - Reminders come 30, 15 and 7 days before renewal and on expiry.
- **Campaigns:** create and edit them, and record results (leads, clients, revenue) to get the ROI.
- **Timesheets:** staff log their own hours; project leads approve or reject them (never their own).
  Project profitability = payments received − staff time cost.
- **Technical:** migration `20261029140000_subscriptions_campaigns_timesheets`; demo services
  (plus 3 hosting clients), campaigns and timesheets seeded.

### Reports, Communication Log, Meetings, Client 360 timeline
*Commit c9f9c0e*
- **Reports** are calculated from live data, and each role sees only what it is allowed to: sales per
  salesperson, finance by service with top clients, team performance, and clients by category.
- **Communication Log and Meetings** have their own tables and APIs. Follow-ups and today's meetings feed
  Notifications, and meeting participants are notified.
- **Client 360** shows one timeline of field visits, communications, meetings, quotations, contracts,
  invoices and tickets. **Add Interaction** saves to the Communication Log.
- **Fix:** client totals counted only the last 5 invoices.
- **Technical:** migration `20261029120000_communications_meetings`; demo communications and meetings seeded.

### Leads, Quotations, Support, Products, Departments, Users, Reception, Notifications
*Commit b02d6c4*
- **Leads:** **Advance** moves a lead to its next stage; **Convert to Deal** creates the client (if new)
  and a pipeline deal.
- **Quotations:**
  - The server calculates the totals, and approval runs Salesperson → Manager → CEO.
  - An approver can send a quotation back with a reason, and the client can reject it.
  - Quotations expire automatically, and an accepted one converts into a draft contract.
- **Also connected:**
  - Support tickets, the product catalog (with SLA) and departments (live staff counts).
  - User management: admins only, and only a Super Admin manages Super Admins.
  - Reception check-in and check-out, which notifies the host.
- **Notification engine:** overdue and due invoices, contract expiry, signature and approval, task
  deadlines and approvals, and lead and deal follow-ups. The bell shows the real unread count.
- **Technical:** migration `20261029090000_leads_quotations_tickets_departments_visitors_notifications`;
  extra demo staff (jean, grace, marie, paul, eric @santech.rw).

### Half-connected pages finished, permissions tightened
*Commit 13d0e34 (28 Oct)*
- **Now saved to the database:**
  - Invoices: creating one, and recording a payment, which also books income.
  - Finance: income, expenses, P&L by category and the 6-month chart.
  - Pipeline, Contracts (approval and signing), Milestones (complete, approve, invoice) and Salary
    (bonus, pay, promote).
- **Read from the database:** dashboard charts and the Audit Trail. Every key action is audited.
- **Fixes:** creating a project, assigning tasks from Tasks and Workload, and the task approval status.
- **Security:** salaries are hidden from roles outside HR and finance. Role checks were added to the
  finance, projects, tasks, contracts, payroll and audit routes.
- **Technical:** migration `20261028120000_finance_entries_milestone_status_contract_fields`. The sample
  data moved into the seed, which is safe to re-run and never overwrites demo edits.

---

## 1.0.0 — 26–28 October 2026

Real login, and the first pages on the database.

- **Demo logins** all use `Santech@2026`, matching the seeded database (556ec12).
- **Page shaking fixed:**
  - A skeleton loader replaced the spinner, and the scroll area became stable (9b95034, 82e9425, 334fc41).
  - The root cause was the fixed-position sidebar, which made the content reflow on every render (c1de83c).
- **API rate limit** raised to 1,000 requests per 15 minutes; 100 caused errors on Field Visits (3c928a8).
- **Neon:** the database is warmed up on start and pinged every 4 minutes to keep it awake. CORS now
  allows the Vercel site (3fbf1a4).
- **Seed** rewritten to upsert by unique fields (aabddf6).
- **Vercel** now points to the Render API, which fixed "Network Error" (e139e38).
- **Pages connected to the API** (some were finished in 1.1.0):
  - Employees, Projects, Milestones, Tasks, Finance, Contracts, Pipeline, Audit Trail (b51b002).
  - My Tasks, Workload, Salary, Invoices (81a9888, 29e2b73, 9dc7838).
- **Customers:** four client kinds (Individual, Business, Team, Delegation) with members. Customers and
  Client Profile read the API. Migration `20261026144640_add_client_kind_and_members` (af7da61).
- **Dashboard** reads real totals from the database (ba459ca).
- **Field Visits** are saved through the API (5ae23d4).
- **Real JWT login** replaced the mock login (12506f4).
- **Imigongo pattern** added to the page background, under a light brand-blue layer (ad2c6ab, 1f59272).
- **Housekeeping:**
  - Build output and temp files are no longer tracked (13cb811, 09c1892).
  - Implementation notes are in `.agents/tasks/wire-core-slice-summary.md` (487c4bf).

---

## 0.3.0 — 22–25 October 2026

- Client 360 profiles integrated (46bc5ca).
- Field visit workflows integrated (4917804).
- Customer and field visit samples were connected to the backend (ac7fa84), then reverted the same day (9aff1f3).

---

## 0.2.0 — 14–21 October 2026

- **New pages, all with sample data at the time:**
  - Documents, Timesheets, Procurement, Company Profile, Roles & Permissions, Tenders and Knowledge Base,
    with routes and sidebar (47d4063, ace8543, d604eff, cafa0ee, 61fb21c, fc9a40c, f001db2, 6b6a0ca, 952d2cd).
  - HR Attendance & Leave (926f262).
  - SANHUB Training: sessions, attendees and certificates (0fbf172).
  - Milestones, Meetings, Communication Log and Reception (cbc1de9, 1e58439, 7b44b0e, 57959cd, b87d0a2, 783b314).
- **First database seed** with the sample data, plus the frontend API service layer (a48bbe0).
- **Date range picker** component (13d7f22).
- **Spacing:** tighter pages and grids, and a smaller gap under the top bar (b7a85b6, b8fdd0a, 0765811, 992ed04).
- **README** rewritten with all built features (72db944).

---

## 0.1.0 — 11–13 October 2026

- **Foundation:** dashboard, field visits, login and the first backend API (fa50615).
- **First pages:**
  - Projects, Invoices, Finance (overview, income, expenses), Reports, Notifications, Support, Product
    Catalog and Quotations, with routes and menu (de9476f … 91d3549).
  - Departments and Client Services (5801701, 79af1e0).
  - Customers with a 4-step form and client kinds, and the Client Profile page (3dd385e, 285ba1a, c28cd03, c663102).
  - Audit Trail, role-based sidebar and a mock login (37b63d2).
  - Team Workload (d34bd01) and Campaigns (f6533db).
- **Delegation representative:** title, location, country and a PRIMARY CONTACT badge (87ad216, 2081cbb, 2cc2022).
- **Login page** redesigned with a split panel, feature showcase and quick demo login (3dc357a, 4dffa14, 726ced0, 3b6cbf3).
- **Phone input** with a country code selector (e2d1389).
- **Hosting:**
  - Vercel and Render configuration (c194668).
  - Neon PostgreSQL with direct URL support (a3dca8b).
  - Backend structure and TypeScript build fixes (7eb95c8, 6346327, 23d8ac1, 19d8fa9, e0e4529, 63eb840, f4ae0d4).

---

## How to add an entry

Add the entry **in the same commit as the change**, at the top of the newest version (or under a new
version heading). If what the system does has changed, update README.md too. A new entry can't name
its own commit; add the commit hash later if useful.

```markdown
### Short title in plain words
- **What:** what users can do now, or what was fixed
- **Where:** sidebar path and the buttons to click
- **Rules:** who can do it, limits, what happens automatically
- **Technical:** API routes, migrations, seed changes, main files
- **Demo data:** what was seeded into Neon (if anything)
- **Tested:** how it was checked
```
