/**
 * Seeds invoices, tasks, opportunities and field visits only.
 * Run: npx ts-node prisma/seed-remaining.ts
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding remaining data...')

  // Fetch existing IDs
  const [aliceUser, bobUser, claireUser, davidUser, adminUser] = await Promise.all([
    prisma.user.findUnique({ where: { email: 'alice@santech.rw' } }),
    prisma.user.findUnique({ where: { email: 'bob@santech.rw' } }),
    prisma.user.findUnique({ where: { email: 'claire@santech.rw' } }),
    prisma.user.findUnique({ where: { email: 'david@santech.rw' } }),
    prisma.user.findUnique({ where: { email: 'admin@santech.rw' } }),
  ])

  if (!aliceUser || !bobUser || !claireUser || !davidUser || !adminUser) {
    throw new Error('Users not found — run main seed first')
  }

  const clients = await prisma.client.findMany({ select: { id: true, companyName: true } })
  const cc: Record<string, string> = {}
  for (const c of clients) cc[c.companyName] = c.id

  const contracts = await prisma.contract.findMany({ select: { id: true, contractNumber: true } })
  const ct: Record<string, string> = {}
  for (const c of contracts) ct[c.contractNumber] = c.id

  const projects = await prisma.project.findMany({ select: { id: true, name: true } })
  const cp: Record<string, string> = {}
  for (const p of projects) cp[p.name] = p.id

  // ── INVOICES ──────────────────────────────────────────────
  console.log('Seeding invoices...')
  const invoiceRows = [
    { invoiceNumber: 'INV-2026-001', clientId: cc['East African Seed Ltd'],   contractId: ct['CT-2026-001'], amount: 750000,  totalAmount: 750000,  paidAmount: 750000,  issueDate: new Date('2026-10-01'), dueDate: new Date('2026-10-15'), status: 'PAID' as const,           notes: '50% upfront', pay: { amount: 750000,  date: new Date('2026-10-02'), method: 'Bank Transfer', ref: 'BNK-2026-1001' } },
    { invoiceNumber: 'INV-2026-002', clientId: cc['East African Seed Ltd'],   contractId: ct['CT-2026-001'], amount: 750000,  totalAmount: 750000,  paidAmount: 0,       issueDate: new Date('2026-12-01'), dueDate: new Date('2026-12-15'), status: 'DUE' as const,            notes: '50% on delivery', pay: null },
    { invoiceNumber: 'INV-2026-003', clientId: cc['Rwanda Mountain Ride'],    contractId: ct['CT-2026-003'], amount: 800000,  totalAmount: 800000,  paidAmount: 800000,  issueDate: new Date('2026-09-28'), dueDate: new Date('2026-10-07'), status: 'PAID' as const,           notes: 'Full payment', pay: { amount: 800000,  date: new Date('2026-09-30'), method: 'Mobile Money',  ref: 'MTN-20260930' } },
    { invoiceNumber: 'INV-2026-004', clientId: cc['N&T PLASTIC INDUSTRIES'],  contractId: ct['CT-2026-004'], amount: 3000000, totalAmount: 3000000, paidAmount: 1500000, issueDate: new Date('2026-10-15'), dueDate: new Date('2026-10-30'), status: 'PARTIALLY_PAID' as const, notes: 'Partial payment', pay: { amount: 1500000, date: new Date('2026-10-18'), method: 'Bank Transfer', ref: 'BNK-2026-1045' } },
    { invoiceNumber: 'INV-2026-005', clientId: cc['ECOBANK Rwanda'],          contractId: ct['CT-2026-005'], amount: 2000000, totalAmount: 2000000, paidAmount: 0,       issueDate: new Date('2026-10-08'), dueDate: new Date('2026-10-22'), status: 'OVERDUE' as const,        notes: 'Signing overdue', pay: null },
    { invoiceNumber: 'INV-2026-006', clientId: cc['SABBAN ABATTOIR'],         contractId: ct['CT-2026-002'], amount: 3600000, totalAmount: 3600000, paidAmount: 0,       issueDate: new Date('2026-11-01'), dueDate: new Date('2026-11-15'), status: 'DRAFT' as const,          notes: '30% on signing', pay: null },
  ]
  for (const inv of invoiceRows) {
    const { pay, ...data } = inv
    const record = await prisma.invoice.upsert({ where: { invoiceNumber: inv.invoiceNumber }, update: {}, create: { ...data, taxAmount: 0, currency: 'RWF' } })
    if (pay) {
      const exists = await prisma.payment.findFirst({ where: { invoiceId: record.id } })
      if (!exists) await prisma.payment.create({ data: { invoiceId: record.id, amount: pay.amount, currency: 'RWF', paymentDate: pay.date, paymentMethod: pay.method, reference: pay.ref } })
    }
  }
  console.log('✅ Invoices seeded')

  // ── TASKS ─────────────────────────────────────────────────
  console.log('Seeding tasks...')
  const taskRows = [
    { id: 'task-001', title: 'SANTRACK User Training — Session 1', projectId: cp['SANTRACK Implementation'],   assignedToId: aliceUser.id, assignedById: adminUser.id, priority: 'HIGH' as const,   deadline: new Date('2026-11-15'), status: 'IN_PROGRESS' as const, estimatedHours: 8, description: 'Training session for East African Seed Ltd staff.' },
    { id: 'task-002', title: 'Prepare EVS Site Survey Report',      projectId: cp['EVS System — 90 Employees'], assignedToId: bobUser.id,   assignedById: adminUser.id, priority: 'URGENT' as const, deadline: new Date('2026-11-15'), status: 'ASSIGNED' as const,   estimatedHours: 6, description: 'Physical site survey at SABBAN ABATTOIR.' },
    { id: 'task-003', title: 'Deploy SANTRACK on N&T Server',       projectId: cp['SANTRACK Stock Management'], assignedToId: bobUser.id,   assignedById: adminUser.id, priority: 'HIGH' as const,   deadline: new Date('2026-12-01'), status: 'IN_PROGRESS' as const, estimatedHours: 16, description: 'Install SANTRACK on client server.' },
    { id: 'task-004', title: 'Send EVS Proposal to ECOBANK',                                                    assignedToId: aliceUser.id, assignedById: adminUser.id, priority: 'URGENT' as const, deadline: new Date('2026-10-28'), status: 'REVIEW' as const,     estimatedHours: 4, actualHours: 3.5, description: 'Email EVS + SANHR IMS proposal to KAMIKAZI.' },
    { id: 'task-005', title: 'Monthly Performance Report — October',                                             assignedToId: claireUser.id,assignedById: adminUser.id, priority: 'MEDIUM' as const, deadline: new Date('2026-10-31'), status: 'ASSIGNED' as const,   estimatedHours: 5, description: 'Compile October metrics.' },
    { id: 'task-006', title: 'Follow Up — NYARUGENGE HOSPITAL',                                                  assignedToId: aliceUser.id, assignedById: adminUser.id, priority: 'HIGH' as const,   deadline: new Date('2026-11-01'), status: 'CREATED' as const,    estimatedHours: 2, description: 'Call secretary for Director approval.' },
    { id: 'task-007', title: 'Update Website SEO — Rwanda Mountain Ride', projectId: cp['Company Website'],    assignedToId: bobUser.id,   assignedById: adminUser.id, priority: 'LOW' as const,    deadline: new Date('2026-09-29'), status: 'APPROVED' as const,   estimatedHours: 4, actualHours: 4, description: 'Final SEO optimizations.' },
    { id: 'task-008', title: 'Prepare Invoice INV-2026-002',                                                     assignedToId: davidUser.id, assignedById: adminUser.id, priority: 'MEDIUM' as const, deadline: new Date('2026-12-01'), status: 'ASSIGNED' as const,   estimatedHours: 2, description: 'Issue second milestone invoice.' },
  ]
  for (const t of taskRows) {
    const { id, ...data } = t
    await prisma.task.upsert({ where: { id }, update: {}, create: { id, ...data } })
  }
  console.log('✅ Tasks seeded')

  // ── OPPORTUNITIES ─────────────────────────────────────────
  console.log('Seeding opportunities...')
  const oppRows = [
    { id: 'opp-sabban',   name: 'EVS System — SABBAN ABATTOIR',  clientId: cc['SABBAN ABATTOIR'],         stage: 'NEGOTIATION' as const,          estimatedValue: 12000000, probability: 80,  expectedCloseDate: new Date('2026-11-01'), assignedToId: aliceUser.id },
    { id: 'opp-ecobank',  name: 'EVS + SANHR IMS — ECOBANK',     clientId: cc['ECOBANK Rwanda'],          stage: 'PROPOSAL' as const,             estimatedValue: 8000000,  probability: 60,  expectedCloseDate: new Date('2026-11-15'), assignedToId: aliceUser.id },
    { id: 'opp-ntplast',  name: 'SANTRACK — N&T PLASTIC',        clientId: cc['N&T PLASTIC INDUSTRIES'],  stage: 'WON' as const,                  estimatedValue: 3000000,  probability: 100, expectedCloseDate: new Date('2026-09-30'), assignedToId: aliceUser.id },
    { id: 'opp-hospital', name: 'EVS — NYARUGENGE HOSPITAL',     clientId: cc['NYARUGENGE HOSPITAL'],     stage: 'PROPOSAL' as const,             estimatedValue: 15000000, probability: 55,  expectedCloseDate: new Date('2026-12-01'), assignedToId: aliceUser.id },
    { id: 'opp-serena',   name: 'EVS — Serena Hotel',            clientId: cc['Serena Hotel'],            stage: 'CONTACTED' as const,            estimatedValue: 10000000, probability: 25,  expectedCloseDate: new Date('2026-11-30'), assignedToId: aliceUser.id },
    { id: 'opp-kabuye',   name: 'SANTRACK — KABUYE SUGAR WORKS', clientId: cc['KABUYE SUGAR WORKS'],      stage: 'QUALIFIED' as const,            estimatedValue: 5000000,  probability: 45,  expectedCloseDate: new Date('2026-11-15'), assignedToId: aliceUser.id },
    { id: 'opp-gamico',   name: 'EVS — GAMICO LTD',              clientId: cc['GAMICO LTD'],              stage: 'REQUIREMENT_ANALYSIS' as const, estimatedValue: 7000000,  probability: 50,  expectedCloseDate: new Date('2026-11-20'), assignedToId: aliceUser.id },
  ]
  for (const o of oppRows) {
    const { id, ...data } = o
    await prisma.opportunity.upsert({ where: { id }, update: {}, create: { id, ...data, currency: 'RWF' } })
  }
  console.log('✅ Opportunities seeded')

  // ── FIELD VISITS ──────────────────────────────────────────
  console.log('Seeding field visits...')
  const visitRows = [
    { id: 'fv-001', visitDate: new Date('2026-09-16'), companyName: 'N&T PLASTIC INDUSTRIES', category: 'INDUSTRY' as const,      location: 'Kigali',  contactName: 'MUGISHA',                   contactPhone: '0780601661', needsAndObservation: 'Looking for stock management solution.', whatSantechCanSell: 'SANTRACK Stock Module',  outcome: 'NEGOTIATION' as const, followUpDate: new Date('2026-10-12'), contractWon: true,  recordedById: aliceUser.id, clientId: cc['N&T PLASTIC INDUSTRIES'] },
    { id: 'fv-002', visitDate: new Date('2026-09-22'), companyName: 'NYARUGENGE HOSPITAL',     category: 'INSTITUTION' as const,   location: 'Kigali',  contactName: 'Ange Police NSENGIYUMVA', contactPhone: '0785744154', needsAndObservation: 'Need biometric access control.',          whatSantechCanSell: 'EVS Enterprise',         outcome: 'PROPOSAL' as const,    followUpDate: new Date('2026-11-01'), contractWon: false, recordedById: aliceUser.id, clientId: cc['NYARUGENGE HOSPITAL'] },
    { id: 'fv-003', visitDate: new Date('2026-09-25'), companyName: 'Serena Hotel',            category: 'SELF_EMPLOYED' as const, location: 'Kigali',  contactName: 'Security Manager',          contactPhone: '0788200454', needsAndObservation: 'Top manager interested in EVS.',          whatSantechCanSell: 'EVS Hotel Edition',      outcome: 'INTERESTED' as const,  followUpDate: new Date('2026-11-05'), contractWon: false, recordedById: aliceUser.id, clientId: cc['Serena Hotel'] },
    { id: 'fv-004', visitDate: new Date('2026-09-29'), companyName: 'ECOBANK Rwanda',          category: 'INSTITUTION' as const,   location: 'Kigali',  contactName: 'KAMIKAZI',                  contactPhone: '0786740490', needsAndObservation: 'Requested EVS + HR IMS proposals.',       whatSantechCanSell: 'EVS + SANHR IMS',        outcome: 'PROPOSAL' as const,    followUpDate: new Date('2026-10-28'), contractWon: false, recordedById: aliceUser.id, clientId: cc['ECOBANK Rwanda'] },
    { id: 'fv-005', visitDate: new Date('2026-09-30'), companyName: 'KABUYE SUGAR WORKS',      category: 'INDUSTRY' as const,      location: 'Kigali',  contactName: 'Claude',                    contactPhone: '0788531586', needsAndObservation: 'Security manager interested.',            whatSantechCanSell: 'EVS + SANTRACK',         outcome: 'INTERESTED' as const,  followUpDate: new Date('2026-11-02'), contractWon: false, recordedById: aliceUser.id, clientId: cc['KABUYE SUGAR WORKS'] },
    { id: 'fv-006', visitDate: new Date('2026-10-07'), companyName: 'GAMICO LTD',              category: 'INDUSTRY' as const,      location: 'Kigali',  contactName: 'ABEL',                      contactPhone: '0785024796', needsAndObservation: 'ABEL arranging meeting with team.',        whatSantechCanSell: 'EVS Enterprise',         outcome: 'FOLLOW_UP' as const,   followUpDate: new Date('2026-11-03'), contractWon: false, recordedById: aliceUser.id, clientId: cc['GAMICO LTD'] },
    { id: 'fv-007', visitDate: new Date('2026-10-10'), companyName: 'East African Seed Ltd',   category: 'INDUSTRY' as const,      location: 'Kigali',  contactName: 'MUGISHA',                   contactPhone: '0788400001', needsAndObservation: 'SANTRACK progress review.',               whatSantechCanSell: 'SANTRACK',               outcome: 'NEGOTIATION' as const, followUpDate: new Date('2026-11-15'), contractWon: true,  recordedById: aliceUser.id, clientId: cc['East African Seed Ltd'] },
    { id: 'fv-008', visitDate: new Date('2026-10-14'), companyName: 'SABBAN ABATTOIR',         category: 'INDUSTRY' as const,      location: 'Kigali',  contactName: 'HR THEONESTE',              contactPhone: '0788846240', needsAndObservation: 'Board reviewing EVS contract.',           whatSantechCanSell: 'EVS 90-employee system', outcome: 'PROPOSAL' as const,    followUpDate: new Date('2026-10-30'), contractWon: false, recordedById: aliceUser.id, clientId: cc['SABBAN ABATTOIR'] },
  ]
  for (const v of visitRows) {
    const { id, ...data } = v
    await prisma.fieldVisit.upsert({ where: { id }, update: {}, create: { id, ...data } })
  }
  console.log('✅ Field visits seeded')

  console.log('\n🎉 Remaining data seeded successfully!')
}

main()
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
