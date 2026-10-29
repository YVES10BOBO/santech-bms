/**
 * Demo data for Leads, Quotations, Support, Product Catalog, Departments,
 * Users, Reception and Notifications — the data these pages used to keep
 * as hardcoded mock arrays.
 *
 * Safe to run on every deploy: fixed ids, created only when missing,
 * existing rows are never overwritten.
 */
import { PrismaClient, Prisma, ProductCategory } from '@prisma/client'
import bcrypt from 'bcryptjs'

const d = (s: string) => new Date(s.length === 10 ? `${s}T00:00:00.000Z` : `${s}Z`)

export async function seedSalesAndOperations(prisma: PrismaClient) {
  const byEmail = async (email: string) => (await prisma.user.findUnique({ where: { email } }))!
  const admin = await byEmail('admin@santech.rw')
  const alice = await byEmail('alice@santech.rw')
  const bob = await byEmail('bob@santech.rw')
  const claire = await byEmail('claire@santech.rw')
  const david = await byEmail('david@santech.rw')
  const frank = await byEmail('frank@santech.rw')

  const clientId = async (name: string) =>
    (await prisma.client.findFirst({ where: { companyName: { startsWith: name, mode: 'insensitive' } }, orderBy: { createdAt: 'asc' } }))?.id

  // ── 1. EXTRA STAFF (from the old Settings → Users mock) ────────────────────
  const password = await bcrypt.hash('Santech@2026', 12)
  const extraStaff = [
    { email: 'jean@santech.rw',  firstName: 'Jean',  lastName: 'Mutabazi', phone: '+250780001001', role: 'SUPER_ADMIN' as const,     isActive: true,  emp: { code: 'ST-007', department: 'Executive',         position: 'CEO',             salary: 1200000, hire: '2024-01-01' } },
    { email: 'grace@santech.rw', firstName: 'Grace', lastName: 'Ingabire', phone: '+250780001004', role: 'FINANCE_MANAGER' as const, isActive: true,  emp: { code: 'ST-008', department: 'Finance',           position: 'Finance Manager', salary: 550000,  hire: '2024-03-15' } },
    { email: 'eric@santech.rw',  firstName: 'Eric',  lastName: 'Habimana', phone: '+250780001005', role: 'EMPLOYEE' as const,        isActive: false, emp: null },
    { email: 'marie@santech.rw', firstName: 'Marie', lastName: 'Umubyeyi', phone: '+250780001006', role: 'PROJECT_MANAGER' as const, isActive: true,  emp: { code: 'ST-009', department: 'Projects',          position: 'Project Manager', salary: 600000,  hire: '2024-05-01' } },
    { email: 'paul@santech.rw',  firstName: 'Paul',  lastName: 'Rugamba',  phone: '+250780001007', role: 'SALES_MANAGER' as const,   isActive: true,  emp: { code: 'ST-010', department: 'Sales & Marketing', position: 'Sales Manager',   salary: 650000,  hire: '2024-06-01' } },
  ]
  const staff: Record<string, string> = {}
  for (const s of extraStaff) {
    const u = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: { email: s.email, firstName: s.firstName, lastName: s.lastName, phone: s.phone, role: s.role, isActive: s.isActive, password },
    })
    staff[s.firstName] = u.id
    if (s.emp) {
      const exists = await prisma.employee.findFirst({ where: { OR: [{ userId: u.id }, { employeeCode: s.emp.code }] } })
      if (!exists) {
        await prisma.employee.create({
          data: { userId: u.id, employeeCode: s.emp.code, department: s.emp.department, position: s.emp.position, hireDate: d(s.emp.hire), baseSalary: s.emp.salary, performanceScore: 80 },
        })
      }
    }
  }
  console.log('✅ Extra staff seeded')

  // ── 2. DEPARTMENTS (names match Employee.department) ───────────────────────
  const departments = [
    { id: 'dept-sales',   name: 'Sales & Marketing', head: alice.id,         budget: 2000000, color: 'bg-blue-100 text-blue-700',     description: 'Finds new clients through field visits and campaigns, generates leads and promotes Santech products and services.' },
    { id: 'dept-it',      name: 'IT',                head: bob.id,           budget: 5000000, color: 'bg-purple-100 text-purple-700', description: 'Builds and maintains all software systems including EVS, SANTRACK, REVIXSAN, websites and custom client solutions.' },
    { id: 'dept-hr',      name: 'HR',                head: claire.id,        budget: 1500000, color: 'bg-green-100 text-green-700',   description: 'Manages recruitment, onboarding, performance tracking, payroll inputs and staff welfare.' },
    { id: 'dept-finance', name: 'Finance',           head: david.id,         budget: 1000000, color: 'bg-amber-100 text-amber-700',   description: 'Manages financial records, invoicing, payments, expenses, payroll processing and financial reporting.' },
    { id: 'dept-ops',     name: 'Operations',        head: frank.id,         budget: 800000,  color: 'bg-teal-100 text-teal-700',     description: 'Handles day-to-day operations, logistics, client support and system maintenance after deployment.' },
    { id: 'dept-exec',    name: 'Executive',         head: staff.Jean,       budget: 3000000, color: 'bg-rose-100 text-rose-700',     description: 'Company leadership — strategy, approvals of major quotations, contracts and budgets.' },
    { id: 'dept-proj',    name: 'Projects',          head: staff.Marie,      budget: 1200000, color: 'bg-indigo-100 text-indigo-700', description: 'Plans and delivers client projects from signed contract to handover.' },
  ]
  for (const dep of departments) {
    const exists = await prisma.department.findFirst({ where: { OR: [{ id: dep.id }, { name: dep.name }] } })
    if (!exists) {
      await prisma.department.create({ data: { id: dep.id, name: dep.name, headId: dep.head ?? null, budget: dep.budget, color: dep.color, description: dep.description, createdAt: d('2023-01-01') } })
    }
  }
  console.log('✅ Departments seeded')

  // ── 3. PRODUCT CATALOG ─────────────────────────────────────────────────────
  const products: Array<[string, string, ProductCategory, string, number, number, number, string]> = [
    ['prod-evs',      'EVS Enterprise',         'EVS',        'Full biometric employee verification system with attendance, access control and HR integration.', 8500000, 3500000, 18, '5 business days'],
    ['prod-santrack', 'SANTRACK ERP',           'SANTRACK',   'Complete inventory, sales and procurement management platform for businesses.',                  3000000, 1200000, 18, '3 business days'],
    ['prod-revixsan', 'REVIXSAN HRIS',          'REVIXSAN',   'Human resource information system for leave, payroll and performance management.',              1500000, 600000,  18, '3 business days'],
    ['prod-sanbook',  'SANBOOK Accounting',     'SANBOOK',    'Accounting and bookkeeping software tailored for SMEs.',                                         2000000, 800000,  18, '2 business days'],
    ['prod-sanhub',   'SANHUB Integration',     'SANHUB',     'API integration hub connecting Santech products with third-party systems.',                      500000,  150000,  18, '1 business day'],
    ['prod-website',  'Corporate Website',      'WEBSITE',    'Custom business website with CMS, SEO optimization and hosting setup.',                          800000,  300000,  18, '10 business days'],
    ['prod-mobile',   'Mobile App Development', 'MOBILE_APP', 'Cross-platform mobile application development for Android and iOS.',                             5000000, 2000000, 18, '15 business days'],
    ['prod-training', 'Staff Training Package', 'TRAINING',   'On-site or remote product training for client staff. Per person rate.',                          200000,  50000,   0,  '1 business day'],
  ]
  for (const [id, name, category, description, price, cost, taxRate, sla] of products) {
    const exists = await prisma.product.findFirst({ where: { OR: [{ id }, { name }] } })
    if (!exists) await prisma.product.create({ data: { id, name, category, description, price, cost, taxRate, sla } })
  }
  console.log('✅ Products seeded')

  // ── 4. LEADS (from field visits) ──────────────────────────────────────────
  const leads: Array<Prisma.LeadUncheckedCreateInput> = [
    { id: 'lead-01', companyName: 'Free Trade LTD',         contactName: 'CYUBAHIRO',                  contactPhone: '0783334085', category: 'SELF_EMPLOYED', interestedIn: 'Mobile App',    status: 'NEW',       followUpDate: d('2026-11-03'), estimatedValue: 1500000,  notes: 'They want a mobile app for stock management.', createdAt: d('2026-09-17') },
    { id: 'lead-02', companyName: 'SABAN Ltd Abattoir',     contactName: 'GERARD MUGIRE',              contactPhone: '0725307032', category: 'SELF_EMPLOYED', interestedIn: 'EVS',           status: 'QUALIFIED', followUpDate: d('2026-10-30'), estimatedValue: 12000000, notes: 'Appointment on Monday 10am. HR is Gerard Mugire. Company supplies meat for local consumption.', createdAt: d('2026-09-17') },
    { id: 'lead-03', companyName: 'Bloom Kigali',           contactName: 'Denis (Owner)',              contactPhone: '0786021700', category: 'SELF_EMPLOYED', interestedIn: 'SANTRACK',      status: 'CONTACTED', followUpDate: d('2026-11-04'), estimatedValue: 700000,   notes: 'Sells flowers and decorative materials. Interested in SANTRACK customization for stock management.', createdAt: d('2026-09-11') },
    { id: 'lead-04', companyName: 'BANK OF KIGALI',         contactName: 'UMUTONI LUCKY',              contactEmail: 'procurement@bk.rw', category: 'INSTITUTION', interestedIn: 'EVS',    status: 'NEW',       followUpDate: d('2026-11-10'), estimatedValue: 20000000, notes: 'Talked with procurement. She will inform us of opportunities. Follow NewTimes for tenders.', createdAt: d('2026-09-29') },
    { id: 'lead-05', companyName: 'BPR Bank',               contactName: 'Receptionist',               contactEmail: 'info@bpr.rw',       category: 'INSTITUTION', interestedIn: 'EVS',    status: 'NEW',       followUpDate: d('2026-11-06'), estimatedValue: 18000000, notes: 'Did not meet the team. Got email for appointment request.', createdAt: d('2026-09-29') },
    { id: 'lead-06', companyName: 'KABILA INDUSTRY COFFEE', contactName: 'Ange (Accountant)',          contactPhone: '0783375049', category: 'INDUSTRY',      interestedIn: 'SANTRACK',      status: 'CONTACTED', followUpDate: d('2026-10-31'), estimatedValue: 2500000,  notes: 'Accountant chose SANTRACK. Will request appointment with the boss.', createdAt: d('2026-09-16') },
    { id: 'lead-07', companyName: 'Food Supplements Shop',                                             contactPhone: '0788431118', category: 'SELF_EMPLOYED', interestedIn: 'Website',       status: 'QUALIFIED', followUpDate: d('2026-11-02'), estimatedValue: 120000,   notes: 'Wants a website at 120k. Will pay an advance next Tuesday.', createdAt: d('2026-09-11') },
    { id: 'lead-08', companyName: 'HIKVISION Rwanda',                                                  contactPhone: '0788529036', category: 'SELF_EMPLOYED', interestedIn: 'Custom System', status: 'QUALIFIED', followUpDate: d('2026-11-05'), estimatedValue: 4000000,  notes: 'Uses ODOO at 4M/year. Wants a one-time payable system. Good opportunity.', createdAt: d('2026-09-28') },
    { id: 'lead-09', companyName: 'MARRIOTT INTERNATIONAL', contactName: 'Receptionist (CPM contact)', contactEmail: 'ndahiriwejoseph@marriot.com', category: 'INSTITUTION', interestedIn: 'EVS', status: 'NEW', followUpDate: d('2026-11-07'), estimatedValue: 25000000, notes: 'Got cluster purchasing manager contact. Need to write an email.', createdAt: d('2026-09-25') },
    { id: 'lead-10', companyName: 'QUINCAILLAIRE KEMEC',    contactName: 'Manager',                    contactPhone: '0785397723', category: 'SELF_EMPLOYED', interestedIn: 'SANBOOK',       status: 'CONTACTED', followUpDate: d('2026-10-30'), estimatedValue: 1800000,  notes: 'Hardware shop. Wants accounting + stock in one system. Attended our training session.', createdAt: d('2026-10-02') },
  ]
  for (const l of leads) {
    await prisma.lead.upsert({ where: { id: l.id! }, update: {}, create: { source: 'FIELD_VISIT', assignedToId: alice.id, ...l } })
  }
  console.log('✅ Leads seeded')

  // ── 5. QUOTATIONS ─────────────────────────────────────────────────────────
  let bloom = await clientId('Bloom Kigali')
  if (!bloom) {
    bloom = (await prisma.client.create({
      data: { id: 'cl-bloom', companyName: 'Bloom Kigali', kind: 'BUSINESS', category: 'SELF_EMPLOYED', status: 'PROSPECT', clientType: 'ACQUISITION', phone: '0786021700', contactPersonName: 'Denis (Owner)', contactPersonPhone: '0786021700', location: 'Kigali', assignedToId: alice.id, source: 'FIELD_VISIT', services: ['SANTRACK'] },
    })).id
  }
  const sabbanContract = await prisma.contract.findUnique({ where: { contractNumber: 'CT-2026-002' } })
  const item = (n: number, description: string, quantity: number, unitPrice: number) => ({ id: `i${n}`, description, quantity, unitPrice, total: quantity * unitPrice })
  const hist = (...e: Array<[string, string, string, string]>) => e.map(([status, action, actor, createdAt]) => ({ status, action, actor, createdAt }))
  const quotations = [
    {
      id: 'qt-2026-001', quotationNumber: 'QT-2026-001', client: 'ECOBANK', contactName: 'KAMIKAZI', contactEmail: 'akamikazi@ecobank.com', contactPhone: '0786740490',
      status: 'SENT' as const, validUntil: '2026-11-30', paymentTerms: '25% on signing, 75% on delivery', notes: 'Proposal sent as requested. Includes EVS and SANHR IMS.',
      linkedDeal: 'EVS + SANHR IMS — ECOBANK', createdAt: '2026-10-08', sentAt: '2026-10-09', acceptedAt: null, vatRate: 18,
      items: [item(1, 'EVS System License', 1, 5000000), item(2, 'SANHR IMS License', 1, 2000000), item(3, 'Installation & Configuration', 1, 500000), item(4, 'Staff Training (3 days)', 1, 300000), item(5, '3 Months Support & Maintenance', 3, 150000)],
      history: hist(['INTERNAL_REVIEW', 'SUBMITTED', 'Alice Uwimana', '2026-10-08'], ['MANAGER_APPROVAL', 'SUBMITTED', 'Paul Rugamba', '2026-10-08'], ['CEO_APPROVAL', 'APPROVED', 'Paul Rugamba', '2026-10-08'], ['APPROVED', 'APPROVED', 'Jean Mutabazi', '2026-10-09'], ['SENT', 'SENT', 'Alice Uwimana', '2026-10-09']),
    },
    {
      id: 'qt-2026-002', quotationNumber: 'QT-2026-002', client: 'SABBAN ABATTOIR', contactName: 'HR THEONESTE', contactPhone: '0788846240',
      status: 'CONVERTED' as const, validUntil: '2026-11-01', paymentTerms: '30% on signing, 40% on installation, 30% on handover', notes: 'EVS for 90 employees. Board approved.',
      linkedDeal: 'EVS System — SABBAN ABATTOIR', createdAt: '2026-10-01', sentAt: '2026-10-02', acceptedAt: '2026-10-10', vatRate: 0, contractId: sabbanContract?.id ?? null,
      items: [item(1, 'EVS System License (up to 100 employees)', 1, 8000000), item(2, 'Hardware — Access Control Terminals', 3, 800000), item(3, 'Installation & Setup', 1, 600000), item(4, 'Staff Training (2 days)', 1, 200000), item(5, '6 Months Support & Maintenance', 1, 800000)],
      history: hist(['APPROVED', 'APPROVED', 'Jean Mutabazi', '2026-10-01'], ['SENT', 'SENT', 'Alice Uwimana', '2026-10-02'], ['ACCEPTED', 'APPROVED', 'Alice Uwimana', '2026-10-10'], ['CONVERTED', 'UPDATED', 'System Admin', '2026-10-10']),
    },
    {
      id: 'qt-2026-003', quotationNumber: 'QT-2026-003', client: 'NYARUGENGE HOSPITAL', contactName: 'Lt Col William KANYANKORE', contactPhone: '0788305785',
      status: 'MANAGER_APPROVAL' as const, validUntil: '2026-12-11', paymentTerms: 'Milestone-based: 20% each milestone', notes: 'Full EVS for hospital staff and visitors. 500+ employees.',
      linkedDeal: 'EVS — NYARUGENGE HOSPITAL', createdAt: '2026-10-11', sentAt: null, acceptedAt: null, vatRate: 0,
      items: [item(1, 'EVS System License (up to 600 employees)', 1, 10000000), item(2, 'Visitor Management Module', 1, 2000000), item(3, 'Hardware — Access Terminals', 6, 800000), item(4, 'Installation & Configuration', 1, 1000000), item(5, 'Staff Training (5 days)', 1, 500000), item(6, '12 Months Support & Maintenance', 12, 150000)],
      history: hist(['INTERNAL_REVIEW', 'SUBMITTED', 'Alice Uwimana', '2026-10-11'], ['MANAGER_APPROVAL', 'SUBMITTED', 'Alice Uwimana', '2026-10-11']),
    },
    {
      id: 'qt-2026-004', quotationNumber: 'QT-2026-004', client: 'Bloom Kigali', contactName: 'Denis (Owner)', contactPhone: '0786021700',
      status: 'REJECTED' as const, validUntil: '2026-10-11', paymentTerms: '100% upfront', notes: 'Client found the price too high. May revisit.',
      linkedDeal: 'SANTRACK — Bloom Kigali', createdAt: '2026-09-15', sentAt: '2026-09-15', acceptedAt: null, vatRate: 0,
      items: [item(1, 'SANTRACK Customization for Flower Shop', 1, 600000), item(2, 'Training (1 day)', 1, 100000)],
      history: hist(['SENT', 'SENT', 'Alice Uwimana', '2026-09-15'], ['REJECTED', 'REJECTED', 'Alice Uwimana', '2026-09-22']),
    },
    {
      id: 'qt-2026-005', quotationNumber: 'QT-2026-005', client: 'N&T PLASTIC', contactName: 'MUGISHA', contactPhone: '0780601661',
      status: 'VIEWED' as const, validUntil: '2026-11-30', paymentTerms: '100% on delivery', notes: 'Negotiated down to 3M. Awaiting final decision.',
      linkedDeal: 'SANTRACK — N&T PLASTIC', createdAt: '2026-10-05', sentAt: '2026-10-06', acceptedAt: null, vatRate: 0,
      items: [item(1, 'SANTRACK — Manufacturing Edition', 1, 2500000), item(2, 'Custom Reports Module', 1, 300000), item(3, 'Installation & Training (2 days)', 1, 200000)],
      history: hist(['SENT', 'SENT', 'Alice Uwimana', '2026-10-06'], ['VIEWED', 'UPDATED', 'Alice Uwimana', '2026-10-07']),
    },
  ]
  for (const q of quotations) {
    const cid = q.client === 'Bloom Kigali' ? bloom : await clientId(q.client)
    if (!cid) continue
    const subtotal = q.items.reduce((s, i) => s + i.total, 0)
    const vatAmount = Math.round(subtotal * q.vatRate / 100)
    await prisma.quotation.upsert({
      where: { quotationNumber: q.quotationNumber },
      update: {},
      create: {
        id: q.id, quotationNumber: q.quotationNumber, clientId: cid, contactName: q.contactName, contactEmail: q.contactEmail ?? null, contactPhone: q.contactPhone ?? null,
        status: q.status, items: q.items, subtotal, vatRate: q.vatRate, vatAmount, totalAmount: subtotal + vatAmount,
        validUntil: d(q.validUntil), paymentTerms: q.paymentTerms, notes: q.notes, assignedToId: alice.id, linkedDeal: q.linkedDeal,
        approvalHistory: q.history, sentAt: q.sentAt ? d(q.sentAt) : null, acceptedAt: q.acceptedAt ? d(q.acceptedAt) : null,
        contractId: q.contractId ?? null, createdAt: d(q.createdAt),
      },
    })
  }
  console.log('✅ Quotations seeded')

  // ── 6. SUPPORT TICKETS ────────────────────────────────────────────────────
  const tickets = [
    { no: 'TKT-0001', client: 'SABBAN ABATTOIR',        subject: 'EVS device not connecting',          product: 'EVS',      priority: 'HIGH' as const,   status: 'IN_PROGRESS' as const,      who: alice.id, created: '2026-10-10', updated: '2026-10-13', description: 'The EVS device at the main entrance has stopped connecting to the server since yesterday morning. Staff cannot clock in or out.' },
    { no: 'TKT-0002', client: 'East African Seed',      subject: 'SANTRACK reports not loading',       product: 'SANTRACK', priority: 'MEDIUM' as const, status: 'ASSIGNED' as const,         who: bob.id,   created: '2026-10-11', updated: '2026-10-12', description: 'The monthly sales reports page returns a blank screen after login. This started after the last update.' },
    { no: 'TKT-0003', client: 'Rwanda Mountain Ride',   subject: 'Website contact form broken',        product: 'Website',  priority: 'LOW' as const,    status: 'NEW' as const,              who: null,     created: '2026-10-12', updated: '2026-10-12', description: 'Submissions on the contact form do not arrive in the inbox. The form appears to submit successfully but no emails are received.' },
    { no: 'TKT-0004', client: 'NYARUGENGE HOSPITAL',    subject: 'EVS fingerprint reader error',       product: 'EVS',      priority: 'URGENT' as const, status: 'WAITING_CUSTOMER' as const, who: alice.id, created: '2026-10-08', updated: '2026-10-14', description: 'The fingerprint reader on ward 3 displays error code E-04 and will not accept new enrollments. Affects 20 staff members.' },
    { no: 'TKT-0005', client: 'N&T PLASTIC',            subject: 'SANTRACK stock discrepancy',         product: 'SANTRACK', priority: 'HIGH' as const,   status: 'RESOLVED' as const,         who: frank.id, created: '2026-10-05', updated: '2026-10-11', description: 'Stock counts in SANTRACK do not match physical inventory for the raw materials warehouse. Discrepancy noticed during monthly audit.' },
    { no: 'TKT-0006', client: 'Capital Transport',      subject: 'Login issue on driver portal',       product: 'Other',    priority: 'MEDIUM' as const, status: 'CLOSED' as const,           who: bob.id,   created: '2026-10-03', updated: '2026-10-09', description: 'Several drivers cannot log in to the portal after a password reset. The reset email link appears to expire too quickly.' },
  ]
  for (const t of tickets) {
    const cid = await clientId(t.client)
    if (!cid) continue
    await prisma.supportTicket.upsert({
      where: { ticketNo: t.no },
      update: {},
      create: {
        ticketNo: t.no, clientId: cid, subject: t.subject, description: t.description, product: t.product, priority: t.priority,
        status: t.status, assignedToId: t.who, createdById: admin.id, createdAt: d(t.created), updatedAt: d(t.updated),
        resolvedAt: ['RESOLVED', 'CLOSED'].includes(t.status) ? d(t.updated) : null,
      },
    })
  }
  console.log('✅ Support tickets seeded')

  // ── 7. RECEPTION ──────────────────────────────────────────────────────────
  const visitors: Array<Prisma.VisitorUncheckedCreateInput> = [
    { id: 'vis-01', visitorName: 'Michael Johnson', company: 'LA Tech Delegation',  status: 'CHECKED_OUT', expectedDate: d('2026-10-11'), expectedTime: '09:00', checkInTime: d('2026-10-11T09:05:00'), checkOutTime: d('2026-10-11T11:10:00'), expectedDuration: 120, hostId: admin.id,  purpose: 'CLIENT_MEETING',   notes: 'LA Tech delegation visiting to discuss a potential partnership' },
    { id: 'vis-02', visitorName: 'KAMIKAZI',        company: 'ECOBANK',             status: 'CHECKED_OUT', expectedDate: d('2026-10-10'), expectedTime: '10:00', checkInTime: d('2026-10-10T10:00:00'), checkOutTime: d('2026-10-10T14:00:00'), expectedDuration: 120, hostId: alice.id,  purpose: 'SALES_MEETING',    phone: '0786740490' },
    { id: 'vis-03', visitorName: 'HR THEONESTE',    company: 'SABBAN ABATTOIR',     status: 'CHECKED_OUT', expectedDate: d('2026-10-09'), expectedTime: '11:00', checkInTime: d('2026-10-09T11:00:00'), checkOutTime: d('2026-10-09T12:30:00'), expectedDuration: 90,  hostId: alice.id,  purpose: 'CONTRACT_SIGNING', phone: '0788846240' },
    { id: 'vis-04', visitorName: 'Denis',           company: 'Bloom Kigali',        status: 'NO_SHOW',     expectedDate: d('2026-10-08'), expectedTime: '15:00', expectedDuration: 60,  hostId: alice.id,  purpose: 'CLIENT_MEETING',   notes: 'Did not show up for the scheduled meeting' },
    { id: 'vis-05', visitorName: 'Job Candidate',   company: 'External',            status: 'CHECKED_OUT', expectedDate: d('2026-10-07'), expectedTime: '09:00', checkInTime: d('2026-10-07T09:00:00'), checkOutTime: d('2026-10-07T10:30:00'), expectedDuration: 90,  hostId: claire.id, purpose: 'INTERVIEW' },
    { id: 'vis-06', visitorName: 'Bob Tech',        company: 'Tech Supplier',       status: 'CHECKED_OUT', expectedDate: d('2026-10-06'), expectedTime: '14:00', checkInTime: d('2026-10-06T14:00:00'), checkOutTime: d('2026-10-06T15:00:00'), expectedDuration: 60,  hostId: bob.id,    purpose: 'DELIVERY',         notes: 'Delivered network equipment' },
    { id: 'vis-07', visitorName: 'Ange',            company: 'KABILA COFFEE',       status: 'CHECKED_OUT', expectedDate: d('2026-10-05'), expectedTime: '10:00', checkInTime: d('2026-10-05T10:00:00'), checkOutTime: d('2026-10-05T11:00:00'), expectedDuration: 60,  hostId: alice.id,  purpose: 'SALES_MEETING' },
    { id: 'vis-08', visitorName: 'Training Attendee', company: 'QUINCAILLAIRE KEMEC', status: 'CHECKED_OUT', expectedDate: d('2026-10-11'), expectedTime: '14:00', checkInTime: d('2026-10-11T14:00:00'), checkOutTime: d('2026-10-11T16:00:00'), expectedDuration: 120, hostId: bob.id,  purpose: 'TRAINING',         notes: 'Walk-in for training session' },
  ]
  // Two upcoming visits (dated when first seeded) so check-in can be shown live
  const today = new Date(); today.setUTCHours(0, 0, 0, 0)
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  visitors.push(
    { id: 'vis-demo-1', visitorName: 'UMUTONI LUCKY', company: 'BANK OF KIGALI', status: 'EXPECTED', expectedDate: today, expectedTime: '14:00', expectedDuration: 60, hostId: alice.id, purpose: 'SALES_MEETING', phone: '0788000111', notes: 'EVS presentation for procurement' },
    { id: 'vis-demo-2', visitorName: 'Lt Col William KANYANKORE', company: 'NYARUGENGE HOSPITAL', status: 'EXPECTED', expectedDate: tomorrow, expectedTime: '10:00', expectedDuration: 90, hostId: admin.id, purpose: 'CLIENT_MEETING', notes: 'Discuss quotation QT-2026-003' },
  )
  for (const v of visitors) await prisma.visitor.upsert({ where: { id: v.id! }, update: {}, create: v })
  console.log('✅ Visitors seeded')

  // ── 8. NOTIFICATIONS (old Notifications page mock, for the main admin) ─────
  const notes: Array<[string, string, string, string, string, boolean, string]> = [
    ['seed-n01', 'OVERDUE',         'Invoice Overdue',             'ECOBANK invoice INV-2026-005 is overdue — RWF 2,000,000 outstanding',        '2026-10-23T09:00:00', false, '/finance/invoices'],
    ['seed-n02', 'FOLLOW_UP',       'Follow-up Due',               'Call QUINCAILLAIRE KEMEC — scheduled for Oct 30',                            '2026-10-28T08:30:00', false, '/crm/leads'],
    ['seed-n03', 'CONTRACT_EXPIRY', 'Contract Expiring',           'Contract CT-2026-001 ends on 31 Dec 2026 — review renewal',                  '2026-10-12T10:00:00', false, '/contracts'],
    ['seed-n04', 'TASK_DEADLINE',   'Task Deadline Tomorrow',      'EVS proposal for Ecobank is due tomorrow',                                  '2026-10-27T07:00:00', false, '/projects/tasks'],
    ['seed-n05', 'FOLLOW_UP',       'Follow-up: Call Client',      'Call SABBAN ABATTOIR — contact: HR THEONESTE',                              '2026-10-13T11:00:00', false, '/sales/pipeline'],
    ['seed-n06', 'PAYMENT_DUE',     'Payment Due Soon',            'N&T PLASTIC INDUSTRIES balance due on Oct 30 — RWF 1,500,000',              '2026-10-24T09:30:00', true,  '/finance/invoices'],
    ['seed-n07', 'FOLLOW_UP',       'New Lead Assigned',           'MARRIOTT INTERNATIONAL assigned to Alice — initial contact needed',          '2026-10-11T14:00:00', true,  '/crm/leads'],
    ['seed-n08', 'CONTRACT_EXPIRY', 'Contract Awaiting Signature', 'SABBAN ABATTOIR contract CT-2026-002 needs Santech signature',               '2026-10-20T16:00:00', true,  '/contracts'],
    ['seed-n09', 'SYSTEM',          'Task Approved',               'Monthly sales report approved by Admin',                                    '2026-10-09T12:00:00', true,  '/projects/tasks'],
    ['seed-n10', 'SYSTEM',          'System Backup',               'Database backup completed successfully at 02:00 AM',                        '2026-10-28T02:00:00', true,  ''],
  ]
  for (const [key, type, title, description, at, read, link] of notes) {
    await prisma.notification.upsert({
      where: { userId_key: { userId: admin.id, key } },
      update: {},
      create: { userId: admin.id, key, type, title, description, read, link: link || null, createdAt: d(at) },
    })
  }
  console.log('✅ Notifications seeded')
}
