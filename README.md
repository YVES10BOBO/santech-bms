# SAN TECH Business Management System (SAN-BMS)

## About Santech Innovate
Santech Innovate is an IT services startup in Rwanda that builds and manages technology systems
for client companies. Their product portfolio includes:
- **E-Visitors System (EVS)** — digital gate pass, attendance, and visitor management
- **SANTRACK** — stock and inventory tracking system
- **REVIXSAN** — business management solution
- **SANBOOK** — financial/accounting solution
- **SANHUB** — training and learning hub
- **Custom Software** — websites, mobile apps, CRM, ERP systems

---

## Project Goal
Replace the manual Excel-based field visit and client tracking system with a modern, secure,
web-based Business Management System (SAN-BMS) that manages the full business lifecycle:

**Lead → Sale → Contract → Project → Invoice → Payment → Support → Renewal**

This system will serve as Santech's internal ERP + CRM platform.

---

## Excel Data Migration Background
The sales team previously recorded field visits in an Excel workbook with 4 sheets:

### Sheet 1: Self Employed
Small and medium businesses visited in the field.
| Column | Description |
|---|---|
| NO | Record number |
| COMPANY VISITED | Client/prospect company name |
| NEEDS & OBSERVATION | What the sales rep observed at the client |
| WHAT SANTECH CAN SELL | Product recommended (EVS, SANTRACK, REVIXSAN, Website, etc.) |
| CONTACTS | Phone numbers, emails, contact person name |
| FOLLOW-UP DATE | When to call the client back |
| FINAL DECISION | Won / Lost / Pending |
| COMMENTS | Extra notes and observations |
| ASSIGNED TO WHO? | Which sales person owns this lead |
| VISIT DATE | Date the field visit happened |
| CLIENT LOCATION / ADDRESS | Physical location of client |
| AMOUNT PROMISING | Estimated deal value (RWF) |
| WINNED CONTRACT | Confirmed signed contract |

### Sheet 2: Institutions
Banks, hospitals, police, government, schools.
Same columns as Self Employed sheet.
Examples recorded: Nyarugenge Hospital, Equity Bank, Ecobank, Bank of Kigali, BPR, IM Bank, Muhima Traffic Police.

### Sheet 3: Industries
Manufacturing and production companies.
Same columns as Self Employed sheet.
Examples: N&T Plastic Industries, Kabila Industry Coffee, Kabuye Sugar Works, GAMICO LTD.

### Sheet 4: Distributors
Distribution and supply companies.
Same columns as Self Employed sheet.
Examples: KEMO & SONS LTD, KT KAMURU TRADING LTD, Prodi Import & Distributor.

---

## System Modules (28 Modules)

### 1. Executive Dashboard
- KPIs: total customers, active customers, new customers, leads, conversion rate
- Active/completed/delayed projects
- Pending invoices, overdue payments, revenue, expenses, net income
- Charts: Revenue vs expenses, sales pipeline, customer acquisition, project progress, P&L

### 2. Customer Relationship Management (CRM)
- Full customer profiles with 360° view
- Customer categories: Contractor (signed), Prospect/Acquisition (marketing lead)
- Client segments: Self Employed, Institution, Industry, Distributor
- Full interaction history: calls, meetings, emails, WhatsApp, proposals, contracts

### 3. Lead & Sales Management
- Lead capture from: website, field visits, events, referrals, tenders
- Sales pipeline: New Lead → Contacted → Qualified → Requirement Analysis → Proposal → Negotiation → Won/Lost
- Sales forecasting and salesperson performance

### 4. Marketing Management
- Campaign management (EVS campaign, SanHub training, IoT, AI, etc.)
- Marketing channels: Facebook, LinkedIn, Instagram, WhatsApp, Website, Events
- Marketing automation: follow-ups, reminders, welcome messages

### 5. Quotation & Proposal Management
- Draft → Internal Review → Sent → Negotiation → Accepted/Rejected → Contract
- PDF generation, VAT/tax, discounts, multi-currency, version control

### 6. Contract Management
- Full contract lifecycle: Draft → Review → Approval → Signing → Active → Renewal/Completion
- Digital approval, signature tracking, automated contract expiry alerts

### 7. Invoice & Payment Management
- Invoice types: customer, proforma, recurring, milestone, partial, credit notes
- Payment tracking with automatic reminders (7, 3, 1 days before due; 1, 7, 14, 30 days overdue)

### 8. Income & Expense Management
- Track income by service/product line
- Expense categories: salaries, rent, internet, equipment, marketing, etc.

### 9. Income Statement / Profit & Loss
- Auto-generated P&L by day/week/month/quarter/year
- Revenue, gross profit, operating profit, net profit

### 10. Project Management
- Customer → Contract → Project → Milestones → Tasks → Assignments → Deliverables
- Project statuses: Planning, Not Started, In Progress, On Hold, At Risk, Delayed, Completed, Cancelled

