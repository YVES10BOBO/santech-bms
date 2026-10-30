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

### Documents: drag & drop files and folders from your computer (30 Oct)
- **What:**
  - **The upload window's box** now accepts a dropped file (before, it only opened the file picker).
    The name fills itself in.
  - **Drop anywhere on the Documents page:** drag files, or whole folders, from your computer. A blue
    frame shows *Drop to upload to "…"*, and they upload into the open folder.
  - **Drop onto a folder card:** uploads straight into that folder (your folders, client and project
    folders, type folders, Company documents).
  - **A dropped folder is rebuilt here** with its subfolders, like Google Drive; an existing folder with
    the same name is reused.
  - **New → File upload / Folder upload** pick several files, or a whole folder, from the computer.
  - **An upload panel** (bottom right) shows each file with a tick, or the reason it failed.
- **Rules:**
  - Each file: up to 5 MB, and PDF, Word, Excel, PowerPoint (.pptx), image, text/CSV or zip.
  - The type is guessed from the file name (*invoice/receipt*, *contract*, *proposal/quotation*,
    *report/minutes*, *policy*) and can be changed with Edit.
  - Files dropped in a client or project folder are linked to that client or project.
  - System files (`desktop.ini`, `Thumbs.db`, hidden files) are skipped.
  - Creating folders from a dropped folder needs Super Admin or Admin.
- **Also fixed:** uploads now send the file type from its extension. Windows reports zip files as
  `application/x-zip-compressed`, and some files have no type, so the server used to refuse them.
- **Technical:** frontend only (`DocumentsPage.tsx`, `fileService.ts`). Dropped folders are read with
  the browser's folder entries (`webkitGetAsEntry`); *Folder upload* uses a `webkitdirectory` input.
- **Tested:** 20 checks in a real (headless) Edge browser against a local copy of the database:
  - upload-window drop;
  - page drop of several files;
  - folder drop with a subfolder;
  - drop on a folder card;
  - type guessing and system-file skipping;
  - dragging a document onto a folder still moves it.

### Documents: your own folders and subfolders (admins)
- **What:** Next to the automatic folders, admins now create their own folders, as in Google Drive. They
  work as categories the company manages itself, for example *Contracts › Signed contracts*,
  *Finance › Invoices*, *Receipts* or *Certificates*.
  - **New ▾ → New folder** (or **New subfolder** inside a folder). Pick a name and a colour.
  - **Each folder's ⋮ menu** has *Open*, *Upload here*, *New subfolder*, *Rename / colour*, *Move to…*
    and *Delete folder*.
  - **File a document** with ⋮ → *Move to folder…*, with the Folder field when you upload or edit, or by
    **dragging the file onto a folder**. Uploading from inside a folder files it there.
  - **A filed document still shows in its automatic client, project and type folders.** Its location
    shows its folder path, e.g. *Finance › Invoices*.
- **Where:** Documents → All Documents → *My folders*.
- **Rules:**
  - Only Super Admin and Admin create, rename, move or delete folders. Moving a document follows the
    usual rule (the uploader or an admin).
  - Folder names can't repeat at the same level. A folder can't be moved inside itself or one of its
    own subfolders.
  - Deleting a folder never deletes documents: its documents and subfolders move up one level.
  - Every folder action is in the Audit Trail (created, renamed, moved, deleted, document moved).
- **Technical:**
  - New table `document_folders` (name, colour, parent) and `documents.folderId`; migration
    `20261029220000_document_folders`, which only adds things.
  - `POST /api/documents/folders`, `PUT /api/documents/folders/:id` and `DELETE /api/documents/folders/:id`
    (admins). The folder tree includes the custom folders, and `GET /api/documents` accepts `folderId`.
- **Demo data:**
  - *Contracts* (*Signed contracts*, *Drafts*), *Finance* (*Invoices*, *Financial reports*),
    *HR & Policies*, *Proposals & Quotations*, and *Project Files* (*Site surveys*,
    *Handover & training*), with the demo documents filed in them.
  - `seedCustomFolders` in `prisma/seeds/documentFolders.ts` only fills documents that are in no
    folder yet.
