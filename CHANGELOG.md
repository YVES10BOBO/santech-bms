# Changelog — SAN-BMS

Every change to SAN-BMS, newest first. Each entry says **what changed**, **where to find it** in the app,
and **what changed underneath** (API, database, demo data).

- [README.md](README.md) — what the system does today
- **CHANGELOG.md** (this file) — how it got there, change by change
- [SETUP.md](SETUP.md) — how to run it on your own computer

Version numbers before 1.1.0 were assigned afterwards, from the git history.

| Version | Date (2026) | Highlights |
|---|---|---|
| **1.8.0** | 5 Nov | Customer and supplier portals completed: supplier invoice status and payment, messages, requests for quotation, documents and company details; customer "I have paid", contract signing, ticket conversation, quotation requests, bank details |
| **1.7.0** | 2 Nov | Email, SMS and WhatsApp ready to switch on (Brevo or Gmail, Twilio): notification emails, portal login emails, payment reminders, "send it now" in the communication log, test mode, message log |
| **1.6.0** | 2 Nov | Features linked together (deal ↔ quotation ↔ contract, leads ↔ campaigns, employees ↔ departments, tickets ↔ projects, visitors ↔ clients, catalogue lines), lost-deal reasons, 2px card borders, Santech logo, full-width Roles & Permissions page |
| **1.5.0** | 30 Oct | Customer portal and supplier portal, suppliers and purchase orders |
| **1.4.0** | 30 Oct | Proforma invoices, credit notes, recurring service invoices, multiple currencies with exchange rates, contract and quotation version history |
| **1.3.0** | 30 Oct | Expense claims with approvals, quotation discounts, support response times and ratings, document expiry and versions, project warranties, contract → project automation |
| **1.2.0** | 29 Oct | Document library (clients, projects, search, edit, delete), real file storage, PDF quotations and invoices, financial statements, login fix |
| **1.1.0** | 28–29 Oct | Every page reads and saves through the API; all demo data seeded in Neon |
| **1.0.0** | 26–28 Oct | Real login and the core pages on the database |
| **0.3.0** | 22–25 Oct | Client 360 and field visit workflows |
| **0.2.0** | 14–21 Oct | Remaining pages built with sample data; first seed and API service layer |
| **0.1.0** | 11–13 Oct | Foundation: first pages, backend skeleton, hosting on Vercel, Render and Neon |

---

## 1.8.0 — 5 November 2026

### Signing works like inserting a picture in Word (10 Nov)
- **What:** while the document is open for signing you can now add your signature on the spot, the way you insert
  a picture in Word, instead of saving it in My Profile first.
- **Where:** the signing screen (Contracts → Sign, Documents → Sign), panel on the right:
  - **Upload picture:** pick a photo or scan of your signature (or a stamp) from this device. A preview opens with
    the paper background removed; **Save and place on the page** puts it on the page and keeps it for next time.
  - **Draw / type:** draw it with the mouse or a finger, or type your name.
  - **Drag and drop:** drag a saved signature from the panel onto the exact spot on the page, or drop a picture
    file from your computer straight onto the page.
  - **Paste:** Ctrl+V of a copied picture adds it the same way.
  - **Resize from any of the four corners** (it keeps its shape), drag to move, **Remove** button or the Delete key.
- **Better background removal:** the paper colour is taken from the edges of the picture, so light-blue, grey or
  cream paper (and phone photos) is removed too, not only pure white. A PNG that is already see-through is kept as
  it is. The same improvement applies in My Profile → My signatures.
- **Rules:** unchanged: a signature added here is saved to your own signatures (the 12-image limit applies), the
  signing still needs your password, and the original document is never changed.
- **Technical:** `SignDocumentDialog.tsx` (upload / draw buttons, drop and paste handling, four resize corners,
  Delete key), `SignatureLibrary.tsx` exports `AddSignatureDialog` for reuse, `signatureImage.ts` (paper colour from
  the border median, transparency check). Frontend only.
- **Tested:** type check and production build; the new background removal was run on a photo of a signature on
  light-blue paper and the paper disappeared. Dragging, dropping, pasting and resizing have not been tried in a
  browser.

### Sign a contract online with nothing to upload: the system writes the contract (10 Nov)
- **What:** a contract no longer needs a file before it can be signed. The system writes the contract itself as a
  PDF from the contract's details, and you sign it online right away. Nothing is downloaded, printed, scanned or
  uploaded.
- **Where:**
  - **Contracts → open a contract in Signing → Contract signing → Read the contract document:** opens the PDF to
    read.
  - **Sign** (next to a signatory): the first choice is **Use the contract written by the system**. Uploading your
    own file is still possible ("Upload your own file instead"). If the contract already has a file attached, it
    opens that one, with a button **Sign the document written by the system instead**.
- **What the contract contains:** company header (name, address, phone, email, TIN); "Service agreement" with the
  contract number and date; 1. Parties (company and client with registration number, TIN, address, contact person);
  2. Subject (the project); 3. Key terms (value and currency, start and end dates, payment terms, contacts);
  4. Deliverables (one per line); 5. General; 6. Signatures, with a box per signatory (name, signature line, date);
  page numbers. After signing, the certificate page with the QR code is added as before.
- **Rules:** only admins, finance, sales and project managers can open or prepare it. It always reflects the
  contract's current details. Characters the standard PDF font cannot show are replaced by "?".
- **Technical:** `backend/src/lib/contractPdf.ts` (`buildContractPdf`, pdf-lib); routes
  `GET /api/signatures/contract/:id/document` (read, not saved) and `POST .../document` (saved, to sign);
  `SignDocumentDialog` has a new `prepareDocument` option; `ContractsPage` passes it and shows the read button.
  No database change.
- **Tested:** against a temporary database: the PDF builds for all 7 demo contracts, an employee gets 403, an
  unknown contract 404; a system-written contract was signed (signature and company stamp) and the signatory was
  marked signed with the signed copy attached. The PDF was rendered and looked at. Frontend type check and build
  pass. The new buttons have not been clicked in a browser.

### Signed documents carry a QR code and can be verified by anyone (10 Nov)
- **What:** a document signed in the system now has a **QR code** and short code on its certificate page. Anyone
  who scans it (the client, a lawyer, an auditor) opens a public page that says **"Genuine signed document"**,
  names the document, lists **who signed and when**, and lets them **check their own copy**: they pick the PDF
  they received and the page tells them whether it is **exactly** the signed copy or has been changed.
  It works like the QR on an RRA receipt, but for contracts and other signed documents.
- **Where:**
  - **Signed contracts and any document signed from Documents:** the certificate page (last page) shows the QR,
    the address and the code (for example F6B04AF3).
  - **Public page** `/verify/signed/<code>`: no login, read only.
- **Rules:**
  - The page shows the document name, contract number, the company, and each signer's name and time.
    It does not show the document's contents or any signature image.
  - **Check your copy:** the file never leaves the visitor's device. The browser sends only its SHA-256
    fingerprint, and the server says match or no match. A copy saved after someone else signed it again will
    not match the earlier fingerprint, which is correct.
  - When several people sign the same copy one after the other, the page lists all of them, oldest first.
  - At most 40 checks per minute from one address. The code is long and random (32 characters).
  - A signing made before this update has no QR (it was signed with the earlier certificate).
