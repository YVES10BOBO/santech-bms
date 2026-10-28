/**
 * Demo data for Finance, Payroll, Contracts, Milestones and the Audit Trail.
 * This is the data the pages used to keep as hardcoded mock arrays.
 *
 * Safe to run on every deploy:
 *  - rows have fixed ids and are only created when missing
 *  - existing rows are only "filled in" when a field is still empty,
 *    so anything changed during a demo is never overwritten.
 */
import { PrismaClient, Prisma } from '@prisma/client'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const d = (s: string) => new Date(`${s}T00:00:00.000Z`)

function guessIncomeCategory(text: string | null | undefined): string {
  const t = (text ?? '').toUpperCase()
  if (t.includes('SANTRACK')) return 'SANTRACK'
  if (t.includes('EVS')) return 'EVS'
  if (t.includes('WEBSITE')) return 'Website'
  if (t.includes('TRAINING')) return 'Training'
  if (t.includes('MAINTENANCE') || t.includes('HOSTING')) return 'Maintenance'
  return 'Software Dev'
}

export async function seedFinanceAndWorkflows(prisma: PrismaClient) {
  const byEmail = async (email: string) => (await prisma.user.findUnique({ where: { email } }))!
  const admin = await byEmail('admin@santech.rw')
  const alice = await byEmail('alice@santech.rw')
  const bob = await byEmail('bob@santech.rw')
  const claire = await byEmail('claire@santech.rw')
  const david = await byEmail('david@santech.rw')
  const usersByLabel: Record<string, string> = { Admin: admin.id, Alice: alice.id, Bob: bob.id, HR: claire.id, IT: admin.id, Sales: alice.id, Operations: admin.id }

  const clientId = async (name: string) =>
    (await prisma.client.findFirst({ where: { companyName: { startsWith: name, mode: 'insensitive' } }, orderBy: { createdAt: 'asc' } }))?.id ?? null

  // ── 1. INVOICES: link seeded invoices to their projects ────────────────────
  const invoiceProject: Record<string, string> = {
    'INV-2026-001': 'proj-santrack', 'INV-2026-002': 'proj-santrack', 'INV-2026-003': 'proj-website',
    'INV-2026-004': 'proj-stock', 'INV-2026-006': 'proj-evs-sabban',
  }
  for (const [invoiceNumber, projectId] of Object.entries(invoiceProject)) {
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } })
    if (project) await prisma.invoice.updateMany({ where: { invoiceNumber, projectId: null }, data: { projectId } })
  }

  // ── 2. INCOME: every invoice payment becomes an income entry ───────────────
  const payments = await prisma.payment.findMany({
    where: { incomeEntry: null },
    include: { invoice: { include: { client: true, contract: true, project: true } } },
  })
  for (const p of payments) {
    const label = p.invoice.project?.name ?? p.invoice.contract?.projectName
    await prisma.incomeEntry.create({
      data: {
        date: p.paymentDate, amount: p.amount, currency: p.currency,
        description: `Payment for ${p.invoice.invoiceNumber}${label ? ` — ${label}` : ''}`,
        category: guessIncomeCategory(label),
        clientId: p.invoice.clientId, clientName: p.invoice.client.companyName,
        paymentId: p.id, recordedById: david.id,
      },
    })
  }

  // Direct income from the old Finance page mock (October 2026)
  const octIncome = [
    { id: 'inc-2026-10-01', date: '2026-10-03', desc: 'SANTRACK license payment',    cat: 'SANTRACK',     amount: 3000000, client: 'East African Seed Ltd',    by: 'Admin' },
    { id: 'inc-2026-10-02', date: '2026-10-05', desc: 'EVS installation Phase 1',    cat: 'EVS',          amount: 5000000, client: 'SABBAN ABATTOIR',          by: 'Admin' },
    { id: 'inc-2026-10-03', date: '2026-10-08', desc: 'Website final payment',       cat: 'Website',      amount: 800000,  client: 'Rwanda Mountain Ride',     by: 'Admin' },
    { id: 'inc-2026-10-04', date: '2026-10-10', desc: 'Custom software milestone 1', cat: 'Software Dev', amount: 2500000, client: 'Capital Transport Agency', by: 'Alice' },
    { id: 'inc-2026-10-05', date: '2026-10-14', desc: 'Staff training session',      cat: 'Training',     amount: 600000,  client: 'N&T PLASTIC INDUSTRIES',   by: 'Bob' },
    { id: 'inc-2026-10-06', date: '2026-10-18', desc: 'EVS maintenance contract',    cat: 'Maintenance',  amount: 1200000, client: 'NYARUGENGE HOSPITAL',      by: 'Admin' },
    { id: 'inc-2026-10-07', date: '2026-10-22', desc: 'Custom software milestone 2', cat: 'Software Dev', amount: 2000000, client: 'Capital Transport Agency', by: 'Alice' },
    { id: 'inc-2026-10-08', date: '2026-10-28', desc: 'EVS expansion modules',       cat: 'EVS',          amount: 3500000, client: 'ECOBANK Rwanda',           by: 'Admin' },
  ]
  // History so the 6-month charts have data (April – September 2026)
  const history: Array<[string, string, string, number, string]> = [
    // [month, desc, category, amount, client]
    ['2026-04', 'EVS deployment — phase 2', 'EVS', 3500000, 'NYARUGENGE HOSPITAL'],
    ['2026-04', 'SANTRACK annual license', 'SANTRACK', 1800000, 'N&T PLASTIC INDUSTRIES'],
    ['2026-04', 'Website redesign', 'Website', 1200000, 'Rwanda Mountain Ride'],
    ['2026-05', 'EVS installation', 'EVS', 4200000, 'ECOBANK Rwanda'],
    ['2026-05', 'Custom HR module', 'Software Dev', 2600000, 'Capital Transport Agency'],
    ['2026-05', 'SANHUB training cohort', 'Training', 1200000, 'KABUYE SUGAR WORKS'],
    ['2026-06', 'SANTRACK implementation — phase 1', 'SANTRACK', 4500000, 'East African Seed Ltd'],
    ['2026-06', 'EVS maintenance Q2', 'Maintenance', 2300000, 'NYARUGENGE HOSPITAL'],
    ['2026-06', 'Mobile app prototype', 'Software Dev', 2200000, 'Serena Hotel'],
    ['2026-07', 'Website build — deposit', 'Website', 1500000, 'Rwanda Mountain Ride'],
    ['2026-07', 'EVS visitor kiosks', 'EVS', 3700000, 'SABBAN ABATTOIR'],
    ['2026-07', 'Hosting & support renewals', 'Maintenance', 1800000, 'GAMICO LTD'],
    ['2026-08', 'SANTRACK stock module', 'SANTRACK', 5000000, 'N&T PLASTIC INDUSTRIES'],
    ['2026-08', 'EVS installation — head office', 'EVS', 4800000, 'ECOBANK Rwanda'],
    ['2026-08', 'Staff IT training', 'Training', 2200000, 'East African Seed Ltd'],
    ['2026-09', 'Custom driver system — milestone 0', 'Software Dev', 4000000, 'Capital Transport Agency'],
    ['2026-09', 'EVS maintenance Q3', 'Maintenance', 2600000, 'NYARUGENGE HOSPITAL'],
    ['2026-09', 'SANTRACK training & setup', 'SANTRACK', 2600000, 'KABUYE SUGAR WORKS'],
  ]
  const incomeRows = [
    ...octIncome,
    ...history.map(([m, desc, cat, amount, client], i) => ({
      id: `inc-${m}-h${i}`, date: `${m}-${String(5 + (i % 3) * 8).padStart(2, '0')}`, desc, cat, amount, client, by: i % 2 ? 'Alice' : 'Admin',
    })),
  ]
  for (const r of incomeRows) {
    const cid = await clientId(r.client.replace(' Rwanda', ''))
    await prisma.incomeEntry.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, date: d(r.date), description: r.desc, category: r.cat, amount: r.amount,
        clientId: cid, clientName: r.client, recordedById: usersByLabel[r.by] ?? admin.id,
      },
    })
  }
  console.log('✅ Income entries seeded')

  // ── 3. PAYROLL: history Apr–Sep (paid) + October from the Salary page mock ──
  const employees = await prisma.employee.findMany({ include: { user: true } })
  for (let month = 4; month <= 9; month++) {
    await prisma.salaryRecord.createMany({
      data: employees.map(e => ({
        employeeId: e.id, month, year: 2026, baseSalary: e.baseSalary, bonuses: 0, deductions: 0,
        netSalary: e.baseSalary, currency: e.currency, isPaid: true,
        paidAt: new Date(Date.UTC(2026, month - 1, 28)), notes: `Payroll ${MONTHS[month - 1]} 2026`,
      })),
      skipDuplicates: true,
    })
  }
  // October 2026: bonuses / deductions / paid status as shown on the old mock page.
  // Only applied once (when the record has no notes yet).
  const octPayroll: Record<string, { bonuses: number; deductions: number; isPaid: boolean; perf: number }> = {
    'alice@santech.rw':  { bonuses: 50000, deductions: 15000, isPaid: false, perf: 82 },
    'bob@santech.rw':    { bonuses: 75000, deductions: 20000, isPaid: true,  perf: 91 },
    'claire@santech.rw': { bonuses: 0,     deductions: 10000, isPaid: false, perf: 78 },
    'david@santech.rw':  { bonuses: 30000, deductions: 10000, isPaid: true,  perf: 65 },
    'frank@santech.rw':  { bonuses: 40000, deductions: 12000, isPaid: false, perf: 88 },
    'eve@santech.rw':    { bonuses: 0,     deductions: 0,     isPaid: false, perf: 74 },
  }
  for (const e of employees) {
    const cfg = octPayroll[e.user.email]
    if (!cfg) continue
    const rec = await prisma.salaryRecord.findUnique({ where: { employeeId_month_year: { employeeId: e.id, month: 10, year: 2026 } } })
    const data = {
      baseSalary: e.baseSalary, bonuses: cfg.bonuses, deductions: cfg.deductions,
      netSalary: e.baseSalary + cfg.bonuses - cfg.deductions, isPaid: cfg.isPaid,
      paidAt: cfg.isPaid ? d('2026-10-05') : null, notes: 'Payroll October 2026',
    }
    if (!rec) await prisma.salaryRecord.create({ data: { employeeId: e.id, month: 10, year: 2026, currency: e.currency, ...data } })
    else if (!rec.notes) {
      await prisma.salaryRecord.update({ where: { id: rec.id }, data })
      if (e.performanceScore === 0) await prisma.employee.update({ where: { id: e.id }, data: { performanceScore: cfg.perf } })
    }
  }
  // Every paid salary is a Salaries expense
  const paidSalaries = await prisma.salaryRecord.findMany({
    where: { isPaid: true, expenseEntry: null },
    include: { employee: { include: { user: true } } },
  })
  for (const s of paidSalaries) {
    await prisma.expenseEntry.create({
      data: {
        date: s.paidAt ?? new Date(Date.UTC(s.year, s.month - 1, 28)),
        description: `Salary — ${s.employee.user.firstName} ${s.employee.user.lastName} (${MONTHS[s.month - 1]} ${s.year})`,
        category: 'Salaries', amount: s.netSalary, currency: s.currency,
        notes: `${s.employee.position}, ${s.employee.department}`,
        salaryRecordId: s.id, recordedById: claire.id,
      },
    })
  }
  console.log('✅ Payroll seeded')

  // ── 4. OTHER EXPENSES (old Finance page mock + monthly history) ────────────
  const octExpenses = [
    { id: 'exp-2026-10-01', date: '2026-10-02', desc: 'Office rent',           cat: 'Rent',      amount: 400000, by: 'Admin',      notes: 'October rent' },
    { id: 'exp-2026-10-02', date: '2026-10-05', desc: 'Internet & utilities',  cat: 'Internet',  amount: 150000, by: 'Admin',      notes: '' },
    { id: 'exp-2026-10-03', date: '2026-10-10', desc: 'Laptop purchase',       cat: 'Equipment', amount: 800000, by: 'IT',         notes: 'Dell laptop for dev team' },
    { id: 'exp-2026-10-04', date: '2026-10-15', desc: 'Marketing materials',   cat: 'Marketing', amount: 300000, by: 'Sales',      notes: 'Brochures and banners' },
    { id: 'exp-2026-10-05', date: '2026-10-20', desc: 'Field visit transport', cat: 'Transport', amount: 200000, by: 'Operations', notes: 'Client site visits' },
  ]
  const monthlyFixed: Array<[string, string, number, string]> = [
    ['Office rent', 'Rent', 400000, 'Monthly rent'],
    ['Internet & utilities', 'Internet', 150000, ''],
    ['Field visit transport', 'Transport', 180000, 'Client site visits'],
  ]
  const extras: Record<string, Array<[string, string, number, string]>> = {
    '2026-04': [['Office chairs', 'Equipment', 450000, 'Meeting room']],
    '2026-05': [['Expo stand — TechForward', 'Marketing', 900000, 'Kigali expo']],
    '2026-06': [['Server upgrade', 'Equipment', 1200000, 'Hosting server RAM + SSD']],
    '2026-07': [['Social media ads', 'Marketing', 350000, 'Facebook & LinkedIn']],
    '2026-08': [['Developer laptops', 'Equipment', 1600000, '2 laptops']],
    '2026-09': [['Software licenses', 'Other', 600000, 'Annual IDE + design tools']],
  }
  const expenseRows = [...octExpenses]
  for (const m of Object.keys(extras)) {
    ;[...monthlyFixed, ...extras[m]].forEach(([desc, cat, amount, notes], i) => {
      expenseRows.push({ id: `exp-${m}-h${i}`, date: `${m}-${String(3 + i * 5).padStart(2, '0')}`, desc, cat, amount, by: 'Admin', notes })
    })
  }
  for (const r of expenseRows) {
    await prisma.expenseEntry.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, date: d(r.date), description: r.desc, category: r.cat, amount: r.amount, notes: r.notes || null, recordedById: usersByLabel[r.by] ?? admin.id },
    })
  }
  console.log('✅ Expenses seeded')

  // ── 5. CONTRACTS: signatories, documents + one contract waiting for approval ─
  const kabuye = await clientId('KABUYE')
  if (kabuye) {
    await prisma.contract.upsert({
      where: { contractNumber: 'CT-2026-006' },
      update: {},
      create: {
        id: 'ct-2026-006', contractNumber: 'CT-2026-006', clientId: kabuye, projectName: 'SANTRACK + EVS — KABUYE SUGAR WORKS',
        value: 5000000, startDate: d('2026-11-15'), endDate: d('2027-05-15'), paymentTerms: '40% on signing, 60% on go-live',
        deliverables: 'SANTRACK stock module\nEVS gate access for 2 gates\nStaff training', status: 'APPROVAL',
        responsibleManagerId: alice.id, notes: 'Security manager confirmed budget. Needs CEO approval before signing.',
      },
    })
  }
  const contracts = await prisma.contract.findMany({ where: { signatories: { equals: Prisma.DbNull } }, include: { client: true } })
  for (const c of contracts) {
    const clientRep = `${c.client.contactPersonName || 'Client representative'} (${c.client.companyName ?? 'Client'})`
    const santech = 'System Admin (Santech Innovate)'
    const signedDate = (c.signedAt ?? c.startDate).toISOString().slice(0, 10)
    let signatories: Array<{ name: string; status: 'PENDING' | 'SIGNED'; signedAt?: string }>
    let signedDocumentName: string | null = null
    if (c.status === 'ACTIVE' || c.status === 'COMPLETED' || c.status === 'RENEWAL') {
      signatories = [{ name: clientRep, status: 'SIGNED', signedAt: signedDate }, { name: santech, status: 'SIGNED', signedAt: signedDate }]
      signedDocumentName = `${c.contractNumber}-signed.pdf`
    } else if (c.status === 'SIGNING') {
      signatories = [{ name: clientRep, status: 'SIGNED', signedAt: '2026-10-20' }, { name: santech, status: 'PENDING' }]
    } else {
      signatories = [{ name: clientRep, status: 'PENDING' }, { name: santech, status: 'PENDING' }]
    }
    await prisma.contract.update({
      where: { id: c.id },
      data: { signatories, ...(signedDocumentName && !c.signedDocumentName ? { signedDocumentName } : {}) },
    })
  }
  console.log('✅ Contract signing data seeded')

  // ── 6. MILESTONES ─────────────────────────────────────────────────────────
  // a) An older seed inserted some milestones 3×. Remove exact copies
  //    (same project + same name), keeping the oldest one.
  const all = await prisma.milestone.findMany({ orderBy: { createdAt: 'asc' } })
  const seen = new Set<string>()
  const dupes: string[] = []
  for (const m of all) {
    const key = `${m.projectId}::${m.name.trim().toLowerCase()}`
    if (seen.has(key) && !m.invoiceId) dupes.push(m.id)
    else seen.add(key)
  }
  if (dupes.length) {
    await prisma.milestone.deleteMany({ where: { id: { in: dupes } } })
    console.log(`🧹 Removed ${dupes.length} duplicate milestones`)
  }

  // b) Number milestones in deadline order (only projects never numbered)
  const projects = await prisma.project.findMany({ include: { milestones: { orderBy: { deadline: 'asc' } } } })
  for (const p of projects) {
    if (p.milestones.length > 1 && p.milestones.every(m => m.milestoneNumber === 1)) {
      for (const [i, m] of p.milestones.entries()) {
        await prisma.milestone.update({ where: { id: m.id }, data: { milestoneNumber: i + 1 } })
      }
    }
  }

  // c) Done milestones with no payment share are simply COMPLETED (nothing to invoice)
  await prisma.milestone.updateMany({ where: { status: 'APPROVED', paymentPercentage: 0, invoiceId: null }, data: { status: 'COMPLETED' } })

  // d) Milestones whose payment was already invoiced
  const alreadyInvoiced: Array<[string, string]> = [['System Setup & Configuration', 'INV-2026-001'], ['Launch & Handover', 'INV-2026-003']]
  for (const [name, invoiceNumber] of alreadyInvoiced) {
    const inv = await prisma.invoice.findUnique({ where: { invoiceNumber }, include: { milestone: true } })
    const ms = await prisma.milestone.findMany({ where: { name, status: 'APPROVED', invoiceId: null }, orderBy: { createdAt: 'asc' } })
    for (const [i, m] of ms.entries()) {
      const link = i === 0 && inv && !inv.milestone ? { invoiceId: inv.id } : {}
      await prisma.milestone.update({ where: { id: m.id }, data: { status: 'INVOICED', ...link } })
    }
  }

  // e) Descriptions + deliverables from the old Milestones page mock (fill once)
  const details: Record<string, { description: string; deliverables: string; status?: 'IN_PROGRESS' }> = {
    'Requirements & Analysis': { description: 'Gather and document all system requirements and produce a full specification.', deliverables: 'Requirements document, system specification' },
    'Development & Installation': { description: 'Develop, install and configure the SANTRACK system at the client site.', deliverables: 'SANTRACK installed and configured', status: 'IN_PROGRESS' },
    'Training & Handover': { description: 'Train end users and formally hand over the system with all documentation.', deliverables: 'Staff trained, system handed over, documentation' },
    'Requirements Analysis': { description: 'Analyse and document the EVS requirements for 90 employees at SABBAN ABATTOIR.', deliverables: 'Full system requirements for 90 employees' },
    'Hardware Installation': { description: 'Procure and install all biometric access control hardware on site.', deliverables: 'Access control terminals installed' },
    'Software Configuration': { description: 'Configure the EVS software with all employee profiles and access rules.', deliverables: 'EVS fully configured for 90 employees' },
    'Testing & Acceptance': { description: 'Run full UAT with the client and obtain sign-off on all acceptance criteria.', deliverables: 'User acceptance testing passed' },
    'Final Testing': { description: 'Perform cross-browser and cross-device testing of the completed website.', deliverables: 'Website tested across all browsers' },
    'Site Survey': { description: 'Visit the site, map gates and count access points.', deliverables: 'Site survey report' },
    'User Training': { description: 'Train East African Seed staff on daily SANTRACK use.', deliverables: 'Training sessions completed, attendance list', status: 'IN_PROGRESS' },
    'Configuration & Setup': { description: 'Configure SANTRACK warehouses, items and users for N&T.', deliverables: 'Configured system ready for testing', status: 'IN_PROGRESS' },
  }
  for (const [name, info] of Object.entries(details)) {
    const ms = await prisma.milestone.findMany({ where: { name, description: null } })
    for (const m of ms) {
      await prisma.milestone.update({
        where: { id: m.id },
        data: {
          description: info.description,
          deliverables: m.deliverables ?? info.deliverables,
          ...(info.status && m.status === 'NOT_STARTED' ? { status: info.status } : {}),
        },
      })
    }
  }
  console.log('✅ Milestones updated')

  // ── 7. AUDIT TRAIL ────────────────────────────────────────────────────────
  // Earlier seed runs added 5 sample rows on EVERY deploy. Remove those copies.
  const removed = await prisma.auditLog.deleteMany({
    where: { description: null, entityId: { in: ['inv-001', 'opp-sabban', 'pay-001', 'proj-evs-sabban', 'ST-004'] } },
  })
  if (removed.count) console.log(`🧹 Removed ${removed.count} repeated sample audit rows`)

  const who: Record<string, string> = { admin: admin.id, claire: claire.id, alice: alice.id, david: david.id, bob: bob.id }
  const logs: Array<[string, string, string, string, string, string, string, object | null, object | null, string, string]> = [
    // [id, user, action, entity, entityId, entityName, description, old, new, ip, device] — all on 11 Oct 2026
    ['01', 'admin', 'LOGIN', 'Auth', admin.id, 'System Admin', 'User logged into the system', null, null, '192.168.1.10', 'Chrome / Windows'],
    ['02', 'admin', 'CREATE', 'User', bob.id, 'Bob Nkurunziza', 'Created new user account for Bob Nkurunziza', null, { email: 'bob@santech.rw', role: 'PROJECT_MANAGER', department: 'IT' }, '192.168.1.10', 'Chrome / Windows'],
    ['03', 'claire', 'UPDATE', 'Employee', 'ST-001', 'Alice Uwimana', 'Updated base salary for Alice Uwimana', { baseSalary: 300000 }, { baseSalary: 350000 }, '192.168.1.11', 'Firefox / Windows'],
    ['04', 'alice', 'CREATE', 'FieldVisit', 'fv-006', 'GAMICO LTD', 'Recorded new field visit to GAMICO LTD', null, { company: 'GAMICO LTD', product: 'EVS', outcome: 'FOLLOW_UP' }, '192.168.1.12', 'Chrome / Android'],
    ['05', 'alice', 'CREATE', 'Lead', 'l11', 'MARRIOTT INTERNATIONAL', 'Added new lead — MARRIOTT INTERNATIONAL interested in EVS', null, { status: 'NEW', interestedIn: 'EVS', estimatedValue: 25000000 }, '192.168.1.12', 'Chrome / Android'],
    ['06', 'admin', 'APPROVE', 'Task', 'task-004', 'Send EVS Proposal to ECOBANK', 'Approved task completion by Alice Uwimana', { status: 'PENDING_APPROVAL' }, { status: 'APPROVED' }, '192.168.1.10', 'Chrome / Windows'],
    ['07', 'claire', 'STATUS_CHANGE', 'Contract', 'ct-2026-002', 'CT-2026-002 — SABBAN ABATTOIR', 'Advanced contract status from APPROVAL to SIGNING', { status: 'APPROVAL' }, { status: 'SIGNING' }, '192.168.1.11', 'Firefox / Windows'],
    ['08', 'david', 'PAYMENT', 'Invoice', 'inv-004', 'INV-2026-004 — N&T PLASTIC', 'Recorded payment of RWF 1,500,000 for invoice INV-2026-004', null, { amount: 1500000, method: 'Bank Transfer', reference: 'BNK-2026-1045' }, '192.168.1.14', 'Edge / Windows'],
    ['09', 'admin', 'UPDATE', 'Salary', 'ST-003', 'Claire Mukamana — October 2026', 'Added bonus of RWF 30,000 to Claire Mukamana salary', { bonuses: 0, netSalary: 490000 }, { bonuses: 30000, netSalary: 520000 }, '192.168.1.10', 'Chrome / Windows'],
    ['10', 'alice', 'STATUS_CHANGE', 'Deal', 'opp-kabuye', 'SANTRACK — KABUYE SUGAR WORKS', 'Moved deal from CONTACTED to QUALIFIED', { stage: 'CONTACTED' }, { stage: 'QUALIFIED' }, '192.168.1.12', 'Chrome / Android'],
    ['11', 'admin', 'REJECT', 'Task', 't6', 'Database backup and server maintenance', 'Rejected task — backup was incomplete. Missing production database.', { status: 'PENDING_APPROVAL' }, { status: 'REJECTED', reason: 'Backup was incomplete — missing the production database.' }, '192.168.1.10', 'Chrome / Windows'],
    ['12', 'alice', 'CREATE', 'Quotation', 'qt5', 'QT-2026-005 — N&T PLASTIC', 'Created quotation for N&T PLASTIC INDUSTRIES — SANTRACK 3M RWF', null, { totalAmount: 3000000, status: 'DRAFT' }, '192.168.1.12', 'Chrome / Windows'],
    ['13', 'claire', 'UPDATE', 'Employee', 'ST-004', 'David Habimana', 'Updated employment status for David Habimana', { employmentStatus: 'ACTIVE' }, { employmentStatus: 'ON_LEAVE' }, '192.168.1.11', 'Firefox / Windows'],
    ['14', 'admin', 'CREATE', 'Project', 'proj-cta', 'Custom Driver Management System', 'Created new project for Capital Transport Agency', null, { client: 'Capital Transport Agency', budget: 5000000, status: 'PLANNING' }, '192.168.1.10', 'Chrome / Windows'],
    ['15', 'claire', 'EXPORT', 'Client', 'all', 'All Clients', 'Exported client list to Excel', null, null, '192.168.1.11', 'Firefox / Windows'],
    ['16', 'alice', 'LOGIN', 'Auth', alice.id, 'Alice Uwimana', 'User logged into the system', null, null, '192.168.1.12', 'Chrome / Android'],
    ['17', 'admin', 'STATUS_CHANGE', 'Deal', 'opp-ntplast', 'SANTRACK — N&T PLASTIC', 'Moved deal from NEGOTIATION to WON', { stage: 'NEGOTIATION' }, { stage: 'WON' }, '192.168.1.10', 'Chrome / Windows'],
    ['18', 'claire', 'UPDATE', 'Contract', 'ct-2026-001', 'CT-2026-001', 'Updated payment terms for East African Seed Ltd contract', { paymentTerms: '100% upfront' }, { paymentTerms: '50% upfront, 50% on delivery' }, '192.168.1.11', 'Firefox / Windows'],
    ['19', 'admin', 'DELETE', 'Lead', 'l_old', 'Test Lead', 'Deleted test lead record', { companyName: 'Test Lead', status: 'NEW' }, null, '192.168.1.10', 'Chrome / Windows'],
    ['20', 'alice', 'LOGOUT', 'Auth', alice.id, 'Alice Uwimana', 'User logged out of the system', null, null, '192.168.1.12', 'Chrome / Android'],
  ]
  for (const [n, user, action, entity, entityId, entityName, description, oldValue, newValue, ip, device] of logs) {
    const minutes = (Number(n) - 1) * 30
    await prisma.auditLog.upsert({
      where: { id: `audit-seed-${n}` },
      update: {},
      create: {
        id: `audit-seed-${n}`, userId: who[user], action, entity, entityId, entityName, description,
        oldValue: oldValue ?? undefined, newValue: newValue ?? undefined, ipAddress: ip, userAgent: device,
        createdAt: new Date(Date.UTC(2026, 9, 11, 6, minutes)),
      },
    })
  }
  console.log('✅ Audit trail seeded')
}