- **Tested:**
  - 22 API checks: create, permissions, duplicate names, colours, subfolders, rename, move and the
    "inside itself" rule, filing, and delete moving contents up, plus the audit entries.
  - The earlier 20 folder-tree checks still pass.
  - Screenshots of the root, a folder and the list view were checked on a local copy.

### Documents: Google Drive-style folders, grid and list views
- **What:** The Documents page now works like Google Drive:
  - **Folders** fill themselves from each document's client, project and type, so nobody has to file
    anything by hand:
    - *Clients* (one folder per client, then one per project inside it);
    - *Company documents* (no client);
    - one folder per type (*Contracts, Invoices, Proposals, Reports, Policies, Other documents*);
    - *Archive*.
  - **Grid or list layout,** switched with the list/grid button (top right), as in Drive. The page
    remembers the choice.
  - **Breadcrumbs** (*Documents › Clients › SABBAN ABATTOIR › EVS System*): click any part to go back
    up. The browser's Back button works too.
  - **Search** looks through all folders. Each result shows its location, and clicking it opens that
    folder.
  - **Filters:** type, modified date range, and sort (newest, oldest, name).
  - **Each folder and file has a ⋮ menu:**
    - folders: *Open*, *Upload here*;
    - files: *Open*, *Download*, *Details*, *Show in folder*, *Edit*, *Move to archive*,
      *Delete permanently* (admins).
  - **New document** started inside a folder is linked to that client, project or type automatically.
- **Where:** Documents → All Documents.
- **Rules:**
  - No change to who can do what: the uploader or an admin edits and archives; admins delete.
  - The root shows the 8 most recent files.
  - Archived documents only appear in *Archive*.
- **Technical:**
  - `GET /api/documents/folders` returns the folder tree with counts and last-modified dates.
  - `GET /api/documents` accepts `projectId=none` (files directly in a client folder) and `limit`.
  - `DocumentsPage.tsx` rewritten; `documentService.folders()`.
- **Demo data:** 9 more documents with sample PDFs, so every folder has something to open:
  - N&T contract and invoice;
  - East African Seed training report;
  - NYARUGENGE HOSPITAL site survey and quotation;
  - KABUYE draft contract;
  - Capital Transport requirements;
  - company code of conduct and board minutes.

  `prisma/seeds/documentFolders.ts`, created only when missing.
- **Also fixed:** the "Santech" name in the sidebar logo was dark text on dark blue (invisible); it is
  now white.
- **Tested:** 20 API checks: every document sits in exactly one client or company folder, the type and
  archive counts add up, the project and client folders list the right files, recent files, search,
  login required. Screenshots of grid, list, folder and phone-width views were checked on a local copy.

### Sidebar: menu button moved onto the blue sidebar
- **What:** The menu (hamburger) button that collapses and expands the sidebar is now white and sits in
  the top-right corner of the blue sidebar, instead of in the white top bar. When the sidebar is
  collapsed to icons, the button stays at the top so you can expand it again.
- **Phones:** the sidebar is hidden on small screens, so the top bar keeps a button to open it. The
  opened sidebar has a white close (X) button in the same corner.
- **Technical:** `Sidebar.tsx` (new `onToggle` prop), `MainLayout.tsx`, `Topbar.tsx`. Frontend only.
- **Tested:** frontend type check.

### Demo data: duplicate records cleaned up
*Commit 7858302*
- **What:** Older versions of the demo-data loader ran several times on 26–27 Oct and left copies
  of the same records. For example, *East African Seed Ltd* existed twice, and its contract sat on one
  copy while the other copy had none. That is why the invoice form often offered only "None".
  The clean-up merges or removes the copies:

  | Records | Before | After |
  |---|---|---|
  | Clients | 32 | 19 |
  | Projects | 14 | 6 |
  | Contracts | 7 | 6 (CT-2026-003 was the same N&T deal as CT-2026-004) |
  | Milestones | 36 | 14 |
  | Field visits | 51 | 13 |
  | Deals in the pipeline | 27 | 7 |
  | Tasks | 58 | 34 |
  | Payments / income entries | 9 / 35 | 3 / 29 |

