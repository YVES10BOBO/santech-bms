# SAN-BMS — Santech Business Management System

> **Version:** 1.2.0 · **Status:** all pages connected to the live API and PostgreSQL (Neon) database
>
> **Live app:** https://santech-bms.vercel.app · **API:** https://santech-bms-api.onrender.com
>
> **What's new:** see [CHANGELOG.md](CHANGELOG.md) — every change, newest first

---

## About Santech Innovate

Santech Innovate is an IT services startup based in **Kigali, Rwanda** that builds and manages
technology systems for client companies. Their product portfolio includes:

| Product | Description |
|---|---|
| **EVS (E-Visitors System)** | Digital gate pass, attendance, and visitor management |
| **SANTRACK** | Stock and inventory tracking system |
| **REVIXSAN** | Business management solution |
| **SANBOOK** | Financial and accounting solution |
| **SANHUB** | Training and learning hub |
| **Custom Software** | Websites, mobile apps, CRM, ERP systems |

---

## Project Goal

Replace the manual **Excel-based** client tracking system with a modern, secure, web-based
Business Management System (SAN-BMS) that manages the full business lifecycle:

```
Lead → Sale → Contract → Project → Invoice → Payment → Support → Renewal
```

This system serves as Santech's internal **ERP + CRM platform**.

---

## Live Demo — Login Credentials

All demo accounts use the password **`Santech@2026`**.

| Role | Email | Access |
|---|---|---|
| Super Admin | `admin@santech.rw` | Full system |
| Super Admin (CEO) | `jean@santech.rw` | Full system — final approver of quotations |
| Admin (HR) | `claire@santech.rw` | Everything except Super Admin actions |
| Finance Manager | `david@santech.rw` | Finance, invoices, payroll payments, contracts, reports |
| Finance Manager | `grace@santech.rw` | Same as David |
| Sales Manager | `paul@santech.rw` | CRM, sales, quotation manager approval, reports |
| Sales Staff | `alice@santech.rw` | CRM, leads, pipeline, quotations, My Tasks |
| Marketing Manager | `eve@santech.rw` | CRM, campaigns, reports |
| Project Manager | `bob@santech.rw` | Projects, milestones, tasks, timesheets, team |
| Project Manager | `marie@santech.rw` | Same as Bob |
| Employee | `frank@santech.rw` | My Tasks, own attendance, timesheets |
| Customer (portal) | `customer@santech.rw` | Customer portal of N&T PLASTIC INDUSTRIES only |
| Supplier (portal) | `supplier@santech.rw` | Supplier portal of TechHub Kigali only |
| (inactive) | `eric@santech.rw` | Deactivated account — cannot log in |

Every demo login has tasks on **My Tasks**. After 10 wrong passwords within 15 minutes, logins from
that network pause for 15 minutes; successful logins never count.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18 + TypeScript | UI framework |
| Build Tool | Vite | Fast development server |
| Styling | Tailwind CSS | Utility-first CSS |
| State | Zustand | Client-side state management |
| Forms | React Hook Form + Zod | Form validation |
| Charts | Recharts | Dashboard analytics |
| Icons | Lucide React | Icon library |
| Backend | Node.js + Express | REST API server |
| Database | PostgreSQL (Neon) | Relational data storage |
| ORM | Prisma | Type-safe database queries |
| Auth | JWT + bcrypt | Secure login + role-based access |
| File storage | PostgreSQL (`stored_files` table) | Uploaded documents and signed contracts, 5 MB per file |
| PDF | Browser print → Save as PDF | Branded A4 quotations and invoices |
| Frontend Deploy | Vercel | Automatic GitHub deployment |
| Backend Deploy | Render | Node.js hosting |
| Database Host | Neon.tech | Serverless PostgreSQL |

---

## Project Structure

```
santech-bms-current/
├── frontend/                         ← React + TypeScript + Vite + Tailwind
│   └── src/
│       ├── pages/                    ← one folder per module (crm, sales, finance, projects, team, …)
│       ├── components/layout/        ← sidebar, top bar (live notification bell), page shell
│       ├── lib/api.ts                ← Axios client (JWT header, 401 → login)
│       ├── lib/printDocument.ts      ← branded A4 quotation / invoice → Save as PDF
│       ├── lib/services/             ← one small client per API area
│       │   ├── lookupService.ts      ← shared dropdown data (clients, staff, contracts, projects)
│       │   ├── fileService.ts        ← upload, open and download stored files
│       │   └── operationsService.ts  ← leads, quotations, tickets, HR, documents, reception, …
│       └── store/authStore.ts        ← login state + role → module access rules
│
├── backend/                          ← Node.js + Express + Prisma
│   ├── src/
│   │   ├── routes/                   ← auth, clients, finance, projects, tasks, salary, reports, files, …
│   │   ├── controllers/              ← business rules (approvals, totals, workflows)
│   │   ├── lib/
│   │   │   ├── roles.ts              ← role groups used by every route guard
│   │   │   ├── audit.ts              ← writes the audit trail for every important action
│   │   │   ├── notifications.ts      ← reminder engine (invoices, contracts, tasks, renewals, …)
│   │   │   └── numbering.ts          ← INV-/CT-/QT-/TKT- document numbers
│   │   └── middleware/auth.ts        ← JWT check + role authorisation
│   └── prisma/
│       ├── schema.prisma             ← full database schema
│       ├── migrations/               ← applied automatically on Render deploy
│       ├── maintenance/              ← one-off data fixes (dry run first, then --apply)
│       ├── seed.ts                   ← demo data entry point
│       └── seeds/                    ← demo data per area (+ data/*.json)
│
├── backups/                          ← local database backups (git-ignored, never committed)
├── README.md                         ← what the system does (this file)
├── CHANGELOG.md                      ← every change, newest first
└── SETUP.md                          ← run it on your own computer
```

