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
│       ├── seed.ts                   ← demo data entry point
│       └── seeds/                    ← demo data per area (+ data/*.json)
│
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

### Login & Access Control
**Where:** `/login`
- Professional split-panel login page (Imigongo pattern) with quick demo login buttons
- JWT login; 8 staff roles, each with its own sidebar (see [Role-Based Access](#role-based-access))
- The API checks the role on every route, so hiding a menu item is never the only protection
- Clear messages when login fails: wrong email or password, too many failed attempts, or the server
  still waking up (Render free plan)

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
- The form's *Attach Document* field keeps only the file name. To store a client's files, upload them
  in **Documents** and link them to the client.

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
- Approval chain: Salesperson → Sales Manager → CEO; each step notifies the next approver, who can
  send it back with a reason
- After approval: Sent → Viewed → Negotiation → Accepted, or Rejected by the client; quotations past
  their *valid until* date expire automatically
- **Convert** an accepted quotation into a draft contract with the same value and line items
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
- **Mark Paid** books the payment as income in Finance; **Renew** moves the renewal date one billing
  cycle forward; unpaid services past renewal become overdue
- Tax tracking (with/without VAT) and profit (amount charged − actual cost)

### Finance

#### Overview & P&L
**Where:** Finance → Overview & P&L — 4 tabs:
- **Overview:** P&L (Revenue − Expenses = Profit), KPI cards, 6-month chart
- **Income:** income by category (EVS, SANTRACK, Website, Training, …) with Add Income
- **Expenses:** expenses by category (Salaries, Rent, Internet, Equipment, …) with Add Expense
- **Statements:** see the next section

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
**Where:** Finance → Invoices & Payments
- Invoice table with status badges (Draft/Sent/Due/Partial/Paid/Overdue)
- **Record Payment** (amount, date, method, reference); overpayment is refused
- Each payment is booked as income in Finance and the status updates automatically
- **PDF:** open an invoice → **PDF** → *Save as PDF*
- Stats: total invoiced, total collected, outstanding, overdue count

### Procurement
**Where:** Procurement → Purchases & Stock
- Purchase requests: item, category, quantity, unit price, supplier, notes
- Pending → Approved → Ordered → Delivered (or Cancelled); nobody approves their own request
- **Delivered** books the expense in Finance; approved and ordered purchases show in Accounts Payable

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
- Stats: total, open, in progress, resolved today

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
**Where:** Documents → All Documents (Super Admin and Admin)
- **Upload Document:** PDF, Word, Excel, images, text/CSV or zip, up to 5 MB. Files are stored in
  the database, so they survive redeploys.
- Each document has a **category** (Contract, Invoice, Proposal, Report, Policy, Other), an optional
  **client** and **project** (no client = company document) and a description
- **Search** by name, description, client or project; **filter** by category, client, project,
  status (Active / Archived / All) and date range
- **Download** from the table, or **Open file** from the document view
- **Edit Document** (uploader or admin): change the details or replace the file
- **Archive** hides a document without deleting it; **Restore** brings it back
- **Delete** (admins only, archived documents only) removes the document and its file for good,
  unless another document or a signed contract uses the same file. Recorded in the Audit Trail.
- Documents linked to a client also appear in that client's Client 360° profile

### Projects

#### All Projects
**Where:** Projects → All Projects
- Project table with progress bars, status/priority badges
- Stats: total, active, completed, delayed
- Add/Edit form with all project fields; side panel with milestones and contract reference
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
  follow-ups
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
| **Super Admin** | Everything, including promotions, CEO approval of quotations and permanent document deletion |
| **Admin (HR)** | Everything except Super Admin-only actions |
| **Finance Manager** | Dashboard, Finance, Contracts, My Tasks, Reports, Notifications |
| **Sales Manager** | Dashboard, CRM, Sales, Marketing, My Tasks, Reports, Notifications |
| **Marketing Manager** | Dashboard, CRM, Marketing, My Tasks, Reports, Notifications |
| **Project Manager** | Dashboard, Projects, Team, My Tasks, Reports, Notifications |
| **Sales Staff** | Dashboard, CRM, Sales, My Tasks, Notifications |
| **Employee** | Dashboard, My Tasks, Team, Notifications |

Every role has **My Tasks** (Team → My Tasks), which shows only the person's own tasks.
Documents, Procurement, Support, Reception, Communication, Training and Settings are shown to
Super Admin and Admin only. Salary figures are only returned by the API to HR and finance roles.

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

The seed only adds missing rows, so it is safe to run any number of times.

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

PostgreSQL on Neon, managed with Prisma (see `backend/prisma/schema.prisma`; 9 migrations).

| Area | Models |
|---|---|
| Users & HR | User, Employee, SalaryRecord, Department, Attendance, LeaveRequest |
| CRM | Client, ClientMember, FieldVisit, Lead, Communication, Meeting, Visitor |
| Sales & marketing | Opportunity, OpportunityProduct, Quotation, Tender, Campaign, Product |
| Contracts & services | Contract, ClientSubscription |
| Finance | Invoice, Payment, IncomeEntry, ExpenseEntry, PurchaseRequest |
| Projects | Project, Milestone, Task, Timesheet |
| Documents & files | Document (linked to a client and project), StoredFile (the uploaded file itself) |
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
- [x] Document library: client/project links, search and filters, edit, archive, admin delete
- [x] Clear login errors; only failed logins count toward the login limit

### 📋 Possible next steps

- [ ] Email / SMS / WhatsApp delivery of notifications (in-app only today). Render's free plan blocks
      email (SMTP) ports, so email needs an HTTP email service such as Brevo; SMS and WhatsApp via Twilio.
- [ ] Customer portal (client self-service login)
- [ ] Supplier portal
- [ ] Multi-currency
- [ ] Folder view for documents (automatic folders by client → project, or Drive-style folders)
- [ ] Save the file from the customer form's *Attach Document* field (today only its name is kept)

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
