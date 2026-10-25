# SAN-BMS — Santech Business Management System

> **Version:** 1.0.0 | **Status:** Frontend Complete, Backend Integration In Progress
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

| Role | Email | Password | Access |
|---|---|---|---|
| Super Admin | `admin@santech.rw` | `Admin@2026` | Full system |
| Admin (HR) | `hr@santech.rw` | `Hr@2026` | All except promotions |
| Sales Staff | `sales@santech.rw` | `Sales@2026` | CRM, Sales, My Tasks |
| Finance Manager | `finance@santech.rw` | `Finance@2026` | Finance, Contracts, Reports |
| Employee | `employee@santech.rw` | `Employee@2026` | My Tasks only |

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
santech_crm/
├── frontend/                         ← React + TypeScript + Tailwind
│   ├── public/
│   │   └── imingogo-trimmed.png      ← Rwandan Imigongo pattern (background)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── MainLayout.tsx    ← App shell (sidebar + topbar + content)
│   │   │   │   ├── Sidebar.tsx       ← Collapsible, role-based navigation
│   │   │   │   ├── Topbar.tsx        ← Search, notifications, user profile
│   │   │   │   └── AuthLayout.tsx    ← Login page wrapper
│   │   │   └── shared/
│   │   │       └── PhoneInput.tsx    ← Phone input with country code selector
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   └── LoginPage.tsx     ← Split-panel professional login page
│   │   │   ├── dashboard/
│   │   │   │   └── DashboardPage.tsx ← Executive KPIs + charts
│   │   │   ├── crm/
│   │   │   │   ├── CustomersPage.tsx ← Enhanced client registration (4 types)
│   │   │   │   ├── ClientProfilePage.tsx ← Client 360° profile + timeline
│   │   │   │   ├── LeadsPage.tsx     ← Lead management + pipeline conversion
│   │   │   │   └── FieldVisitsPage.tsx ← Field visit recording (Excel migration)
│   │   │   ├── sales/
│   │   │   │   ├── PipelinePage.tsx  ← Kanban + list view deal pipeline
│   │   │   │   └── QuotationsPage.tsx ← Quotations with line items + VAT
│   │   │   ├── marketing/
│   │   │   │   └── CampaignsPage.tsx ← Campaign tracking + ROI
│   │   │   ├── contracts/
│   │   │   │   ├── ContractsPage.tsx ← Contract lifecycle management
│   │   │   │   └── ClientServicesPage.tsx ← Hosting/maintenance renewals
│   │   │   ├── finance/
│   │   │   │   ├── FinancePage.tsx   ← P&L + Income + Expenses (3 tabs)
│   │   │   │   └── InvoicesPage.tsx  ← Invoice + payment tracking
│   │   │   ├── projects/
│   │   │   │   ├── ProjectsPage.tsx  ← Project management
│   │   │   │   └── TasksPage.tsx     ← Task assignment + approval workflow
│   │   │   ├── team/
│   │   │   │   ├── EmployeesPage.tsx ← Employee profiles (grid + list view)
│   │   │   │   ├── DepartmentsPage.tsx ← Department management
│   │   │   │   ├── WorkloadPage.tsx  ← Staff workload overview
│   │   │   │   ├── MyTasksPage.tsx   ← Employee personal task dashboard
│   │   │   │   └── SalaryPage.tsx    ← Salary + bonuses + promotions
│   │   │   ├── reports/
│   │   │   │   └── ReportsPage.tsx   ← Sales, Finance, Team, Client reports
│   │   │   ├── notifications/
│   │   │   │   └── NotificationsPage.tsx ← System alerts + reminders
│   │   │   ├── support/
│   │   │   │   └── SupportPage.tsx   ← Support ticket management
│   │   │   └── settings/
│   │   │       ├── SettingsPage.tsx  ← User management + roles
│   │   │       ├── ProductCatalogPage.tsx ← Santech services catalog
│   │   │       └── AuditTrailPage.tsx ← Full system action log
│   │   ├── store/
│   │   │   └── authStore.ts          ← Zustand auth + role-based access
│   │   ├── lib/
│   │   │   ├── api.ts                ← Axios client (auto JWT + 401 redirect)
│   │   │   └── utils.ts              ← Currency, date, status, initials helpers
│   │   ├── types/
│   │   │   └── index.ts              ← TypeScript types for all entities
│   │   └── App.tsx                   ← Router + protected routes
│   ├── vercel.json                   ← Vercel deployment config
│   └── package.json
│
├── backend/                          ← Node.js + Express + Prisma
│   ├── src/
│   │   ├── routes/                   ← API route definitions
│   │   │   ├── auth.ts
│   │   │   ├── clients.ts
│   │   │   ├── fieldVisits.ts
│   │   │   ├── employees.ts
│   │   │   ├── tasks.ts
│   │   │   ├── projects.ts
│   │   │   ├── finance.ts
│   │   │   └── dashboard.ts
│   │   ├── controllers/              ← Business logic
│   │   │   ├── authController.ts
│   │   │   ├── clientsController.ts
│   │   │   └── fieldVisitsController.ts
│   │   └── middleware/
│   │       └── auth.ts               ← JWT verify + role authorization
│   ├── prisma/
│   │   ├── schema.prisma             ← Full database schema (all modules)
│   │   └── seed.ts                   ← Default users + sample data
│   ├── render.yaml                   ← Render deployment config
│   └── package.json
│
├── README.md                         ← This file
└── SETUP.md                          ← Local development setup guide
```

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

| Role | What They See |
|---|---|
| **Super Admin** | Everything — full sidebar, all modules, promotions |
| **Admin (HR)** | Everything except Super Admin-only actions (promotions) |
| **Finance Manager** | Dashboard, Finance, Contracts, Reports, Notifications |
| **Sales Staff** | Dashboard, CRM, Sales, My Tasks, Notifications |
| **Employee** | Dashboard, My Tasks, Notifications only |

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

The Prisma schema covers all modules:

| Model | Description |
|---|---|
| User | System users with roles |
| Employee | Staff profiles linked to users |
| SalaryRecord | Monthly salary slips |
| Client | All client types and categories |
| FieldVisit | Field visit records (from Excel) |
| Product | Santech service catalog |
| Opportunity | Sales pipeline deals |
| Contract | Contract lifecycle |
| Invoice | Invoices and billing |
| Payment | Payment records |
| Project | Project management |
| Milestone | Project milestones |
| Task | Task assignments |
| AuditLog | System action log |

---

## Development Progress

### ✅ Completed

#### Foundation
- [x] Monorepo structure (frontend + backend)
- [x] React + TypeScript + Vite + Tailwind CSS frontend
- [x] Node.js + Express + Prisma backend
- [x] PostgreSQL schema (Neon)
- [x] JWT authentication + role-based access
- [x] Zustand state management
- [x] Imigongo pattern background (Rwandan cultural design)
- [x] Professional split-panel login page with quick demo login
- [x] Role-based sidebar (each role sees permitted modules only)
- [x] GitHub repository + CI/CD via Vercel + Render

#### Frontend Pages (All Built)
- [x] Executive Dashboard (KPIs + 4 charts)
- [x] Field Visits (14 columns, Excel migration, filters, modal)
- [x] Leads Management (journey flow, convert to deal)
- [x] Customer Management (4 types: Individual/Business/Team/Delegation)
- [x] Client 360° Profile (timeline, financials, services, documents)
- [x] Deal Pipeline (Kanban + list, drag & drop)
- [x] Quotations (line items, VAT, workflow)
- [x] Contracts (lifecycle, alerts)
- [x] Client Services & Renewals (hosting, domains, renewal alerts)
- [x] Invoices & Payments (tracking, record payment)
- [x] Finance P&L (3 tabs: Overview, Income, Expenses)
- [x] Projects (progress bars, status badges)
- [x] Tasks (assign, approve, reject workflow)
- [x] My Tasks (employee personal dashboard)
- [x] Employees (grid + list view, performance bars)
- [x] Departments (grid + list view, budget tracking)
- [x] Workload View (available/busy/overloaded)
- [x] Salary Management (bonuses, promotions)
- [x] Marketing Campaigns (ROI tracking)
- [x] Reports (4 tabs: Sales/Finance/Team/Clients)
- [x] Notifications (type-colored alerts)
- [x] Support Tickets (full lifecycle)
- [x] User Management (CRUD, roles)
- [x] Product Catalog (Santech services)
- [x] Audit Trail (read-only action log)
- [x] PhoneInput component (country code selector, 50+ countries)

#### Backend (Built, Integration Pending)
- [x] Express server with helmet, CORS, rate limiting
- [x] Auth routes (login, getMe, change password)
- [x] Clients routes (CRUD, pagination, search)
- [x] Field Visits routes (role-based filtering)
- [x] All other routes scaffolded
- [x] Deployed on Render
- [x] Database on Neon (PostgreSQL)

### 🔄 In Progress
- [ ] Connect frontend to real backend API (replace mock data)
- [ ] Run database migrations on Neon
- [ ] Seed production database

### 📋 Remaining Features
- [ ] Milestone management page
- [ ] Time & effort tracking (timesheets)
- [ ] Document management center
- [ ] Communication log (calls, emails, WhatsApp)
- [ ] Meeting & appointment management
- [ ] Customer portal (client self-service login)
- [ ] Management approval workflows
- [ ] PDF generation for quotations/invoices
- [ ] Email/WhatsApp notifications

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
*README last updated: October 2026*