### How the modules feed each other

| Action | What happens automatically |
|---|---|
| Lead → **Convert to Deal** | Client registered (if new) + qualified deal added to the pipeline |
| Quotation → approvals | Salesperson → Manager → CEO, each step notifies the next approver |
| Accepted quotation → **Convert** | Draft contract created with the same value and line items |
| Contract **Active** | Requires all signatories signed + signed contract file attached |
| Milestone approved → **Generate Invoice** | Invoice created for the milestone's share of the contract |
| Invoice **payment recorded** | Income entry in Finance (P&L, dashboard, reports update) |
| Salary **Mark Paid** | Salaries expense in Finance |
| Client service **Mark Paid** | Maintenance income in Finance |
| Purchase **Delivered** | Expense in Finance |
| Training fee **paid** | Training income in Finance |
| Unpaid invoice / approved purchase / unpaid salary | Listed under Accounts Receivable or Accounts Payable on Finance → Statements |
| Document linked to a client | Shown in that client's Client 360° profile, ready to download |
| Task / timesheet / leave **approved** | Employee notified; task approval raises performance score |
| Visitor **checked in** | Host notified |
| Every important action | Written to the Audit Trail (who, what, before/after, IP, device) |

---

## System Modules

Grouped as they appear in the sidebar. **Where** shows how to get to each page. Every page reads and
saves through the API.

The white menu button in the sidebar's top-right corner collapses the sidebar to icons and expands it
again. On phones, the menu button in the top bar opens the sidebar, and its X button closes it.

### Login & Access Control
**Where:** `/login`
- Professional split-panel login page (Imigongo pattern) with quick demo login buttons
- **Page background on every screen** (staff pages, customer and supplier portals, login): the Imigongo
  pattern at the back, a light see-through layer (`#f4f6fa` at 60%) over it, and the white cards on top.
  The layer is one setting, `--page-layer` in `frontend/src/index.css`.