### 11. Task & Assignment Management
- Task workflow: Created → Assigned → Accepted → In Progress → Review → Approved → Completed
- Employee marks task complete → Admin approves or rejects
- Personal dashboard: My Tasks, Due Today, Overdue, Upcoming, Completed

### 12. Milestone Management
- Project milestones with deadlines, deliverables, payment percentage triggers

### 13. Employee & Team Management
- Employee profiles: name, position, department, skills, employment status
- Workload management: who is available, who is overloaded

### 14. Time & Effort Tracking
- Log hours per project/task for profitability calculation
- Project Revenue − Project Cost − Staff Time Cost = Project Profitability

### 15. Document Management
- Central repository: contracts, proposals, quotations, invoices, technical specs
- Upload, download, versioning, approval, expiry, access permissions

### 16. Communication Management
- Log: emails, phone calls, WhatsApp, SMS, meetings, internal notes
- Attached to: Customer + Opportunity + Contract + Project

### 17. Meeting & Appointment Management
- Customer, project, internal, sales, training meetings
- Agenda, notes, decisions, action items, follow-up dates

### 18. Reminder & Notification Engine
- Payment due, contract expiry, project deadline, task deadline, follow-up reminders
- Channels: System → Email → WhatsApp → SMS

### 19. Customer Support / After-Sales
- Ticket workflow: New → Assigned → In Progress → Waiting Customer → Resolved → Closed
- SLA tracking, response time, resolution time, customer satisfaction

### 20. Product & Service Catalog
- EVS, SANTRACK, REVIXSAN, SANBOOK, SANHUB, websites, mobile apps, AI, IoT, training
- Price, cost, tax, SLA, warranty per service

### 21. Subscription & Recurring Revenue
- Monthly/quarterly/annual subscriptions with auto-invoicing and renewal reminders

### 22. Customer Portal
- Customers view: quotations, contracts, invoices, payments, project progress, support tickets
- Actions: approve, sign, pay, request support

### 23. Management Approval System
- Quotation: Salesperson → Manager → CEO
- Expense: Employee → Manager → Finance
- Contract: Project Manager → Finance/Legal → CEO

### 24. Reports & Analytics
- Customer, sales, marketing, financial, project reports
- Export to PDF/Excel

### 25. Role-Based Access Control (RBAC)
| Role | Access |
|---|---|
| Super Admin / CEO | Full system |
| Admin / HR Manager | Employee management, salary, task approval, client oversight |
| Finance Manager | Finance, invoices, payments, expenses |
| Sales Manager | CRM, leads, pipeline, quotations |
| Marketing Manager | Campaigns, leads, communications |
| Project Manager | Projects, tasks, milestones, timesheets |
| Sales / Marketing Staff | Field visits, client logging, personal dashboard |
| Employee | Own tasks, own salary slip, own profile |
| Customer | Customer portal only |

### 26. Audit Trail
- Every action logged: user, action, date/time, old value, new value, IP

### 27. Automation Engine
- Lead → Opportunity → Proposal → Quotation → Contract → Project → Tasks → Invoice → Payment → Income → Support → Renewal

### 28. Salary & Performance Management
- Admin (HR) sets base salaries
- Performance score tracked from approved tasks
- Super Admin grants promotions and salary raises
- Employees view own salary slips (read-only)

---

## User Roles & Access

| Role | Access Level |
|---|---|
| Super Admin | Full control — all modules, promotions, system config |
| Admin (HR/Manager) | Employee management, task approval, salary, client oversight |
| Finance Manager | Finance, invoices, payments, expenses |
| Sales / Marketing | Field visits, lead logging, client records, personal dashboard |
| Employee | Own tasks, mark complete, own salary slip, own profile |
| Customer | Customer portal (view quotations, contracts, invoices, projects) |

---

