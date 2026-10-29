# SAN-BMS — Santech Business Management System

> **Version:** 1.1.0 | **Status:** All pages connected to the live API and PostgreSQL (Neon) database
> **Live Frontend:** https://santech-bms.vercel.app
> **Live Backend API:** https://santech-bms-api.onrender.com

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
│       ├── lib/services/             ← one small client per API area
│       │   ├── lookupService.ts      ← shared dropdown data (clients, staff, contracts, projects)
│       │   └── operationsService.ts  ← leads, quotations, tickets, HR, reception, …
│       └── store/authStore.ts        ← login state + role → module access rules
│
├── backend/                          ← Node.js + Express + Prisma
│   ├── src/
│   │   ├── routes/                   ← auth, clients, finance, projects, tasks, salary, reports, …
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
├── README.md
└── SETUP.md
```

### How the modules feed each other

| Action | What happens automatically |
|---|---|
| Lead → **Convert to Deal** | Client registered (if new) + qualified deal added to the pipeline |
| Quotation → approvals | Salesperson → Manager → CEO, each step notifies the next approver |
| Accepted quotation → **Convert** | Draft contract created with the same value and line items |
| Contract **Active** | Requires all signatories signed + signed document attached |
| Milestone approved → **Generate Invoice** | Invoice created for the milestone's share of the contract |
| Invoice **payment recorded** | Income entry in Finance (P&L, dashboard, reports update) |
| Salary **Mark Paid** | Salaries expense in Finance |
| Client service **Mark Paid** | Maintenance income in Finance |
| Purchase **Delivered** | Expense in Finance |
| Training fee **paid** | Training income in Finance |
| Task / timesheet / leave **approved** | Employee notified; task approval raises performance score |
| Visitor **checked in** | Host notified |
| Every important action | Written to the Audit Trail (who, what, before/after, IP, device) |

---

## System Modules — Built

### 1. Authentication & Access Control
- Login page with professional split-panel design (Imigongo pattern background)
- JWT-based authentication
- 5 roles: Super Admin, Admin, Finance Manager, Sales Staff, Employee
- Role-based sidebar — each role sees only their permitted modules
- Quick demo login buttons on login page

### 2. Executive Dashboard
- 8 KPI cards: total customers, active, new this month, leads, conversion rate, active/completed/delayed projects, pending invoices, overdue payments
- Revenue vs Expenses area chart (6 months)
- Service revenue pie chart (EVS, SANTRACK, Websites, etc.)
- Sales pipeline bar chart
- Recent field visits list
- P&L summary card (Revenue, Expenses, Net Income)

### 3. CRM — Field Visits
- Direct migration from Excel data (all 14 columns preserved)
- Record new visits with full modal form
- Filters: category, outcome, product, date range, contract won
- Rows per page: 5/10/20/All with pagination
- Categories: Self Employed, Institution, Industry, Distributor

### 4. CRM — Leads Management
- Lead journey: New → Contacted → Qualified → Converted → Lost
- Advance status button (one click to move forward)
- Convert to Deal button (Qualified leads only)
- Detail side panel
- Filters: status, category, product, search

### 5. CRM — Customer Management (Enhanced)
**4 client types with different required fields:**

| Type | Key Required Fields |
|---|---|
| Individual | Name, Phone, Email, Location (ID optional) |
| Business | Company Name, TIN Number, Location, Representative (name/phone/email) |
| Team | Team Name, Organization, Leader info, Members list (min 1) |
| Delegation | Delegation Name, Origin/Country, Representative with location/country, Members (min 2) |

- Multi-step registration form (4 steps: Type → Info → Services → Review)
- Services selection with descriptions (13 services + Other)
- File upload option
- View side panel with all details
- PRIMARY CONTACT badge for delegation representative

### 6. CRM — Client 360° Profile
- Full client history timeline with colored icons
- Financial summary (invoiced, paid, outstanding, profit margin)
- Services used with status (Active/Expired/Pending)
- Contracts and documents list
- Add Interaction modal (Call, Meeting, Email, Note, Status Change)
- Works for prospects too — history preserved even if deal was lost
- Navigate from Customers page → View Profile button

### 7. Sales — Deal Pipeline
- Kanban board (drag & drop between stages) + List view toggle
- 8 stages: New Lead → Contacted → Qualified → Requirements → Proposal → Negotiation → Won/Lost
- Probability bars per deal
- KPI cards: active deals, total value, weighted value, won value
- Deal detail side panel with next action
- Move forward/back buttons on each card

### 8. Sales — Quotations
- Multi-line item quotation builder
- Auto-calculate subtotal, VAT, total
- Quotation workflow: Draft → Sent → Viewed → Accepted → Converted
- Convert to Contract button (Accepted quotations)
- Detail side panel with full line items table
- 4-step workflow advance buttons

### 9. Contracts — Contract Management
- Full lifecycle: Draft → Review → Approval → Signing → Active → Completed
- Advance status button on each row
- Contract lifecycle bar at top
- Stats: Total, Active, Pending Signature, Active Value
- View side panel with all details

### 10. Contracts — Client Services & Renewals
- Track hosting, domains, maintenance contracts
- Hosting providers: Spaceship, AOS Rwanda, Namecheap, Santech Server, Cloudflare
- Service types: Hosting Only, Maintenance Only, Hosting + Maintenance, Domain Only, Domain + Hosting
- **Renewal alert banners** — appear automatically when services expire or are expiring soon:
  - 🔴 Expired — immediate action required
  - 🟠 Expiring in 15 days — critical
  - 🟡 Expiring in 30 days — warning
- Tax tracking (with/without VAT)
- Profit calculation (amount charged − actual cost)
- Renew +1 year button
- Mark Paid button
- Detail panel shows notification schedule (30d/15d/7d triggers)

### 11. Finance — Invoices & Payments
- Invoice table with status badges (Draft/Sent/Due/Partial/Paid/Overdue)
- Record Payment modal (amount, date, method, reference)
- Automatic status update when payment recorded
- Outstanding balance tracking
- Stats: Total Invoiced, Total Collected, Outstanding, Overdue count

### 12. Finance — P&L / Income / Expenses
**3 tabs:**
- **Overview tab:** P&L table (Revenue − Expenses = Profit), KPI cards, CSS bar chart (6 months)
- **Income tab:** Log income by category (EVS, SANTRACK, Website, Training, etc.), Add Income modal
- **Expenses tab:** Log expenses by category (Salaries, Rent, Internet, etc.), Add Expense modal

### 13. Projects
- Project table with progress bars, status/priority badges
- Stats: Total, Active, Completed, Delayed
- Add/Edit modal with all project fields
- View side panel with milestones and contract reference
- Filters: status, priority, search

### 14. Tasks
- **All Tasks** view (Admin) + **My Tasks** view (Employee) toggle
- Assign Task modal (title, description, employee, priority, deadline, period)
- Task approval workflow:
  - Employee clicks "Mark Complete" → Status: Pending Approval
  - Admin clicks "Approve" → Status: Approved (performance score increases)
  - Admin clicks "Reject" → Must type reason → Status: Rejected (employee sees reason)
- Overdue tasks highlighted in red
- Filters: status, priority, employee

### 15. Team — Employees
- Grid view (cards) and List view (table) — toggle like Google Drive
- Performance bar (green ≥80%, yellow ≥50%, red <50%)
- Employment status badges: Active, On Leave, Suspended, Terminated
- Stats: Total, Active, On Leave, Avg Performance
- Add/Edit modal with all fields
- Skills display

### 16. Team — Departments
- Grid view (cards) and List view (table) — toggle
- Department stats: employees count, active projects, budget, avg performance
- Color-coded department badges
- View side panel with full details
- Add/Edit modal with color picker

### 17. Team — Workload View
- Visual workload per employee:
  - 🟢 Available (0–4 tasks)
  - 🟡 Busy (5–8 tasks)
  - 🔴 Overloaded (9+ tasks)
- Task breakdown: Assigned, In Progress, Pending Approval, Overdue counts
- Grid + List view toggle
- Assign Task directly from workload view
- Filters: department, workload status

### 18. Team — Salary Management
- Monthly salary table per employee
- Add Bonus / Add Deduction modal
- Mark as Paid button
- Promotion modal (new position + salary raise + reason) — Super Admin only
- Month/Year selector to view different periods
- Performance score bars with colors

### 19. Marketing — Campaigns
- Campaign cards with ROI calculation
  - 🟢 Positive ROI (e.g. TechForward Expo: 740%)
  - 🔴 Negative ROI (campaigns with no revenue yet)
- Grid + List view toggle
- Stats: Total, Active, Total Leads, Best ROI
- New Campaign modal (name, type, budget, dates, channels, team)
- Detail side panel with full metrics
- Campaign types: Expo/Event, Field Visits, Social Media, Email, Referral, Cold Outreach

### 20. Reports
**4 tabs:**
- **Sales:** Salesperson performance, leads, conversions, win rate
- **Finance:** Revenue, expenses, profit, top clients by revenue
- **Team:** Employee performance, tasks completed, completion rates
- **Clients:** Breakdown by category, contractors vs prospects

### 21. Notifications
- 10 notification types with colored icons
- Types: Payment Overdue, Follow-Up Due, Contract Expiry, Task Deadline, System
- Filter tabs: All, Unread, Payment, Follow-up, Tasks
- Mark all as read / click to mark individual
- Unread count badge

### 22. Support Tickets
- Ticket lifecycle: New → Assigned → In Progress → Waiting Customer → Resolved → Closed
- Priority badges: Low, Medium, High, Urgent
- New Ticket modal (client, subject, description, product, priority, assignee)
- View/Resolve side panel with Mark Resolved + Close Ticket actions
- Stats: Total, Open, In Progress, Resolved Today

### 23. Settings — User Management
- Full CRUD for system users
- Role badges (Super Admin=purple, Admin=blue, Sales=green, Employee=gray)
- Activate/Deactivate toggle
- Add/Edit modal with password fields
- Search + role filter

### 24. Settings — Product Catalog
- 8 Santech products (EVS, SANTRACK, REVIXSAN, SANBOOK, SANHUB, Website, Mobile App, Training)
- Card grid with active/inactive toggle
- Add/Edit modal (name, category, description, price, cost, tax, SLA)
- Filters: category, status, search

### 25. Audit Trail
- Complete log of every system action
- Action types with colors: Created (green), Updated (blue), Deleted (red), Approved (emerald), Rejected (red), Payment (teal), Status Change (amber)
- Detail side panel showing Before (old value in red) and After (new value in green)
- Read-only — cannot be edited or deleted by any user
- Filters: action type, module, user, date range
- Rows per page: 5/10/20/50/All

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
Settings → Roles). The API enforces the same rules, so hiding a menu item is never the only protection.

| Role | Sidebar modules |
|---|---|
| **Super Admin** | Everything, including promotions and CEO approval of quotations |
| **Admin (HR)** | Everything except Super Admin-only actions |
| **Finance Manager** | Dashboard, Finance, Contracts, Reports, Notifications |
| **Sales Manager** | Dashboard, CRM, Sales, Marketing, Reports, Notifications |
| **Marketing Manager** | Dashboard, CRM, Marketing, Reports, Notifications |
| **Project Manager** | Dashboard, Projects, Team, My Tasks, Reports, Notifications |
| **Sales Staff** | Dashboard, CRM, Sales, My Tasks, Notifications |
| **Employee** | Dashboard, My Tasks, Team, Notifications |

Salary figures are only returned by the API to HR and finance roles.

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

See **SETUP.md** for full local setup instructions.

**Quick start:**
```powershell
# Frontend
cd frontend
pnpm install
pnpm dev        # → http://localhost:3000