- JWT login; 8 staff roles, each with its own sidebar (see [Role-Based Access](#role-based-access))
- The API checks the role on every route, so hiding a menu item is never the only protection
- Clear messages when login fails: wrong email or password, too many failed attempts, or the server
  still waking up (Render free plan)
- **Top-bar search** across clients, leads, quotations, contracts, invoices, projects, tasks, documents
  and staff, only in the areas your role can open
- **My Profile** (profile menu, top right): change your name, phone and password

### Dashboard
**Where:** Dashboard
- 8 KPI cards: total customers, active, new this month, leads, conversion rate, active/completed/delayed projects, pending invoices, overdue payments
- Revenue vs Expenses area chart (6 months)
- Service revenue pie chart (EVS, SANTRACK, Websites, etc.)
- Sales pipeline bar chart
- Recent field visits list
- P&L summary card (Revenue, Expenses, Net Income)

### CRM

#### Customers
**Where:** CRM → Customers

**4 client types with different required fields:**

| Type | Key Required Fields |
|---|---|
| Individual | Name, Phone, Email, Location (ID optional) |
| Business | Company Name, TIN Number, Location, Representative (name/phone/email) |
| Team | Team Name, Organization, Leader info, Members list (min 1) |
| Delegation | Delegation Name, Origin/Country, Representative with location/country, Members (min 2) |

- Multi-step registration form (4 steps: Type → Info → Services → Review)
- Services selection with descriptions (13 services + Other)
- View side panel with all details; PRIMARY CONTACT badge for the delegation representative
- **View Profile** opens the Client 360° profile
- **Attach Document** uploads the file and files it in Documents under the client (also shown on Client 360°)

#### Client 360° Profile
**Where:** CRM → Customers → **View Profile**
- One timeline of everything with the client: field visits, calls/emails/notes, meetings, quotations,
  contracts, invoices and support tickets
- Financial summary (invoiced, paid, outstanding, profit margin) from all of the client's invoices
- Services used with status (Active/Expired/Pending) and contracts
- **Documents:** the client's uploaded documents and signed contracts (**Download**), plus its
  quotations and invoices (**PDF**)
- **Add Interaction** (call, meeting, email, note, status change) saves to the Communication Log
- Works for prospects too — history is kept even if the deal was lost
- **Customer portal access** (Super Admin, Admin, Sales Manager): add a login for a person at the client
  (name, email, phone). A temporary password is shown once with the sign-in address, ready to copy and
  send. Reset the password or disable the login from the same card.

#### Leads
**Where:** CRM → Leads
- Lead journey: New → Contacted → Qualified → Converted → Lost
- Advance status button (one click to move forward)
- **Convert to Deal** (Qualified leads): registers the client if new and adds a deal to the pipeline
- Detail side panel; filters: status, category, product, search

#### Field Visits
**Where:** CRM → Field Visits
- Direct migration from the Excel sheets (all columns preserved)
- Record new visits with a full form
- Filters: category, outcome, product, date range, contract won
- Rows per page: 5/10/20/All with pagination
- Categories: Self Employed, Institution, Industry, Distributor

### Sales

#### Deal Pipeline
**Where:** Sales → Deal Pipeline
- Kanban board (drag & drop between stages) + list view
- 8 stages: New Lead → Contacted → Qualified → Requirements → Proposal → Negotiation → Won/Lost
- Probability bars per deal; KPI cards: active deals, total value, weighted value, won value
- Deal detail side panel with next action; move forward/back buttons on each card

#### Quotations
**Where:** Sales → Quotations
- Multi-line quotation builder; subtotal, VAT and total calculated by the server
- **Currency:** RWF, USD, EUR, GBP, KES, UGX or TZS. The rate of the day is saved with the quotation;
  totals on the page are in RWF.
- **Version history:** editing the items, prices, discount, VAT, validity or terms keeps the earlier
  version. The panel lists each version with what changed (old → new) and who changed it.
- **Discount (%)** next to the VAT rate: taken off the subtotal before VAT
  (subtotal − discount + VAT = total). It shows in the preview, the quotation panel, the PDF and the
  client's 360° page, so approvers see it.
- Approval chain: Salesperson → Sales Manager → CEO; each step notifies the next approver, who can
  send it back with a reason
- After approval: Sent → Viewed → Negotiation → Accepted, or Rejected by the client; quotations past
  their *valid until* date expire automatically
- **Convert** an accepted quotation into a draft contract with the same value and line items
- Reminder to the salesperson (and Sales Manager) 3 days before a sent quotation's *valid until* date
- **PDF:** open a quotation → **PDF** → the print window opens → *Save as PDF*. The page carries the
  company details from Settings → Company Profile.

#### Tenders
**Where:** Sales → Tenders
- Bid tracking: Open → Submitted → Under review → Won / Lost (or Cancelled)
- Assigned person, deadline and value; KPI cards include won bids and won value
- Deadline reminders in Notifications

### Marketing

#### Campaigns
**Where:** Marketing → Campaigns
- Campaign cards with ROI from the recorded results (leads, clients won, revenue)
- Grid + list view; stats: total, active, total leads, best ROI
- New Campaign form (name, type, budget, dates, channels, team); detail side panel
- Types: Expo/Event, Field Visits, Social Media, Email, Referral, Cold Outreach
- Status: Planning → Active → Paused / Completed / Cancelled

#### Training (SANHUB)
**Where:** Marketing → Training (SANHUB)
- Training sessions with type, trainer, venue, dates, maximum attendees and fee per person
- Status: Upcoming → In progress → Completed (or Cancelled)
- Attendees: Registered → Attended → Certified (or Absent); certificates only after attendance
- A paid attendee fee is booked as Training income in Finance; total training revenue is shown
- Grid + list view

### Contracts

#### All Contracts
**Where:** Contracts → All Contracts
- Lifecycle: Draft → Review → Approval → Signing → Active → Completed (also Renewal, Cancelled)
- Signatories tracked one by one
- A contract becomes **Active** only when every signatory has signed **and** the signed contract file
  is attached
- **Attach signed contract file** (PDF, Word or image, up to 5 MB) and **Open signed document** from
  the contract panel
- **Project created automatically:** when a contract becomes Active and no project is linked to it,
  a project is created (status Planning) with the contract's client, value and dates and its
  responsible manager as project manager (or the person who activated it). The manager is notified.
- **Currency** per contract (the rate of the day is saved); the active value is shown in RWF
- **Version history:** changing the value, currency, dates, payment terms, deliverables, client or
  project name saves a new version; the panel lists earlier versions and what changed. Status
  changes are not versions (they are in the Audit Trail).
- Stats: total, active, pending signature, active value

#### Client Services & Renewals
**Where:** Contracts → Client Services
- Hosting, domains and maintenance per client
- Hosting providers: Spaceship, AOS Rwanda, Namecheap, Santech Server, Cloudflare
- Service types: Hosting Only, Maintenance Only, Hosting + Maintenance, Domain Only, Domain + Hosting
- **Renewal alert banners:**
  - 🔴 Expired — immediate action required
  - 🟠 Expiring in 15 days — critical
  - 🟡 Expiring in 30 days — warning
- Reminders 30, 15 and 7 days before renewal and on expiry
- **Recurring invoices:** with *Raise the invoice automatically* on (the default), a draft invoice for
  the next period is created 14 days before the renewal date (or straight away if it is overdue) and
  Finance is notified to check and send it. The service then shows its invoice number instead of
  *Mark Paid*; paying that invoice in full marks the service period paid.
- **Mark Paid** (services without an invoice for the period) books the payment as income in Finance;
  **Renew** moves the renewal date one billing cycle forward; unpaid services past renewal become
  overdue
- **Currency** per service (e.g. a hosting plan billed in USD); its invoices use the same currency
- Tax tracking (with/without VAT) and profit (amount charged − actual cost)

### Finance

#### Overview & P&L
**Where:** Finance → Overview & P&L — 5 tabs:
- **Overview:** P&L (Revenue − Expenses = Profit), KPI cards, 6-month chart
- **Income:** income by category (EVS, SANTRACK, Website, Training, …) with Add Income
- **Expenses:** expenses by category (Salaries, Rent, Internet, Equipment, …) with Add Expense
- **Statements:** see the next section
- **Currencies:** exchange rates to RWF (also in Settings → Company Profile). Finance and admins edit
  them; everyone else can read them.
- **Reports are in RWF.** Income and expenses are kept in RWF; one received or paid in another
  currency keeps its original amount and rate (shown under the amount, e.g. *USD 500 at 1,450*).
  Add Income / Add Expense have a currency choice.

#### Financial Statements
**Where:** Finance → Overview & P&L → **Statements** (Super Admin, Admin, Finance Manager)
- **Balance sheet:** cash & bank, accounts receivable and equipment, against accounts payable and
  equity (capital & retained earnings)
- **Cash flow** by month: opening cash, cash received, operating payments, equipment purchases
  (investing), net cash flow, closing cash
- **Accounts payable:** approved or ordered purchases not yet delivered, plus unpaid salaries
- **Accounts receivable:** what clients still owe on issued invoices
- **Opening cash** is set on the same tab (demo data starts at RWF 15,000,000)
- Simplified statements built from the system's own records

#### Invoices & Payments
**Where:** Finance → Invoices & Payments — tabs **Invoices**, **Proforma**, **Credit notes**
- Invoice table with status badges (Draft/Sent/Due/Partial/Paid/Overdue); the cards at the top are in
  RWF (each invoice converted at its own rate)
- **Proforma invoices** (`PF-2026-001`): **+ Proforma** bills an advance or confirms prices before the
  order. A proforma is never paid itself and does not count as owed. **Convert to invoice** creates
  the real invoice (same amounts and currency, marked Sent) and links the two.
- **Credit notes** (`CN-2026-001`): open a sent invoice → **Issue credit note** with the amount and
  reason (discount agreed later, work not delivered, billing mistake). It lowers what is still owed;
  VAT is credited in the same proportion. It cannot be more than the balance. An invoice paid and
  credited in full becomes Paid; one fully credited with no payment becomes Cancelled.
- **Raise service invoices** creates the recurring invoices for client services renewing within
  14 days (the server also does this every 6 hours). They are drafts: check them and **Mark as sent**.
- **Currencies:** an invoice can be in RWF, USD, EUR, GBP, KES, UGX or TZS. The rate of the issue day
  is saved with it. A payment is recorded in the invoice's currency and booked as income in RWF at
  the rate of the payment day.
- **Cancel** (no payments or credits yet) and **Mark as sent** in the invoice panel. The status of a
  real invoice follows its payments; it cannot be set to Paid by hand.
- **New Invoice:** choose the client first. The Contract and Project lists (both optional) then offer
  only that client's own contracts and projects, and picking a project fills in its contract. The
  server refuses a contract or project that belongs to another client.
- A new invoice shows in this list, in the client's Client 360° profile and in the Audit Trail. Once
  it is **Sent**, it also counts in Dashboard → Pending invoices, Finance → Statements → Accounts
  Receivable, and the due/overdue reminders in Notifications.
- **Record Payment** (amount, date, method, reference); overpayment is refused
- Each payment is booked as income in Finance and the status updates automatically
- **PDF:** open an invoice → **PDF** → *Save as PDF*. Proformas print as *PROFORMA INVOICE* (not a tax
  invoice), credit notes as *CREDIT NOTE* with the invoice they reduce; an invoice shows its credit
  notes and the balance due.
- Stats: total invoiced, total collected, outstanding, overdue count

### Procurement
**Where:** Procurement → Purchases & Stock — tabs **Purchase requests** and **Suppliers**
- Purchase requests: item, category, quantity, unit price, supplier (from the list, or a name), notes
- Pending → Approved → **Place order** → Delivered (or Cancelled); nobody approves their own request
- **Place order** needs a supplier and gives the order a number (`PO-2026-001`). If the supplier has a
  portal login, it sees the order at once and is notified.
- Each request shows what the supplier did: confirmed (with the delivery date), dispatched, and its
  invoice (opens the file; a warning shows when it differs from the order value).
- **Delivered** books the expense in Finance; approved and ordered purchases show in Accounts Payable.
  The supplier is told the delivery was received.
- **Suppliers** tab (Finance and admins edit; everyone can read): name, category, contact, email, phone,
  address, TIN, notes, active or not, number of orders, and **Portal access** to create supplier
  portal logins (temporary password shown once).

### Customer Portal
**Where:** sign in with a customer login (e.g. `customer@santech.rw`) → lands on `/portal`. Customer logins
only ever see their own client's records and never the staff menus or API.
- **Overview:** what needs attention (quotations to answer, open and overdue invoices with the balance per
  currency, active projects and their average progress, open tickets, active contracts), the account
  manager's contact, and the latest updates.
- **Quotations:** sent quotations with lines and totals, PDF, **Accept** (optional message) or
  **Decline** (reason required). Opening a sent quotation marks it *Viewed*. Expired quotations cannot be
  accepted. The salesperson and sales manager are notified, and the answer is in the quotation history.
- **Invoices:** invoices, proforma invoices and credit notes (no drafts), what is still to pay, payments
  received and credit notes, PDF for each.
- **Contracts:** signing, active, completed and renewal contracts with value, dates, terms, deliverables,
  signatures and the signed file to download.
- **Projects:** status, progress, milestones and dates, project manager, warranty end date (no budget).
- **Support:** open a ticket (subject, product, urgency, description), follow its status and response
  times, rate the help (1–5) once resolved, or reopen it when the problem comes back.
- **Documents:** signed contracts and the documents Santech shared with the client.
- **Account:** name, phone, change password.
- **Notifications:** the client is told when Santech sends a quotation, an invoice, a proforma or credit
  note, shares a document, activates a contract, or updates a ticket.

### Supplier Portal
**Where:** sign in with a supplier login (e.g. `supplier@santech.rw`) → lands on `/supplier`.
- **Overview:** new orders to confirm, confirmed / on the way, delivered, waiting for the supplier's
  invoice, open order value, latest updates.
- **Purchase orders** placed with that supplier (with a PO number): **Confirm order** with the expected
  delivery date (and a note), **Mark dispatched**, **Send invoice** (amount + PDF or photo).
  Procurement / Finance and the person who asked for the item are notified at each step.
- Santech still confirms the delivery in Procurement, which books the expense.

### Reports
**Where:** Reports → All Reports — 4 tabs, calculated from live data:
- **Sales:** salesperson performance, leads, conversions, win rate
- **Finance:** revenue, expenses, profit, income by service, top clients by revenue
- **Team:** employee performance, tasks completed, completion rates
- **Clients:** breakdown by category, contractors vs prospects

### Support

#### Support Tickets
**Where:** Support → Support Tickets
- Lifecycle: New → Assigned → In Progress → Waiting Customer → Resolved → Closed
- Priority badges: Low, Medium, High, Urgent
- New Ticket form (client, subject, description, product, priority, assignee)
- Side panel with Mark Resolved and Close Ticket
- **Response and resolution times:** the first response is recorded when work starts (In Progress,
  Waiting Customer, Resolved or Closed); the resolution time when it is resolved or closed. Both show
  in the ticket panel.
- **Customer satisfaction:** once a ticket is resolved, record the customer's rating (1–5 stars) and
  what they said. Ratings show as stars in the table.
- Stats: total, open, in progress, resolved today, average first response, average resolution time,
  average satisfaction

#### Knowledge Base
**Where:** Support → Knowledge Base
- Articles by category, saved as Draft or Published
- Drafts are visible only to their author; published articles count their views

### Reception — Visitor Log
**Where:** Reception → Visitor Log
- Register visitors (name, phone, email, company, host, expected time, notes)
- **Check in**, **Check out** or **No-show**; the host is notified on check-in
- Today's visitors at a glance

### Communication

#### Meetings
**Where:** Communication → Meetings
- Client, project, internal, sales, contract and training meetings — in person or online (with link)
- Agenda, participants, decisions made, action items, follow-up date
- Status: Scheduled → In progress → Completed (or Cancelled / Postponed)
- Participants are notified; today's meetings appear in Notifications

#### Communication Log
**Where:** Communication → Communication Log
- Calls, emails, WhatsApp, SMS, meetings and notes — inbound or outbound — with summary and duration
- Follow-up dates create reminders in Notifications
- Every entry appears on the client's Client 360° timeline

### Documents
**Where:** Documents → All Documents (Super Admin and Admin). Works like Google Drive.
- **My folders (admins create them):** folders and subfolders the company manages itself, e.g.
  *Contracts › Signed contracts* or *Finance › Invoices*. Use **New → New folder**, or the folder's ⋮
  menu: *New subfolder*, *Rename / colour*, *Move to…*, *Delete folder*. Deleting a folder never deletes
  documents; its contents move up one level. File a document with ⋮ → *Move to folder…*, the Folder
  field, or by dragging it onto a folder.
- **Automatic folders.** Each document's client, project and type also decide where it shows, even when
  it is filed in one of your folders:
  - **Clients** → one folder per client → one per project;
  - **Company documents** (no client);
  - one folder per type (**Contracts, Invoices, Proposals, Reports, Policies, Other documents**);
  - **Expiring soon** (shown when there are any): documents whose expiry or review date is within
    30 days or already past;
  - **Archive** for archived documents.
- **Grid or list layout,** switched with the list/grid button at the top right. The page remembers
  your choice. **Breadcrumbs** (*Documents › Clients › client › project*) take you back up, and so
  does the browser's Back button.
- **Search** looks through every folder (name, description, client, project). Each result shows its
  location; click it to open that folder. Filter by **type** and **modified date**, and sort by
  newest, oldest or name.
- **Drag & drop from your computer:** drop files or whole folders anywhere on the page to upload them
  into the open folder, or onto a folder card to upload into that folder. Dropped folders keep their
  subfolders. **New → File upload / Folder upload** does the same with a picker; an upload panel shows
  the progress. The type is guessed from the file name.
- **New → Upload with details:** PDF, Word, Excel, images, text/CSV or zip, up to 5 MB (drop the file on
  the box or click to choose). Files are stored in the
  database, so they survive redeploys. When you start inside a folder, the document is linked to that
  client, project or type automatically.
- **Each folder and file has a ⋮ menu:**
  - folders: **Open**, **Upload here**;
  - files: **Open**, **Download**, **Details**, **Show in folder**, **Edit** (uploader or admin:
    change the details or replace the file), **Move to archive** / **Restore**, and
    **Delete permanently**.
- **Delete permanently** (Super Admin and Admin, any document): after one confirmation, the document
  is archived and removed for good with its file, unless another document or a signed contract uses
  the same file. Recorded in the Audit Trail.
- **Share with the client:** when a document is linked to a client, tick *Share with the client in the
  customer portal*; the client's portal logins can then see and download it and are notified. Shared
  files show a *Shared with client* label.
- **Expiry / review date** (optional, in the upload and edit form) for licences, certificates,
  policies and offers. Files show *Expires in N days* or *Expired*, and admins get a reminder 30 days
  before.
- **Version history:** replacing a document's file (Edit → drop a new file) keeps the old file as an
  earlier version. **Details** shows the version number and lists earlier versions to download.
  Deleting the document removes its versions too.
- Documents linked to a client also appear in that client's Client 360° profile

### Projects

#### All Projects
**Where:** Projects → All Projects
- Project table with progress bars, status/priority badges
- Stats: total, active, completed, delayed
- Add/Edit form with all project fields; side panel with milestones and contract reference
- **Warranty ends** (optional): the free-support period after delivery. The panel shows *Active*,
  *Ends in N days* or *Ended*; the project manager is reminded 30 days before it ends.
- Projects are also created automatically when a contract becomes Active (see Contracts)
- Filters: status, priority, search

#### Tasks
**Where:** Projects → Tasks
- **All Tasks** view (Admin) + **My Tasks** view (Employee) toggle
- Assign Task form (title, description, employee, priority, deadline, period)
- Approval workflow (see [Task Completion Workflow](#task-completion-workflow)): Mark Complete →
  Approve (performance score rises) or Reject with a reason
- Overdue tasks highlighted in red; filters: status, priority, employee

#### Milestones
**Where:** Projects → Milestones
- Milestones per project with number, deliverables, deadline and days left / overdue
- Complete → approve → **Generate Invoice** for the milestone's share of the contract value

#### Timesheets
**Where:** Projects → Timesheets
- Staff log their own hours per project and task
- Project leads approve or reject entries (never their own)
- **Project profitability:** payments received − staff time cost from approved hours

### Team

#### Employees
**Where:** Team → Employees
- Grid view (cards) and List view (table)
- Performance bar (green ≥80%, yellow ≥50%, red <50%)
- Employment status badges: Active, On Leave, Suspended, Terminated
- Stats: total, active, on leave, average performance
- Add/Edit form with all fields; skills display

#### Departments
**Where:** Team → Departments
- Grid view (cards) and List view (table)
- Department stats: live staff count, active projects, budget, average performance
- Color-coded department badges; view side panel; Add/Edit form with color picker

#### Workload
**Where:** Team → Workload
- Workload per employee: 🟢 Available (0–4 tasks), 🟡 Busy (5–8), 🔴 Overloaded (9+)
- Task breakdown: assigned, in progress, pending approval, overdue
- Grid + list view; assign a task directly; filters: department, workload status

#### My Tasks
**Where:** Team → My Tasks
- Each person's own tasks with deadlines; overdue tasks flagged
- **Mark Complete** sends a task for approval; approved and rejected tasks show the outcome and reason

#### Salary
**Where:** Team → Salary (amounts visible to HR and finance roles only)
- **Grid or list layout** (switch at the right of the filters, remembered): grid shows one card per
  employee with net salary, breakdown, performance and status
- Monthly salary table per employee; month/year selector
- Add Bonus / Add Deduction; **Mark Paid** (books the salary expense in Finance)
- Promotion (new position + salary raise + reason) — Super Admin only
- Performance score bars with colors

#### Attendance & Leave
**Where:** Team → Attendance & Leave
- Daily attendance: Present, Late, Absent or Half day, with check-in and check-out times
- Checking yourself in after 08:30 is marked **Late**; admins can record attendance for anyone
- Leave requests: Annual, Sick, Maternity, Paternity, Emergency, Unpaid
- Approve or reject; the employee is notified and shows as *On Leave* when the leave covers today

#### Expense Claims
**Where:** Team → Expense Claims (every staff role)
- Claim money you spent for the company: what it was for, category (Transport, Equipment, Internet,
  Marketing, Other), amount, date and a receipt (photo or PDF, up to 5 MB).
- **Approvals:** Employee → **Manager** (Admin, Project, Sales, Marketing or Finance Manager) →
  **Finance** (Finance Manager or Admin). Finance approval books the claim as a Finance expense.
- Nobody approves their own claim, and the Finance approval must come from someone other than the
  manager who approved it. Rejecting needs a reason, which the employee sees.
- Each step notifies the next approver and the employee. The table shows the progress
  (Submitted → Manager → Finance); **View** shows the full approval trail and the receipt.
- Employees see their own claims; approvers see everyone's and can filter **Waiting for me**.
  **Export** downloads the list as CSV.

### Settings

#### User Management
**Where:** Settings → User Management
- Create, edit, activate and deactivate users; role badges; search + role filter
- Only a Super Admin can create or change Super Admin accounts

#### Company Profile
**Where:** Settings → Company Profile
- Legal and trading name, registration number, TIN, address, city, country, phone, email, website,
  industry, description
- Used on the PDF quotations and invoices
- **Currencies & exchange rates:** RWF for 1 USD, EUR, GBP, KES, UGX and TZS (same card as
  Finance → Currencies)

#### Roles & Permissions
**Where:** Settings → Roles & Permissions
- Each role's accessible modules (the same rules the sidebar and API use) with live user counts

#### Product Catalog
**Where:** Settings → Product Catalog
- 8 Santech products (EVS, SANTRACK, REVIXSAN, SANBOOK, SANHUB, Website, Mobile App, Training)
- Card grid with active/inactive toggle
- Add/Edit (name, category, description, price, cost, tax, SLA); filters: category, status, search

#### Audit Trail
**Where:** Settings → Audit Trail
- Log of every important action: Created (green), Updated (blue), Deleted (red), Approved (emerald),
  Rejected (red), Payment (teal), Status Change (amber)
- Detail side panel showing Before (old value in red) and After (new value in green)
- Read-only — no user can edit or delete it
- Filters: action type, module, user, date range; rows per page: 5/10/20/50/All

### Notifications
**Where:** Notifications, or the bell on the top bar (live unread count)
- Reminders for overdue and due invoices, contract expiry/signature/approval, task deadlines and
  approvals, lead and deal follow-ups, service renewals, tender deadlines, meetings and communication
  follow-ups, milestones due within 7 days or late, quotations about to expire, documents expiring
  within 30 days, project warranties ending, expense claims waiting for approval, and recurring
  service invoices ready to send
- Filter tabs: All, Unread, Payment, Follow-up, Tasks
- Mark one or all as read

---

## How the System Works — Full Business Flow

```
1. Sales staff goes on field visit
        ↓
2. Records visit in Field Visits page
        ↓
3. Visit becomes a Lead (interested company)
        ↓
4. Lead qualified → converted to Deal Pipeline
        ↓
5. Quotation created and sent to client
   (with line items, VAT calculation)
        ↓
6. Client accepts → Quotation converts to Contract
        ↓
7. Contract signed → Project created
        ↓
8. Admin assigns tasks to team members
        ↓
9. Employees see tasks in "My Tasks"
   → Mark Complete → Admin approves
        ↓
10. Milestone reached → Invoice generated
        ↓
11. Payment recorded → P&L updated
        ↓
12. Project completed → Client review
        ↓
13. Renewal reminder → Client Services renewed
        ↓
14. All actions logged in Audit Trail
```

---

## Role-Based Access

Sidebar access comes from `roleAccess` in `frontend/src/store/authStore.ts` (also shown on
Settings → Roles & Permissions). The API enforces the same rules, so hiding a menu item is never the
only protection.

| Role | Sidebar modules |
|---|---|
| **Super Admin** | Everything, including promotions and CEO approval of quotations |
| **Admin (HR)** | Everything except Super Admin-only actions |
| **Finance Manager** | Dashboard, Finance, Contracts, My Tasks, Expense Claims, Reports, Notifications |
| **Sales Manager** | Dashboard, CRM, Sales, Marketing, My Tasks, Expense Claims, Reports, Notifications |
| **Marketing Manager** | Dashboard, CRM, Marketing, My Tasks, Expense Claims, Reports, Notifications |
| **Project Manager** | Dashboard, Projects, Team, My Tasks, Expense Claims, Reports, Notifications |
| **Sales Staff** | Dashboard, CRM, Sales, My Tasks, Expense Claims, Notifications |
| **Employee** | Dashboard, My Tasks, Expense Claims, Team, Notifications |
| **Customer** | Customer portal only (one client) |
| **Supplier** | Supplier portal only (one supplier) |

Every role has **My Tasks** (Team → My Tasks), which shows only the person's own tasks, and
**Expense Claims** (Team → Expense Claims) to claim money spent for the company.
Documents, Procurement, Support, Reception, Communication, Training and Settings are shown to
Super Admin and Admin only, and only they can delete documents permanently. Salary figures are only
returned by the API to HR and finance roles.

Customer and supplier logins are portal logins: the API refuses them everything except their portal,
their own account, their notifications and the files shared with them. They are created from the
client's 360° page and Procurement → Suppliers, not from Settings → Users.

---

## Task Completion Workflow

```
Admin creates task → assigns to Employee
        ↓
Employee sees it in Team → My Tasks
Status: ASSIGNED
        ↓
Employee works → clicks "Mark Complete"
Status: PENDING APPROVAL
        ↓
Admin sees in Projects → Tasks (All Tasks tab)
        ↓
APPROVE ✅                    REJECT ❌
Status: APPROVED              Status: REJECTED
Performance score ++          Rejection reason shown
                              Employee must redo
```

---

## Performance Score System

| Score | Color | Meaning |
|---|---|---|
| 80–100% | 🟢 Green | Excellent — eligible for promotion |
| 50–79% | 🟡 Yellow | Good — room to improve |
| 0–49% | 🔴 Red | Needs attention |

- Each approved task increases performance score
- Super Admin can give promotion based on score (Salary page → Promote button)

---

## Deployment

| Service | URL | Platform |
|---|---|---|
| Frontend | https://santech-bms.vercel.app | Vercel |
| Backend API | https://santech-bms-api.onrender.com | Render |
| Database | Neon PostgreSQL | Neon.tech |

Pushing to `main` deploys both: Vercel rebuilds the frontend, and Render rebuilds the API and applies
new database migrations.

### Environment Variables (Backend — Render)

```
NODE_ENV=production
DATABASE_URL=postgresql://...@neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://...@neon.tech/neondb?sslmode=require
JWT_SECRET=<strong random string>
JWT_EXPIRES_IN=7d
CLIENT_URL=https://santech-bms.vercel.app
PORT=5000
```

Uploaded files are kept in the database, so no extra storage service or variable is needed.

### Seeding the database

Migrations run automatically on every Render deploy. **The demo data seed does not** (the Render
service's build command does not include `prisma db seed`). After a deploy that adds new demo data, run:

```powershell
cd backend
pnpm db:seed      # uses DATABASE_URL from backend/.env (Neon)
```

The seed only adds missing rows, and reuses records that already exist under the same name, so it is
safe to run any number of times and never creates copies.

### Backups and data fixes

- Database backups made with `pg_dump` are kept in `backups/`, which git ignores, so they are never
  committed.
- `backend/prisma/maintenance/` holds one-off data fixes. `remove-duplicates-2026-10.js` removes the
  duplicate demo records left by old seed versions (see CHANGELOG). Run it from `backend` without
  options to see the plan, then with `--apply` to apply it.

### Environment Variables (Frontend — Vercel)

```
VITE_API_URL=https://santech-bms-api.onrender.com/api
```

---

## Local Development Setup

See **[SETUP.md](SETUP.md)** for full local setup instructions.

**Quick start:**
```powershell
# Backend
cd backend
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev        # → http://localhost:5000

# Frontend
cd frontend
pnpm install
pnpm dev        # → http://localhost:3000
```

---

## Database Schema

PostgreSQL on Neon, managed with Prisma (see `backend/prisma/schema.prisma`; 10 migrations).

| Area | Models |
|---|---|
| Users & HR | User, Employee, SalaryRecord, Department, Attendance, LeaveRequest |
| CRM | Client, ClientMember, FieldVisit, Lead, Communication, Meeting, Visitor |
| Sales & marketing | Opportunity, OpportunityProduct, Quotation, Tender, Campaign, Product |
| Contracts & services | Contract, ClientSubscription |
| Finance | Invoice, Payment, IncomeEntry, ExpenseEntry, PurchaseRequest |
| Projects | Project, Milestone, Task, Timesheet |
| Documents & files | Document (linked to a client, project and folder), DocumentFolder (admin-made folders and subfolders), StoredFile (the uploaded file itself) |
| Support & knowledge | SupportTicket, KnowledgeArticle, TrainingSession, TrainingAttendee |
| System | Notification, AuditLog, Setting |

---

## Development Progress

### ✅ Completed

- [x] Monorepo (frontend + backend), JWT auth, role-based sidebar **and** role checks on every API route
- [x] PostgreSQL schema on Neon with migrations applied automatically on deploy
- [x] **Every page reads and saves through the API** — no page uses hardcoded mock data any more
- [x] Demo data for every module seeded into the database (idempotent: safe to re-run, never overwrites edits)
- [x] Finance linked end-to-end: invoices, payments, payroll, purchases, services and training feed the P&L
- [x] Approval workflows: quotations (Sales → Manager → CEO), contracts, milestones, tasks, timesheets, leave, purchases
- [x] Notification engine with a live unread count on the top bar
- [x] Reports (sales, finance, team, clients) calculated from live data
- [x] Audit trail of all important actions
- [x] Project profitability (payments received − staff time cost from approved timesheets)
- [x] File storage for documents and signed contracts (in the database, 5 MB per file)
- [x] PDF quotations and invoices (branded A4, Save as PDF)
- [x] Financial statements: balance sheet, cash flow, accounts payable and receivable
- [x] Document library like Google Drive: automatic folders, admin-made folders and subfolders, grid/list views, search, archive, admin delete
- [x] Clear login errors; only failed logins count toward the login limit

### 📋 Possible next steps

- [ ] Email / SMS / WhatsApp delivery of notifications (in-app only today). Render's free plan blocks
      email (SMTP) ports, so email needs an HTTP email service such as Brevo; SMS and WhatsApp via Twilio.
- [ ] Customer portal (client self-service login)
- [ ] Supplier portal
- [ ] Multi-currency

---

## Excel Data Migration

The previous system used Excel sheets with 4 tabs. All data structure is preserved:

| Excel Sheet | System Category | Examples |
|---|---|---|
| Self Employed | SELF_EMPLOYED | Pharmacies, shops, hotels |
| Institutions | INSTITUTION | Banks, hospitals, government |
| Industries | INDUSTRY | Manufacturing companies |
| Distributors | DISTRIBUTOR | Supply chain companies |

All Excel columns are mapped to database fields and displayed in the Field Visits page.

---

## Documentation

| File | What it covers |
|---|---|
| [README.md](README.md) | What the system does today (this file) |
| [CHANGELOG.md](CHANGELOG.md) | Every change, newest first: what changed, where to find it, what changed underneath |
| [SETUP.md](SETUP.md) | Running the project on your own computer |

**For every change:** add an entry at the top of CHANGELOG.md in the same commit, and update this
README when what the system does has changed.

---

*SAN-BMS — Built for Santech Innovate, Kigali Rwanda 🇷🇼*
*README last updated: 29 October 2026 (version 1.2.0)*