- **Technical:**
  - New table `signed_documents` (migration `20261110200000_signed_documents`): one row per signing with the
    code, the signed file, both SHA-256 fingerprints, signer, contract and the earlier copy it came from.
  - Backend: `signaturesController.ts` draws the QR (package `qrcode`, added with pnpm) and saves the record;
    public routes `GET /api/verify/signed/:code` and `POST /api/verify/signed/:code/check` in `routes/verify.ts`.
    The QR address uses the first `CLIENT_URL`.
  - Frontend: `pages/public/VerifySignedPage.tsx` and the route `/verify/signed/:code`.
- **Tested:** against a temporary database: two people signing the same copy in turn are both listed in order;
  the real signed file matches, a changed file and the earlier copy do not; a bad hash gives 400 and an unknown
  code 404; the earlier 25 signing checks still pass. The certificate page was rendered and the QR looks right.
  The public page itself has not been looked at in a browser, and the QR has not been scanned with a phone.

### QR code on invoices and a public page that confirms they are genuine (10 Nov)
- **What:** every printed invoice and credit note now carries a **QR code** and a short code. Anyone who scans
  it (a customer, an accountant, a tax officer) opens a public page that says **"Genuine document"** and shows
  who issued it, the number, date, client, total and whether it is paid. Invoices also show the **client's TIN**.
  This is how a receipt from a tax machine can be checked, but done by Santech's own system.
- **Where:**
  - **Finance → Invoices → PDF**, **Customer portal → Invoices → PDF**: the QR box sits above the
    "For Santech / Received by" lines. Invoices and credit notes only (proformas and quotations have none).
  - **Public page** `/verify/<code>` (no login): green "Genuine document", or "Genuine, but cancelled" for a
    cancelled invoice, or "Document not recognised" for a wrong code.
- **Rules:**
  - The page shows very little: issuer (name, TIN), document and number, date, client name, total, payment state.
    Nothing can be changed there.
  - The code is long and random (32 characters), so invoice numbers cannot be used to guess another invoice.
  - At most 40 checks per minute from one address.
  - This is **not** an RRA EBM receipt. VAT-registered companies must still issue tax invoices through an
    RRA-approved EBM. The QR only proves a document came from Santech's system and is unchanged.
- **Demo data:** all 13 existing invoices got their codes automatically when the migration ran.
- **Technical:**
  - New column `invoices.verifyCode` (unique, filled by the database for new and existing rows; migration
    `20261110180000_invoice_verify_code`).
  - Backend: public route `/api/verify/invoice/:code` (`routes/verify.ts`); staff invoices now include the
    client's TIN, and the portal invoice list includes the code and client TIN.
  - Frontend: `lib/printDocument.ts` draws the QR (package `qrcode`, added with pnpm); new page
    `pages/public/VerifyPage.tsx` and the route `/verify/:code`.
- **Tested:** against a temporary database with the demo data: codes unique and 32 characters, the public check
  works without login and shows only the minimal fields, paid and unpaid states, a wrong or malformed code gives
  404, an invoice number is not accepted as a code, the portal list carries the code, and the rate limit
  returns 429. Frontend type check and production build pass. The printed page and the public page have not
  been looked at in a browser.

### Sign any PDF or picture from the Documents library (10 Nov)
- **What:** you can now sign any document in the Documents library, not only contracts. For example, save an
  invoice as PDF, add it to Documents, and sign it there.
- **Where:** Documents → a file's **⋮ menu → Sign**, or open the file's details → **Sign**.
- **Rules:**
  - Same signing screen as contracts: pick a saved signature, initials or the company stamp, drag it into
    place, resize it, confirm with your password.
  - The original document is **not changed**. The signed copy (`name (signed).pdf`, with the certificate
    page) is saved as a **new document next to it** (same type, client, project and folder; not shared with
    the client automatically).
  - Only PDF and PNG / JPG files can be signed (Word must be saved as PDF first).
  - Anyone who can see the document can sign it with their own signature; it is recorded in the Audit Trail.
- **Technical:** `DocumentsPage.tsx` opens the same `SignDocumentDialog` (loaded on demand) and creates the
  signed copy with the existing document save. No backend or database change.
- **Tested:** type check and production build. The signing itself was tested earlier (contracts). Not clicked
  through in a browser.

### In-app question boxes instead of browser pop-ups (10 Nov)
- **What:** the plain browser pop-up ("localhost says ... Optional approval note") is replaced by a proper box
  inside the system, with a title, the question, a larger text area, Cancel and a clearly named button.
- **Where:**
  - **Contracts:** Approve (optional note) and Request changes (reason required; the button stays off until
    something is typed).
  - **Quotations:** Send back / Client rejected (reason).
  - **Meetings:** Mark completed (decisions and action items in one box instead of two pop-ups).