# Backend
cd backend
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev        # → http://localhost:5000
```

---

## Database Schema

PostgreSQL on Neon, managed with Prisma (see `backend/prisma/schema.prisma`).

| Area | Models |
|---|---|
| Users & HR | User, Employee, SalaryRecord, Department, Attendance, LeaveRequest |
| CRM | Client, ClientMember, FieldVisit, Lead, Communication, Meeting, Visitor |
| Sales & marketing | Opportunity, Quotation, Tender, Campaign, Product |
| Contracts & services | Contract, ClientSubscription |
| Finance | Invoice, Payment, IncomeEntry, ExpenseEntry, PurchaseRequest |
| Projects | Project, Milestone, Task, Timesheet |
| Support & knowledge | SupportTicket, KnowledgeArticle, Document, TrainingSession, TrainingAttendee |
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

### 📋 Possible next steps

- [ ] File storage for documents and signed contracts (only file names are stored today)
- [ ] PDF generation for quotations and invoices
- [ ] Email / SMS / WhatsApp delivery of notifications (in-app only today)
- [ ] Customer portal (client self-service login)
- [ ] Supplier portal, accounts payable, balance sheet / cash-flow statements
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

All 13 Excel columns are mapped to database fields and displayed in the Field Visits page.

---

*SAN-BMS — Built for Santech Innovate, Kigali Rwanda 🇷🇼*
*README last updated: 29 October 2026*