## Task Completion Workflow
```
Employee marks task "Completed"
    → Status: "Pending Approval"
    → Admin reviews
    → Approved ✅ or Rejected ❌ (with reason)
    → If Approved → performance score increases
    → Performance score → promotion eligibility
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React + TypeScript | UI framework |
| Styling | Tailwind CSS + shadcn/ui | Component library & design system |
| State Management | Zustand | Client-side state |
| Charts | Recharts | Dashboard analytics |
| Backend | Node.js + Express | REST API server |
| Database | PostgreSQL | Relational data storage |
| ORM | Prisma | Type-safe database queries |
| Authentication | JWT + bcrypt | Secure login + role-based access |
| File Storage | Local / S3-compatible | Document management |

---

## Project Structure
```
santech_crm/
├── frontend/                    ← React + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/          ← Reusable UI components
│   │   │   ├── ui/              ← shadcn/ui base components
│   │   │   ├── layout/          ← Sidebar, Navbar, Layout
│   │   │   └── shared/          ← Tables, Cards, Charts, Forms
│   │   ├── pages/               ← Page-level components
│   │   │   ├── auth/            ← Login, Register
│   │   │   ├── dashboard/       ← Executive dashboard
│   │   │   ├── crm/             ← Customers, Leads, Contacts
│   │   │   ├── sales/           ← Pipeline, Proposals, Quotations
│   │   │   ├── marketing/       ← Campaigns, Analytics
│   │   │   ├── contracts/       ← Contract lifecycle
│   │   │   ├── finance/         ← Invoices, Payments, P&L
│   │   │   ├── projects/        ← Projects, Milestones, Tasks
│   │   │   ├── team/            ← Employees, Departments, Workload
│   │   │   ├── support/         ← Tickets, SLA
│   │   │   ├── documents/       ← Document repository
│   │   │   ├── reports/         ← All reports
│   │   │   └── settings/        ← Users, Roles, Config
│   │   ├── hooks/               ← Custom React hooks
│   │   ├── store/               ← Zustand state stores
│   │   ├── lib/                 ← Utilities, API client, helpers
│   │   ├── types/               ← TypeScript type definitions
│   │   └── App.tsx
│   └── package.json
│
├── backend/                     ← Node.js + Express + Prisma
│   ├── src/
│   │   ├── routes/              ← API route definitions
│   │   ├── controllers/         ← Business logic
│   │   ├── middleware/          ← Auth, validation, error handling
│   │   ├── services/            ← Service layer
│   │   └── utils/               ← Helpers, email, notifications
│   ├── prisma/
│   │   └── schema.prisma        ← Database schema
│   └── package.json
│
└── README.md                    ← This file (updated as we build)
```

---

## Navigation Structure
```
DASHBOARD
CRM        → Customers | Leads | Opportunities | Contacts | Activities
SALES      → Pipeline | Proposals | Quotations | Sales Orders
MARKETING  → Campaigns | Lead Sources | Email Campaigns | Analytics
CONTRACTS  → Contracts | Templates | Signatures | Renewals | Expiring
FINANCE    → Invoices | Payments | Expenses | Income | P&L | Cash Flow
PROJECTS   → Projects | Milestones | Tasks | Timesheets | Profitability
TEAM       → Employees | Departments | Roles | Workload | Performance | Salary
SUPPORT    → Tickets | SLA | Knowledge Base | Feedback
DOCUMENTS  → Customer Docs | Contracts | Proposals | Project Files
REPORTS    → Sales | Marketing | Finance | Projects | Management
SETTINGS   → Users | Roles | Company | Taxes | Currencies | Templates
```

---

## Development Progress

### ✅ Completed
- [x] Project requirements gathered
- [x] Excel sheet data structure analyzed (4 sheets: Self Employed, Institutions, Industries, Distributors)
- [x] Full system architecture defined (28 modules)
- [x] Tech stack selected
- [x] README initialized and documented
- [x] Project folder structure created
- [x] Frontend scaffolded (React + TypeScript + Vite + Tailwind CSS)
- [x] Backend scaffolded (Node.js + Express + TypeScript)
- [x] TypeScript type definitions for all system entities
- [x] Authentication store (Zustand + JWT + role-based access)
- [x] API client with auto token injection and 401 handling
- [x] Utility functions (currency formatting, date, status colors)
- [x] Full sidebar navigation with role-based menu visibility
- [x] Top navigation bar with search and user profile
- [x] Auth layout + Login page (with validation)
- [x] Executive Dashboard with KPI cards and charts (Recharts)
- [x] Field Visits page (Excel data migrated as mock data, filters, table)
- [x] Prisma database schema (all 28 modules modeled)
- [x] Auth controller (login, getMe, change password)
- [x] Clients controller with pagination and search
- [x] Field Visits controller with role-based filtering
- [x] All API routes with role-based authorization middleware
- [x] Database seed file with default users and sample field visits

### 📋 Phase 1 — Foundation
- [ ] Project scaffold (frontend + backend folders)
- [ ] Database schema design (based on Excel columns + system modules)
- [ ] Authentication system (login + JWT + roles)
- [ ] Admin dashboard layout (sidebar + navigation)
- [ ] Executive dashboard with KPI cards and charts

### 📋 Phase 2 — CRM Core
- [ ] Customer management (all 4 categories: Self Employed, Institution, Industry, Distributor)
- [ ] Lead management and sales pipeline
- [ ] Field visit recording (migrated from Excel structure)
- [ ] Contact management

### 📋 Phase 3 — Sales & Finance
- [ ] Quotation and proposal management
- [ ] Contract lifecycle management
- [ ] Invoice and payment management
- [ ] Income and expense tracking
- [ ] P&L reports

### 📋 Phase 4 — Operations
- [ ] Project management
- [ ] Task and assignment management
- [ ] Milestone management
- [ ] Employee management
- [ ] Salary and performance management

### 📋 Phase 5 — Advanced Features
- [ ] Document management
- [ ] Communication logs
- [ ] Customer support / tickets
- [ ] Notification and reminder engine
- [ ] Customer portal
- [ ] Audit trail
- [ ] Full reports and analytics

---

*SAN TECH Business Management System — README updated continuously throughout development.*