- **Rules:** the rules are unchanged. Esc or clicking outside cancels; Ctrl+Enter confirms.
- **Technical:** new reusable `components/shared/TextPrompt.tsx` (`useTextPrompt`). No browser `prompt()` is used
  in the app any more (a few "Are you sure?" confirmations still use the browser's own box).
- **Tested:** type check and production build. Not clicked through in a browser.

### E-signatures: sign documents inside the system with a saved signature or stamp (10 Nov)
- **What:** you can now sign a contract without printing it. Save your signature, initials or the company
  stamp (cachet) once, then place it on the document where it belongs, resize it, and sign. The signed copy
  is created and attached to the contract.
- **Where:**
  - **My Profile → My signatures:** add a signature or initials by uploading a picture (white background
    removed automatically), drawing it, or typing your name. Mark a default. Admins also save the
    **company stamp** here.
  - **Contracts → open a contract → Signatories → Sign** (next to each signatory who has not signed).
    **Mark signed** is still there for contracts signed on paper.
- **Rules:**
  - Works on **PDF and PNG / JPG** files, up to 5 MB. A Word file must be saved as PDF first (a clear message
    says so). The contract's attached file is signed if there is one; otherwise you choose a file.
  - Each person's signatures are private; the company stamp is shared by all staff, saved only by admins.
  - Up to 12 saved images per person; each image up to 600 KB (resized in the browser).
  - Signing needs your **password** (a wrong one is refused without logging you out).
  - The original file is never changed. The result is `name (signed).pdf` with a **signature certificate** page
    (signer, time, network address, SHA-256 fingerprint of the document before signing). Several signers add
    their own certificate page to the same copy.
  - Only admins, finance managers, sales managers and project managers can sign a contract. A signatory can only
    be signed once; a contract still becomes Active in the usual step (all signed + signed file attached).
  - Each signing is written to the Audit Trail (original and signed fingerprints). Portal logins cannot use it.
- **Demo data:** none needed (signatures belong to each person). To demo: My Profile → Add signature, then
  Contracts → CT-2026-901 → Sign.
- **Technical:**
  - New table `saved_signatures` (migration `20261110120000_saved_signatures`, applied on deploy).
  - Backend: `signaturesController.ts`, routes `/api/signatures` (`GET/POST`, `PUT/DELETE /:id`, `POST /sign`);
    the PDF is stamped with `pdf-lib` on the server.
  - Frontend: `components/signing/SignatureLibrary.tsx`, `SignDocumentDialog.tsx` (pages drawn with `pdfjs-dist`,
    loaded only when the dialog opens), `lib/signatureImage.ts`, `lib/services/signatureService.ts`.
  - New packages added with pnpm (not npm): `pdf-lib` (backend), `pdfjs-dist` (frontend).
- **Tested:** against a temporary database with the demo data, 25 checks all passed (saving, private/shared,
  invalid PNG, wrong password, outside the page, Word file, contract signing and permissions, original file
  unchanged, portal login blocked), and the signed PDF was opened and looked at (signature on page 1, stamp
  on page 2, certificate page). Frontend type check and production build pass. The dialog itself (dragging and
  resizing with the mouse) has not been clicked through in a browser.

### Admins manage drop-down lists with a ⚙ button (10 Nov)
- **What:** next to selected drop-down boxes, an admin sees a ⚙ button to **add, rename, hide or delete**
  choices, so changing a choice no longer needs a developer.
- **Where:** Training → Training Type, Support → Product / Service, Campaigns → Type and Channel. Other
  drop-downs are unchanged for now.
- **Update (10 Nov):** Campaigns → **Type** was added the same day (it had no ⚙ at first). Its filter on the
  Campaigns page follows the list too.
- **Rules:**
  - Only admins (Super Admin, Admin) see the ⚙ button and can change a list; everyone can read it.
  - **Other** is built in, always last, cannot be renamed, hidden or deleted. Anyone can still pick it and
    type their own value.
  - A renamed choice shows its new name everywhere (cards, lists, details).
  - A choice used by saved records cannot be deleted ("2 records use this choice. Hide it instead"). A hidden
    choice leaves new forms but old records still show it.
  - Names must be unique in a list (not case sensitive), up to 60 characters.
  - Every add, rename, hide, show and delete is written to the Audit Trail.
- **Demo data:** the starting choices are saved the first time a list is opened, so no seeding is needed on Neon.
- **Technical:**
  - New table `list_options` (migration `20261110090000_list_options`, applied on deploy).
  - Backend: `lib/listOptions.ts` (the lists and their starting choices), `listOptionsController.ts`,
    routes `GET/POST /api/lists/:list` and `PUT/DELETE /api/lists/:list/:id` (writes: admins only).
  - Frontend: `ManagedSelect.tsx` (drop-down + ⚙ dialog), `listService.ts` (`useListOptions`), on top of the
    earlier `SelectOrOther.tsx`.
  - Not applied to client category, lead source, visit purpose, statuses and finance categories, which are
    fixed values the system's rules and reports depend on.
- **Tested:** against a temporary database with the demo data: an employee can read but not change (403), an
  admin adds, renames, hides and deletes, duplicates are refused (409), "Other" is protected (400), choices
  used by records cannot be deleted (409), unknown list 404, no login 401. Also frontend type check and build.
  The ⚙ dialog itself has not been clicked through in the browser.

### "Other" lets you type your own value (9 Nov)
- **What:** in a drop-down with an "Other" choice, picking **Other** now shows a text box where you type your
  own value (for example a training type "Robotics"). The typed text is what is saved and shown.
- **Where:**
  - **Training:** Training Type (also shown on the cards, list and details).
  - **Support Tickets:** Product / Service.
  - **Campaigns:** Channel.
  - Editing a record that has a typed value opens with "Other" selected and the text filled in.
- **Rules:** up to 60 characters. If "Other" is chosen and the box is left empty, the value saved is "Other".
  The Training filter still lists only the standard types; typed types appear under "All".
- **Technical:** new reusable `frontend/src/components/shared/SelectOrOther.tsx`. These three fields are free
  text in the database, so no migration was needed. Not applied to Finance categories, Procurement
  categories or Hosting provider, which feed fixed reports, labels or validation lists.
- **Tested:** type check and production build. Not yet clicked through in the browser.

### Deactivating a user or changing a role works immediately (9 Nov)
- **What:** before, a deactivated user who was already logged in could keep working for up to 7 days (until
  the login token expired), and a role change only applied after the next login. Now the server checks the
  account on every request, so both take effect on the user's very next click.
- **Where:** Settings → User Management. Deactivate a user, and they are logged out at their next action
  with the message "Your account has been deactivated. Contact an administrator." A role change gives the
  new access at once. Applies to staff, customer and supplier logins alike.
- **Rules:** an admin cannot deactivate themselves. A user cannot reactivate themselves, because only an
  admin can change that. Changing your own password still needs your current password.
- **Technical:** `backend/src/middleware/auth.ts`: `authenticate` is now async and reads `isActive` and
  `role` from the database for every request (one small lookup), instead of trusting the token. The
  frontend already logs the user out on a 401, so no frontend change was needed.
- **Tested:** type check only. Not yet run against a live database.

### Smaller white logo in the sidebar and portal header (9 Nov)
- **What:** the white "S" logo looked bigger than the old one and made the top of the sidebar taller.
  It is now back to the size the old logo appeared.
- **Why:** the old logo was a 36 px white tile with the "S" drawn smaller inside it. The new white "S"
  had no tile and was shown at 40 px, so the whole 40 px was logo.
- **Where:** sidebar logo 40 px → 32 px; customer and supplier portal header logo 40 px → 36 px.
- **Technical:** `Sidebar.tsx` (`w-10 h-10` → `w-8 h-8`), `PortalShell.tsx` (`w-10 h-10` → `w-9 h-9`).
- **Tested:** type check and production build.

### White Santech logo on blue backgrounds (9 Nov)
- **What:** the logo now has two versions. Where the background is **blue**, the **white** logo is shown
  directly on it (no white tile). Where the background is **white**, the **blue** logo is shown.
- **Where:**
  - **Sidebar** (staff pages): white "S" next to "Santech, Business Management".
  - **Login page, blue left panel:** the full white logo with "Making your ideas happen", and
    "SAN-BMS · Business Management System" under it.
  - **Login page, white sign-in side:** the blue "S" (the full logo is already on the blue panel).
  - **Customer and supplier portal header** (blue): white "S".
  - **PDFs and emails** (white): full blue logo, now from `santech_logo_blue.png`. The previous file,
    `santech_logo.png`, had been replaced by the white logo and would have been almost invisible on white paper.
  - **Top bar on phones** (white): blue "S", unchanged.
- **Technical:** new transparent files `santech_logo_white.png` (640 px wide) and `santech_mark_white.png`
  (256 px), cut out of `santech-logo (2).jpeg` by removing the navy background with soft edges; new
  `santech_logo_blue.png` (copy of the original blue logo). Files changed: `Sidebar.tsx`, `LoginPage.tsx`,
  `PortalShell.tsx`, `printDocument.ts` (PDFs), `backend/src/lib/messaging.ts` (emails).
- **Tested:** type check and production build; both white logos previewed on the app's blue `#0b1f44`.

### Task Assigned shows who sent it, with their position (6 Nov)
- **Before:** "Claire Mukamana assigned you ...". Only the name, so the person could not tell who it was.
- **Now:** "Claire Mukamana (HR Manager) assigned you ...". The position is the one on the employee record
  (Team → Employees); without one, the role (Admin, Finance Manager, ...) is shown. Applies to the bell and the email.

### Resend as an email provider (5 Nov)
- **What:** email can now go out through **Resend** as well as Brevo or SMTP. Set `RESEND_API_KEY` and the
  sender in `MAIL_FROM` (or `EMAIL_FROM`), for example `SAN TECH <no-reply@notification.example.com>`.
  The domain must be verified in Resend, otherwise Resend only delivers to its owner.
- **Which one is used:** `EMAIL_PROVIDER` (`resend`, `brevo` or `smtp`) picks one when its keys are set.
  Otherwise the first with keys is used, in the order Resend, Brevo, SMTP.
- **Where to see it:** Settings → Email & SMS shows "Resend" and the sender address (never the key).
- **Reply address:** new `REPLY_TO` setting (for example `bms@santechconnect.com`). Automatic emails go out from
  the no-reply sender but carry this as "reply to", so a reply reaches a real mailbox. A message written by a
  staff member in the communication log still replies to that person. A value that is not an email is ignored.
- **Tested** against a stand-in Resend server: provider choice, sender parsing, key in the Bearer header,
  from/to/subject/reply-to, a refusal logged as failed with Resend's reason, and fall-back.

### Customer and supplier portals completed (5 Nov)
Both portals now cover what each side needs day to day, not only the main flow.

**Supplier portal** (`/supplier`)
- **Invoice status and payment:** every invoice the supplier sends shows where it stands: *Under review*,
  *Approved: to be paid*, *Not accepted* (with Finance's reason, and a button to send a corrected invoice)
  or *Paid* (amount, date and payment reference). A new **Invoices & payments** tab lists them all, and the
  overview shows invoices under review, to be paid and paid so far. An approved or paid invoice cannot be
  replaced.
- **Order details and messages:** each order opens a panel with its details, a printable **purchase order
  PDF**, and a conversation with Santech about that order.
- **Quotation requests (RFQ):** a new tab shows the requests Santech sent. The supplier enters a price per
  unit, delivery days, an optional offer end date, a note and its own quotation file, can change it before
  the deadline, or say it cannot quote. When Santech chooses another supplier, it is told.
- **Documents:** the supplier sees what Santech shared with it, and adds its own certificates, licences and
  price lists (with an optional expiry date). It can remove only its own.
- **Company details:** contact, phone, email, address, tax number and **bank details**, edited by the supplier.
  The name and category stay with Santech. Finance is notified when the bank details change.
- The updates box on the overview no longer says "quotations, invoices and support replies" (that was the
  customer wording).

**Customer portal** (`/portal`)
- **Bank and mobile money details:** Settings → Company Profile has a new **How customers pay** card (bank,
  account name and number, mobile money code, instructions). They appear on invoice and proforma PDFs and
  next to every unpaid invoice in the portal.
- **"I have paid":** the customer tells Santech about a payment (amount, method, date, reference, optional
  proof file). Finance sees it on the invoice (and a *Customer says paid* tag in the list), records the payment
  with one click (the form is filled in from the notice) or tells the customer it was not found. The customer
  sees the answer. Limits: no more than the amount still owed, not in the future, at most 3 waiting notices
  per invoice.
- **Contract signing:** when Santech lists a person as a signatory and that person has a portal login with
  the same name, the contract shows **Review and sign**. The person must tick that they agree. The signature
  is recorded as signed in the portal, and the sales managers and the responsible manager are told.
  Santech still attaches the signed document and activates the contract.
- **Ticket conversation:** replies between the customer and the support team on each ticket, in the portal
  and in Support → ticket panel.
- **Ask for a quotation:** the customer describes what they need (and a budget). It becomes a lead for the
  account manager and the sales managers, linked to the client.
- **Contact details:** the customer edits contact person, phones, email and address. The company name and tax
  number stay with Santech.

**Staff side**
- **Procurement:** new **Quotation requests** tab. Finance creates a request for several suppliers, compares
  the answers side by side (lowest price marked, total, delivery days) and orders from the best one, which
  makes a purchase order with the next PO number and tells every supplier the result. In the order panel:
  approve, send back (with a reason) or mark paid the supplier's invoice, and write to the supplier. The
  supplier form has bank name and account.
- **Support:** the ticket panel has the conversation with the customer.
- **Finance → Invoices:** customer payment notices (see above).
- **Documents:** a document can be linked to a supplier and shared with it in the supplier portal.
- **Contracts:** the signatories box says that a signer with a portal login of the same name can sign online.

**Underneath**
- New tables `portal_messages`, `payment_notices`, `rfqs`, `rfq_quotes` (migration
  `20261105100000_portal_complete`). New columns: purchase order invoice status, reason, paid date, amount
  and reference; supplier bank name and account; document supplier link and share flag.
- New customer endpoints: ticket messages, `payment-notice`, `contracts/:id/sign`, `quotation-requests`,
  `profile`. New supplier endpoints: order detail and messages, `profile`, `documents`, `rfqs`. New staff
  endpoints under `/api/portal-admin`: ticket and order messages, invoice review, payment notices, RFQs.
- Company profile settings gained `bankName`, `bankAccountName`, `bankAccountNumber`, `momoCode`,
  `paymentInstructions`.
- Demo data (`prisma/seeds/portalExtras.ts`, safe to run again): bank details, supplier invoices at every
  stage, a conversation on an order and a ticket, a payment notice, a contract waiting for the customer's
  signature, supplier documents and two requests for quotation.
- Tested with 93 API checks (permissions, other suppliers' and clients' data, limits, every status change)
  and browser checks of every new screen.
- **Not built:** paying online (mobile money or card) from the portal. Customers pay with the bank or mobile
  money details and tell Santech with "I have paid". Online payment needs an account with a payment provider.

## 1.7.0 — 2 November 2026

### Fix: assigning a task now notifies the person (5 Nov)
- **What was wrong:** creating a task in Projects → Tasks sent no notification at all. The person only
  got a reminder when the deadline was within 2 days. No bell, no email.
- **Now:** the person gets a **Task Assigned** notification in the bell straight away, and by email when
  email is switched on (and their address is allowed). You are not notified of tasks you give yourself.

### A user's email can be changed (5 Nov)
- **What:** in Settings → User Management, the email box is no longer locked when editing a user. Admins can
  correct a wrong address. The email is also the login name, so the person signs in with the new address
  from then on (same password). Notification emails go to this address.
- **Checks:** it must look like an email address and must not belong to another user. The change is
  written to the audit trail with the old and new address.
- **Technical:** `PUT /api/users/:id` accepts `email`.

### Reminder days can be changed (5 Nov)
- **What:** the days at which the system reminds people (invoice due, contract ending, tasks, ...) used to be
  fixed in the code. Super Admin and Admin (HR) can now change them, and switch any reminder off.
- **Where:** Settings → **Reminders**. One row per reminder: the days (for example `7, 3, 1`), an on/off switch,
  and the default shown underneath. **Back to defaults** puts everything back.
- **Defaults** (used until someone changes them, same as before):
  invoice due 7, 3, 1 days before; invoice overdue 1, 7, 14, 30 days after; contract ending 90, 30, 7;
  service renewal 30, 15, 7; task deadline 2; milestone 7; tender 7, 2; document expiry 30, 7; warranty
  30, 7; quotation expiring 3.
- **Rules:** whole numbers from 0 up to 60 (365 for contracts, renewals, documents, warranties and overdue
  invoices). Changes are written to the audit trail.
- **Technical:** settings in the `settings` table under the key `reminders` (no migration).
  New `backend/src/lib/reminderSettings.ts`; `generateReminders()` reads it. `GET/PUT /api/settings/reminders`
  (admins). Reminders are still created when the bell is opened and stay in-app.

### Email & SMS page ready for production (5 Nov)
- **"Send a test" card removed** from Settings → Email & SMS. Connection checks are no longer part of the page;
  the message log shows every real message and its result. The test endpoint is still there but unused.
- **Delivery switch:** the Test / Live radio buttons are now one switch, **Send to all recipients**. When it is off
  (restricted delivery), only the addresses in **Allowed recipients** receive messages and the rest are held;
  that box is only shown while it is off. The badge at the top says "Live delivery" or "Restricted delivery".
  Turning it on asks for confirmation. Nothing changed on the server.
- **Who can do what:** a short table on the page lists what each role can do with email: admins (Super Admin and
  Admin (HR)) manage this page, portal logins, reminders and sending; Finance Manager sends payment reminders and
  creates supplier logins; Sales Manager creates customer logins; all staff receive their own notifications;
  customers and suppliers receive updates about their own records.
- **Note:** the local frontend (`frontend/.env` → `VITE_API_URL`) talks to the live backend on Render, so its
  Email & SMS page shows the live connection (Brevo), not your local `.env`.

### Cleaner Email & SMS page; Gmail app passwords with spaces (5 Nov)
- **Email & SMS page:** removed the guidance text: the blue "nothing is connected" box, the "How to connect"
  section and the grey notes under each option. What is left is the three channel cards, test or live mode
  with the test list and the two email switches, "Send a test" and the message log. The setup steps
  are in `backend/.env.example` and SETUP.md.
- **Gmail:** Google shows an app password as `abcd efgh ijkl mnop`. The spaces are now ignored, so it
  works pasted either way.
- **Technical:** `frontend/src/pages/settings/MessagingPage.tsx`; `smtpTransport()` in `backend/src/lib/messaging.ts`.

### Email, SMS and WhatsApp — ready to switch on (2 Nov)
- **What:** the system can now send email, SMS and WhatsApp. It needs only the provider keys in the
  backend settings; nothing else changes. Without keys it works exactly as before, and each message it
  would have sent is recorded in the message log as "Not set up".
- **Where to see it:** Settings → **Email & SMS** (admins). It shows:
  - which channels are connected (provider and sender address, never the keys);
  - who receives messages: test mode or live, the test list, and the two email switches;
  - "Send a test";
  - "How to connect", step by step;
  - the **message log**: every message, sent or not, with filters and the reason when one failed.
- **Test mode, on by default:**
  - Only the emails and phone numbers on the test list receive anything. Every other message is
    **held**: listed in the log, not sent.
  - This stops demo data (staff `@santech.rw` addresses, client company emails) from reaching real
    people.
  - Switching to Live asks for confirmation first.
- **What gets sent:**
  - **Staff notifications by email.** Every new in-app notification is also emailed to the person:
    ticket assigned, approvals, expense claims, leave, quotation accepted, and so on. The email has a
    button to the page. It can be switched off.
  - **Daily reminders stay in-app only.** These are due invoices, deadlines and renewals; they are
    made when the bell is opened, so emailing them would mean odd timing and repeats.
  - **Portal updates by email to customers and suppliers:** new quotation, invoice, proforma or credit
    note, contract active, document shared, ticket reply, purchase order. This can also be switched off.
  - **Portal logins:** when a customer or supplier login is created, or its password is reset, the
    sign-in details are emailed to them. A tick box allows turning this off for one login.
  - **Payment reminders:** a new **Remind client** button on unpaid invoices (Finance → Invoices) sends
    by email, SMS or WhatsApp to the client's contact. It is filled in from the client's details and
    can be edited. When it is sent, it is also added to the client's communication history.
  - **Communication log:** an outgoing Email, SMS or WhatsApp entry has a **"Send it now"** box, with the
    client's email or phone filled in. The message really goes out and is only logged if it was sent.
    Email replies go to the staff member who wrote it.
- **Providers:**
  - Email through **Brevo** (recommended; free for 300 a day; works on Render) or any **SMTP** server
    such as Gmail with an app password. Render's free plan blocks SMTP, so SMTP is for local use.
  - SMS and WhatsApp through **Twilio**.
  - Rwandan numbers written as `07…` become `+2507…`.
- **Technical:**
  - New table `message_logs` (migration `20261102100000_message_log`).
  - New `backend/src/lib/messaging.ts` holds the providers, test mode, the email layout and `deliver()`,
    which never throws.
  - New `messagingController.ts` serves the settings, test and log endpoints and the invoice reminder.
  - `notify()` emails new notifications in the background, so requests never wait for it. The reminder
    engine passes `email: false`.
  - New endpoints:
    - `GET/PUT /api/settings/messaging`
    - `POST /api/settings/messaging/test`
    - `GET /api/settings/messaging/log`
    - `POST /api/finance/invoices/:id/remind`
  - `POST /api/communications` accepts `send` and `to`.
  - Portal login endpoints accept `sendEmail`.
  - The client dropdown data now includes the contact email and phone.
  - The settings are stored in the `settings` table under the key `messaging`.
  - `.env.example` lists every key with where to get it.
- **Tested** with local stand-ins for Brevo, Twilio and an SMTP server: 51 API checks (sent, held,
  failed, not set up, test mode, live mode, permissions, no keys in any response) and 18 browser checks.

## 1.6.0 — 2 November 2026

### Roles table fits the screen; Company Profile and My Profile back as before (2 Nov)
- **Roles & Permissions:** the "Who can open what" table no longer needs a sideways scroll on laptop
  screens. The role columns share the width evenly, and long role names wrap onto two lines when space is
  short. The whole table is visible on screens 1024px wide and up (checked at 1024, 1280, 1366, 1440,
  1536 and 1920). Only on phones does it still scroll sideways, inside its own card.
- **Company Profile and My Profile:** returned to their earlier layout. Only the Roles & Permissions page
  was meant to change, so the two-column versions in the entry below are undone.
- **Technical:** the table uses a fixed layout (`table-fixed`, module column 170–220px) instead of a minimum
  width per column.

### Roles & Permissions, Company Profile and My Profile use the full width (2 Nov)
- **Why:** these three pages were held to a narrow column, leaving a large empty space on the right.
- **Roles & Permissions** (Settings → Roles & Permissions):
  - The 10 roles are cards: 5 per row on wide screens, 2 per row on phones. Each card shows what the role
    is for, how many modules it opens and how many active users have it. A "You" tag marks your role.
  - Below the cards, a **"Who can open what"** table: one row per module (with what it contains) and one
    column per role, with a tick or a dash. Portals are a separate group, and the last row counts the
    modules per role.
  - Clicking a role card (or a column heading) highlights that role's column.
  - On phones the table scrolls sideways inside its card, and the module names stay pinned on the left.
  - Customer and Supplier columns show no user count, because portal logins are managed per client and
    per supplier, not in User Management.
- **Company Profile:** two columns. Identity and contact details are on the left, location and the company
  description on the right. The currencies card is below, full width, so all six rates sit in one row.
  On phones it is one column, as before.
- **My Profile:**
  - Personal details and Change password sit side by side.
  - The top card adds **"What you can open"**: the modules your role gives you, with a link to all roles
    for admins.
- **Technical:**
  - New `frontend/src/lib/roles.ts` holds the module list (`MODULES`) and `roleCanOpen()`, built on the same
    `roleAccess` rules as the sidebar. The Roles page and My Profile both use it, so the page can never
    differ from what the app enforces.
  - No access rules changed.
  - The Roles page no longer has its own copy of each role's modules.

### Card borders back to light blue, a little stronger (2 Nov)
- **What:** the navy border was too heavy. Cards are back to a light-blue 2px border, slightly deeper than
  the first version (`#b8c6e0` instead of `#cfd8ea`), with a soft shadow on every card and tile, so the
  grids still stand out.
- **Also:** hovering a pipeline deal card highlights its border again.
- **Technical:** `--card-border` and `--card-shadow` in `frontend/src/index.css`.

### Santech logo everywhere (2 Nov)
- **What:** the Santech logo replaces the placeholder icons and letters:
  - the sidebar (was a building icon) and the login page (was "ST");
  - the customer and supplier portal header (was "S");
  - the top bar on phones, the browser-tab icon (was a missing `logo.svg`) and the phone home-screen icon;
  - the top of every PDF.
- **Where each version is used:**
  - The full logo with the tagline is above the sign-in form and on PDFs.
  - On the navy sidebar, panel and header, the blue "S" mark sits on a white tile, because the navy
    "SAN" lettering would not show on navy.
- **File fix:** the uploaded `santech_logo.png` was really an AVIF image with a `.png` name, which PDFs, the tab
  icon and older phones may not show. It was converted to a real PNG (300×261, transparent background).
  The "S" mark, favicon and home-screen icon were made from it.
- **Checked** in a real browser: the login page, sidebar, phone top bar, customer portal, a printed invoice
  and the tab icon; every logo image loads.

### Card borders in the sidebar's navy (2 Nov)
- **What:** the 2px card border is now the sidebar's navy blue (`#0b1f44`) instead of light blue-grey, on every
  card and grid tile, the pipeline deal cards and the loading placeholders.
- **Technical:** all of them use the one setting `--card-border` in `frontend/src/index.css`.
- **Small change:** hovering a deal card no longer changes its border colour; its shadow still grows.

### Thicker card borders on every page (2 Nov)
- **What:** every card and grid tile now has a 2px border in a slightly stronger blue-grey (`#cfd8ea`).
  Before, it was 1.5px `#dde3f0`. This applies to every page through the shared card styles
  (`.bms-card`, used 154 times, and `.kpi-card`, used 48 times).
- **Also changed:** the deal cards on the Sales Pipeline and the loading placeholders.
- **Technical:** one setting, `--card-border` in `frontend/src/index.css`.

### Features linked together (2 Nov)
Records that belong together are now linked in the database, instead of matched by typed names. This
follows the requirement to "build a shared data model so every department works from the same records".
- **Deal ↔ quotation ↔ contract:**
  - A quotation picks its deal from the pipeline (not typed text).
  - Accepting the quotation (staff or client portal) marks the deal Won.
  - Converting it links the contract to the deal.
  - Deal cards and the deal panel show their quotations and contract.
  - The deal panel has **Create quotation for this deal**.
- **Lost deals need a reason** (quick choices or your own words); the reason shows on the deal.
- **Quotation lines from the product catalogue** (price converted to the quotation's currency); each line
  remembers its product.
- **Leads ↔ campaigns:**
  - A lead names the campaign that brought it.
  - Each campaign counts its leads, the clients they became and the deals won ("From the CRM").
  - A converted lead stays linked to its client and deal.
- **Employees ↔ departments:**
  - The department is picked from Team → Departments (Employees and Settings → Users no longer have
    their own fixed list, which was missing Projects and Executive).
  - Department counts come through the link, and renaming a department follows on its employees.
- **Support tickets ↔ projects:**
  - A ticket can name the client's project / system (staff and customer portal), with its warranty shown.
  - Another client's project is refused.
- **Visitors ↔ clients:** Reception can pick the visitor's client. The visit shows on the client's 360° page,
  which now also shows where the client came from (lead and campaign).
- **Finance links enforced:**
  - The expenses booked from expense claims and purchases, and the income from training fees, are real
    links.
  - So are the deal's contract and the lead's client and deal.
- **Fix:** registering a visitor with an unknown purpose now gives a clear message instead of a server error.
- **Technical:**
  - Migration `20261030400000_link_features`:
    - new links `quotations.opportunityId`, `leads.campaignId`, `employees.departmentId`,
      `support_tickets.projectId`, `visitors.clientId`;
    - existing IDs turned into enforced links;
    - IDs pointing to deleted records are cleared first;
    - exact matches are filled in (a quotation's deal by name, a deal's contract through its quotation,
      an employee's department by name).
  - Every link uses "set empty on delete", so deleting a record never deletes other data.
  - `prisma/seeds/relationships.ts` fills the links that need a judgement call (lead → campaign of the same
    kind running at the time, visitor → client by name, ticket → the client's only project or the one
    named after the product) and reports what stays unlinked. It is safe to run again.
  - New `backend/src/lib/links.ts`.
  - The lookups API adds deals (sales, finance and admins only), departments, campaigns and products.
- **Tested** on a local copy of the database:
  - 36 API checks: links saved and refused across clients, deal won on acceptance, contract linked on
    conversion, campaign counts, departments, tickets, visitors;
  - 15 checks in a real (headless) Edge browser, including the 2px borders.

## 1.5.0 — 30 October 2026

### Imigongo shows faintly again (30 Oct)
- The `#f4f6fa` layer is now 85% instead of solid: the colour still leads on every page, and the Imigongo
  pattern shows faintly through it around the cards. Checked on the dashboard, Invoices and the portal.

### Background layer now solid on every page (30 Oct)
- The `#f4f6fa` layer is now **solid**: every page (dashboard and all features, portals, login) has the
  same flat light grey-blue behind the cards, like the portals had. At 60% see-through, the Imigongo still
  showed clearly through it, so the colour was hard to see. Checked on the dashboard, Invoices and the
  customer portal.

### Same background layer on every page (30 Oct)
- **What:** the light grey-blue of the portals (`#f4f6fa`) is now the layer between the Imigongo pattern
  and the cards on every screen: staff pages, the customer and supplier portals, and the login page.
- **How it looks:**
  - The layer is 60% see-through, so the pattern still shows softly behind it.
  - Before, staff pages used a bluer layer, and the portals and login covered the pattern completely.
- **Technical:** one CSS variable `--page-layer` and class `.page-layer` in `frontend/src/index.css`,
  used by `main`, `PortalShell` and `LoginPage`.
- **Checked** in a real browser on the login page, customer portal, supplier portal and a staff page.


### Customer portal and supplier portal (30 Oct)
Last part of the features still missing from the specification (email and SMS wait for the Brevo and
Twilio accounts).

- **Customer portal** (`/portal`, CUSTOMER logins, one client each):
  - Overview of what needs attention and the account manager's contact, latest updates.
  - Quotations: view lines/totals, PDF, **Accept** or **Decline** (with reason); opening marks it Viewed;
    expired ones cannot be accepted; sales is notified.
  - Invoices, proforma invoices and credit notes (never drafts) with what is still to pay and PDFs.
  - Contracts (from signing onwards) with the signed file; projects with progress and milestones (no
    budget); shared documents.
  - Support: open tickets, follow them, rate the help, reopen a resolved one.
  - Account: name, phone, password.
  - The client is notified when Santech sends a quotation, an invoice / proforma / credit note, shares a
    document, activates a contract or updates a ticket.
- **Supplier portal** (`/supplier`, SUPPLIER logins, one supplier each):
  - Purchase orders placed with them: confirm with a delivery date, mark dispatched, send the invoice
    (file + amount). Procurement / Finance and the requester are notified at each step.
- **Procurement:**
  - New **Suppliers** list (tab on the Procurement page) with portal access per supplier.
  - Requests use a supplier from the list (or a name).
  - **Place order** needs a supplier and gives a PO number (`PO-2026-001`); the supplier is told when an
    order is placed, received or cancelled.
  - The request panel shows the supplier's confirmation, dispatch and invoice.
- **Portal logins** are created from the client's 360° page (Super Admin, Admin, Sales Manager) and from
  Procurement → Suppliers (Finance, admins):
  - A temporary password is shown once with the sign-in address.
  - Reset password, disable / enable. A disabled login is refused straight away.
- **Documents:** *Share with the client in the customer portal* option for documents linked to a client.
- **Security:**
  - Portal logins reach only `/api/portal` (or `/api/supplier-portal`), their own account,
    notifications, the company profile and the files shared with them. Every staff endpoint answers 403.
  - Every portal request re-checks that the login is active and linked.
  - Portal logins are kept out of Settings → Users, staff pickers and search, and cannot be created
    there.
- **Login:** customer and supplier logins land in their portal; staff addresses send them back to it.
  The login page lists the two demo portal accounts.
- **Technical:**
  - Migration `20261030300000_customer_and_supplier_portals`, additive:
    - role `SUPPLIER`;
    - `users.clientId` / `supplierId`;
    - table `suppliers`;
    - purchase `supplierId`, `poNumber`, `orderedAt`, `supplierStatus`, `expectedDelivery`,
      `supplierNote`, supplier invoice fields;
    - `documents.sharedWithClient`.
  - New files:
    - backend `lib/portal.ts`, `controllers/portalController.ts`, `supplierPortalController.ts`,
      `portalAdminController.ts`, `routes/portal.ts`;
    - frontend `pages/portal/*`, `components/shared/PortalLogins.tsx`.
  - Access check added to `middleware/auth.ts`; file downloads check portal access.
- **Demo data** (`prisma/seeds/portals.ts`, safe to run again):
  - six suppliers made from the names already on purchase requests;
  - PO numbers on placed orders;
  - portal logins `customer@santech.rw` (N&T PLASTIC) and `supplier@santech.rw` (TechHub Kigali),
    password `Santech@2026`;
  - three N&T documents shared with the client.
- **Tested** against a local copy of the database:
  - 75 API checks, including every staff endpoint refused to portal logins, other clients' and
    suppliers' records and files refused, notifications, logins and PO numbers;
  - 28 checks in a real (headless) Edge browser: login → portal, accepting a quotation, invoices and
    PDFs, a ticket, a download, the supplier confirming / dispatching / invoicing an order, the staff
    screens, and the customer portal at phone width.

## 1.4.0 — 30 October 2026

### Proforma invoices, credit notes, recurring invoices, currencies, version history (30 Oct)
Second batch of the features still missing from the specification (billing and finance).

- **Proforma invoices** (Finance → Invoices → **+ Proforma**, numbered `PF-2026-001`):
  - For an advance or a price confirmation before an order. Never paid itself and not counted as owed.
  - **Convert to invoice** creates the real invoice with the same amounts and currency (marked Sent)
    and links the two both ways. Converting twice, paying a proforma or cancelling a converted one is
    refused.
- **Credit notes** (`CN-2026-001`) from a sent invoice → **Issue credit note** with amount and reason:
  - Lower what the client still owes; VAT is credited in the same proportion; never more than the
    balance.
  - Paid + credited in full → Paid; fully credited with nothing paid → Cancelled.
  - Listed on the invoice and on their own tab; printed as *CREDIT NOTE*.
- **Recurring invoices** for client services (hosting, domains, maintenance):
  - A draft invoice for the next period is raised 14 days before renewal (or at once when overdue),
    once per service and period; Finance is notified to check and send it.
  - Runs when the server starts, every 6 hours, when Finance opens Invoices or Client Services, and
    from **Raise service invoices**. Each service has *Raise the invoice automatically* (on by default).
  - Paying that invoice in full marks the service period paid. *Mark Paid* on an invoiced period is
    refused with the invoice number, so nothing is booked twice.
- **Multiple currencies:** RWF, USD, EUR, GBP, KES, UGX, TZS.
  - Exchange rates (RWF for 1 unit) in **Finance → Currencies** and Settings → Company Profile;
    Finance and admins edit them, with an Audit Trail entry.
  - Quotations, contracts, invoices, proformas, client services, income and expenses can be in any of
    them. Each document keeps the rate of its day; a payment is booked in RWF at the payment day's rate
    and keeps the original amount (*USD 500 at 1,450*).
  - Dashboard, P&L, reports, statements, Client 360° and page totals are in RWF, and count only real
    invoices (not proformas or credit notes), net of credits.
  - Milestone invoices use the contract's currency; converting a quotation keeps its currency and rate.
- **Version history for contracts and quotations:**
  - Changing the terms (contract: value, currency, dates, payment terms, deliverables, client, project
    name; quotation: items, prices, discount, VAT, currency, validity, terms, notes) keeps the earlier
    version with what changed and who changed it; the version number goes up.
  - Shown in the contract and quotation panels (expand a version to see *old → new*). Saving without
    changes or changing only the status does not create a version.
- **Technical:**
  - Migration `20261030200000_proforma_credit_notes_recurring_currencies_versions`, additive only:
    - `invoices.type`, `creditedAmount`, `exchangeRate`, `creditForId`, `proformaId`,
      `subscriptionId`, `periodStart`, `periodEnd`;
    - `exchangeRate` + `version` on contracts and quotations;
    - `currency` + `autoInvoice` on client services;
    - `originalAmount` / `originalCurrency` / `exchangeRate` on income and expenses;
    - new table `record_versions`.
  - New files:
    - `lib/currency.ts`, `lib/versions.ts`, `lib/recurring.ts`;
    - `controllers/billingController.ts`;
    - frontend `lib/currency.ts`, `components/shared/VersionHistory.tsx`,
      `components/shared/ExchangeRatesCard.tsx`.
  - API:
    - `POST /api/finance/invoices/:id/credit-note`, `POST /api/finance/invoices/:id/convert`;
    - `POST /api/finance/invoices/raise-recurring`;
    - `GET/PUT /api/settings/exchange-rates`;
    - `GET /api/versions/:contract|quotation/:id`;
    - `GET /api/finance/invoices?type=`.
- **Demo data** (`prisma/seeds/billingExtras.ts`, safe to run again):
  - a USD proforma for ECOBANK and a proforma already converted into an invoice;
  - credit note CN-2026-001 on INV-2026-004;
  - a monthly hosting service billed in USD (its invoice is raised automatically);
  - an AWS bill paid in USD;
  - the exchange rates;
  - earlier versions of CT-2026-002 and QT-2026-001.
- **Tested** against a local copy of the database:
  - 52 API checks: rules for each document type, balances, currency conversion, recurring runs,
    versions, permissions;
  - 25 checks in a real (headless) Edge browser: proforma → invoice → credit note through the screens,
    the PDFs, rates, version history, client services, and the Invoices page at phone width.

## 1.3.0 — 30 October 2026

### Expense claims, discounts, support times, document expiry and versions, warranties (30 Oct)
First batch of the features still missing from the specification.

- **Expense claims** — new page **Team → Expense Claims**, open to every staff role:
  - Claim money spent for the company: description, category (Transport, Equipment, Internet,
    Marketing, Other), amount, date, notes and a receipt (photo or PDF, up to 5 MB).
  - Approvals: Employee → Manager (Admin, Project, Sales, Marketing or Finance Manager) → Finance
    (Finance Manager or Admin). The Finance approval books the claim as a Finance expense.
  - Nobody approves their own claim; the Finance approval must come from a different person than the
    manager approval. Rejecting needs a reason.
  - Each step notifies the next approvers and the employee, and is written to the Audit Trail.
  - Progress shown in the table (Submitted → Manager → Finance), full approval trail in **View**,
    **Waiting for me** filter for approvers, CSV export.
- **Quotation discount:**
  - **Discount (%)** field next to the VAT rate in the quotation builder.
  - It is taken off the subtotal before VAT: subtotal − discount + VAT = total.
  - Shown in the live preview, the quotation panel, the PDF and Client 360°.
  - Changing only the discount or the VAT rate recalculates the totals on the server.
- **Support tickets:**
  - The first response is recorded when work starts, the resolution time when the ticket is resolved
    or closed. Both show in the ticket panel.
  - Once resolved, record the customer's rating (1–5 stars) and comment.
  - New stats: average first response, average resolution time, average satisfaction.
  - Fix: clients without a company name (individuals, teams, delegations) now show their name in the
    Client column; it was blank.
- **Documents:**
  - Optional **expiry / review date**, with *Expires in N days* / *Expired* labels.
  - New automatic folder **Expiring soon** (within 30 days or past).
  - **Version history:** replacing a file keeps the old one as an earlier version, listed in
    **Details** with a download button. Deleting a document removes its versions' files too.
- **Projects:** optional **Warranty ends** date (free support after delivery), shown in the project panel
  as Active / Ends in N days / Ended.
- **Automation:**
  - **Contract → project:** when a contract becomes Active and has no project, a project is created
    (Planning) from the contract's client, value and dates, with the contract's responsible manager as
    project manager. The manager is notified.
  - **New reminders:**
    - milestones due within 7 days or late (project managers);
    - sent quotations expiring within 3 days (salesperson and Sales Manager);
    - documents expiring within 30 days (admins);
    - warranties ending within 30 days (project managers).
- **Technical:**
  - Migration `20261030100000_discounts_support_times_expense_claims_doc_versions_warranty`.
    It is additive only:
    - `quotations.discountRate` / `discountAmount`;
    - `support_tickets.firstResponseAt` / `satisfaction` / `satisfactionNote`;
    - `documents.expiryDate` / `version`;
    - `projects.warrantyEndDate`;
    - new tables `document_versions` and `expense_claims`.
  - API:
    - `GET/POST /api/expense-claims`, `POST /api/expense-claims/:id/approve`, `POST …/reject`
      (`controllers/expenseClaimsController.ts`);
    - `GET /api/documents/:id/versions`;
    - `GET /api/documents?expiring=1`.
  - Claim numbers use the shared numbering: `EXP-2026-001`, …
- **Demo data** (`prisma/seeds/claimsExpiryWarranty.ts`, safe to run again):
  - four claims, one at each step;
  - expiry dates on four documents;
  - an earlier version of the ECOBANK proposal;
  - response times and ratings on support tickets;
  - warranty dates on three projects.
- **Tested** against a local copy of the database:
  - 48 API checks: approval rules, totals, times, versions, file clean-up, reminders, automation;
  - 28 checks in a real (headless) Edge browser, including the full claim flow as Employee → Project
    Manager → Finance Manager, and the page at phone width.

## 1.2.0 — 29 October 2026

### Buttons that did nothing now work (30 Oct)
- **Top-bar search:**
  - Type at least 2 letters to search clients, leads, quotations, contracts, invoices, projects, tasks,
    documents and staff. It only searches the areas your role can open.
  - Use ↑ ↓ and Enter, or click a result. Clients open their Client 360°; the other results open their
    list already filtered to that item.
- **My Profile** (from the profile menu, top right):
  - Change your name and phone.
  - **Change password** needs your current password and at least 8 characters.
  - Both are written to the Audit Trail. Email and role stay with the admin.
- **Export buttons** download what is on screen, filters applied, as a CSV file that opens in Excel:
  Field Visits, Finance Income, Finance Expenses, Audit Trail.
- **Meetings → ✏️ Edit:** opens the meeting with all its details filled in (type, client, time, place or
  online link, participants, agenda, notes, follow-up) and saves the changes.
- **Field Visits → View:** shows the visit's details (contact, outcome, what Santech can sell, needs,
  follow-up, amount, who recorded it).
- **Client 360° → Edit:** opens that client's edit form on the Customers page.
- **Customer form → Attach Document:** the file is now really uploaded and filed in Documents under that
  client (before, only its name was kept). It also shows on the client's 360° page.
- **Salary:** the department filter lists the real departments (it was a fixed list).
- **Technical:**
  - `GET /api/search` (`routes/search.ts`, role-aware);
  - `PUT /api/auth/me`; checks and audit on `PUT /api/auth/change-password`;
  - full meeting edit in `updateMeeting`;
  - `lib/exportCsv.ts`, `lib/useSearchFromUrl.ts`, `pages/profile/ProfilePage.tsx`.
- **Tested:** 28 checks in a real (headless) Edge browser against a local copy of the database, plus a
  role check of the search (Admin, Finance, Sales Staff and Employee each only see their own areas).

### Salary: grid and list layouts (30 Oct)
- **What:** The Salary page has the same list/grid switch as Documents (styled like Google Drive's).
  - **List:** the payroll table, as before.
  - **Grid:** one card per employee, showing:
    - net salary for the month (and the payment date once paid);
    - base, bonuses and deductions;
    - performance bar;
    - Paid / Unpaid;
    - the same buttons (Mark Paid, + Bonus, Promote).
  - The page remembers the chosen layout in this browser.
- **Where:** Team → Salary, at the right of the filter bar.
- **Rules:** unchanged. Amounts only reach HR and finance roles; Promote is Super Admin only.
- **Technical:** new shared `components/shared/ViewToggle.tsx` (`ViewToggle` + `useViewMode(page)`),
  now used by both Salary and Documents. Frontend only.
- **Tested:** type check, and screenshots of both layouts in Edge on a local copy.

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
- **Status:** **applied to the live database on 30 Oct 2026**, after a fresh backup
  (`backups/neon-2026-10-30-before-cleanup.dump`). It was first rehearsed on a full copy of the live
  database, where all checks passed and re-running the seed added nothing. After the run, the live
  database has no duplicates in any table, and 23 page/API checks passed against the live API.
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