- **Also fixed:**
  - Three invoice payments were recorded three times, so income was overstated by RWF 6,100,000.
  - Rwanda Mountain Ride's website project pointed at N&T's contract; it now uses its own (CT-2025-012).
  - SABBAN's EVS project mixed two milestone plans (adding up to 170%); it now has the current plan
    (Site Survey, Hardware Procurement, Installation & Testing, Training & Handover = 100%).
  - Milestones that had generated invoices keep their invoice links.
- **Rules (safety):**
  - Nothing is lost: each merged client keeps all its visits, deals, quotations, contracts, invoices,
    payments, documents and messages.
  - Only copies created by the old loader (before 28 Oct) are removed, never a record someone changed
    in the app (checked against the Audit Trail). The one exception is two copies of the Serena deal
    that were only dragged between pipeline stages.
  - Everything runs in one transaction with checks before it commits, so it either fully succeeds or
    changes nothing.
  - Full backups of the live database were taken first, into `backups/` (git-ignored).
- **Status:** rehearsed on a full copy of the live database: all checks passed, 23 page/API checks
  passed, and re-running the seed added nothing. **Not yet applied to the live database.** To apply it,
  run the command below from `backend`.
- **Technical:** `backend/prisma/maintenance/remove-duplicates-2026-10.js`: without options it only
  prints the plan; `--apply` runs it. The seed now reuses an existing client, project, deal, task or
  field visit with the same name instead of creating a copy, and lists Rwanda Mountain Ride's contract
  as CT-2025-012 (`prisma/seed.ts`, `prisma/seeds/tasksForEveryone.ts`).

### Invoice form: clear Contract and Project choices
*Commit 7858302*
- **What:**
  - The Contract and Project lists only offer the chosen client's own records. Instead of a lone
    "None", they now say *Choose a client first*, *No contract (optional)* or *This client has no
    contracts yet* (same for projects).
  - Contracts show their project, e.g. *CT-2026-001 — SANTRACK Implementation*.
  - Picking a project fills in its contract.
  - Dropdown lists on every page refresh when the page opens, and the invoice form refreshes them when
    it opens. A client, contract or project created elsewhere now appears without reloading the browser.
- **Where:** Finance → Invoices & Payments → **New Invoice**.
- **Rules:** the server refuses a contract or project that belongs to another client, an unknown
  client, and an amount that isn't positive, each with a clear message.
- **Technical:** `useLookups` (`lookupService.ts`) fetches fresh lists on every page and shows the last
  ones instantly; `InvoicesPage.tsx`; checks in `createInvoice` (`financeController.ts`).
- **Tested:** 8 API checks (own contract and project accepted and linked; another client's contract
  or project refused; bad amount; unknown client; invoice without contract or project) and type checks.

### Documents: Delete button on every document (admins)
*Commit 00238fb*
- **What:** Admins now see **Delete** on every document, not only on archived ones. Before, you had to
  archive the document, switch the Status filter to *Archived* and only then find Delete, which was
  easy to miss.
- **Where:** Documents → All Documents → red **Delete** on the row (or in the document view) → confirm.
- **Rules:**
  - Still Super Admin and Admin only.
  - One confirmation. For an active document it says the document will be archived and then deleted;
    both happen together.
  - The file is removed too, unless another document or a signed contract uses it.
  - The Audit Trail records both steps: archived, then deleted.
- **Technical:** frontend only (`DocumentsPage.tsx`). For an active document, `removeDoc` archives it
  (`PUT /api/documents/:id`) and then deletes it (`DELETE /api/documents/:id`). The API still refuses
  to delete an active document directly, as a safety net for any other caller.
- **Tested:** frontend type check. The archive-then-delete API calls are the ones covered by the
  9 delete checks of commit 7f820b3.

### My Tasks visible to every role
*Commit b62614b*
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
