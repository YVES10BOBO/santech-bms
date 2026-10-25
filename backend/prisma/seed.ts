import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding SAN-BMS database with all mock data...')

  // ── 1. USERS ──────────────────────────────────────────────────────────────
  console.log('Creating users...')

  const passwordHash = async (pw: string) => bcrypt.hash(pw, 12)

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@santech.rw' },
    update: {},
    create: {
      firstName: 'System', lastName: 'Admin',
      email: 'admin@santech.rw',
      password: await passwordHash('Admin@2026'),
      role: 'SUPER_ADMIN', phone: '+250788000000', isActive: true,
    }
  })

  const hrAdmin = await prisma.user.upsert({
    where: { email: 'hr@santech.rw' },
    update: {},
    create: {
      firstName: 'HR', lastName: 'Manager',
      email: 'hr@santech.rw',
      password: await passwordHash('Hr@2026'),
      role: 'ADMIN', phone: '+250788000001', isActive: true,
    }
  })

  const alice = await prisma.user.upsert({
    where: { email: 'sales@santech.rw' },
    update: {},
    create: {
      firstName: 'Alice', lastName: 'Uwimana',
      email: 'sales@santech.rw',
      password: await passwordHash('Sales@2026'),
      role: 'SALES_STAFF', phone: '+250788100001', isActive: true,
    }
  })

  const bob = await prisma.user.upsert({
    where: { email: 'employee@santech.rw' },
    update: {},
    create: {
      firstName: 'Bob', lastName: 'Nkurunziza',
      email: 'employee@santech.rw',
      password: await passwordHash('Employee@2026'),
      role: 'EMPLOYEE', phone: '+250788100002', isActive: true,
    }
  })

  const finance = await prisma.user.upsert({
    where: { email: 'finance@santech.rw' },
    update: {},
    create: {
      firstName: 'David', lastName: 'Habimana',
      email: 'finance@santech.rw',
      password: await passwordHash('Finance@2026'),
      role: 'FINANCE_MANAGER', phone: '+250788100003', isActive: true,
    }
  })

  const claire = await prisma.user.upsert({
    where: { email: 'claire@santech.rw' },
    update: {},
    create: {
      firstName: 'Claire', lastName: 'Mukamana',
      email: 'claire@santech.rw',
      password: await passwordHash('Claire@2026'),
      role: 'ADMIN', phone: '+250788100004', isActive: true,
    }
  })

  const eve = await prisma.user.upsert({
    where: { email: 'eve@santech.rw' },
    update: {},
    create: {
      firstName: 'Eve', lastName: 'Ingabire',
      email: 'eve@santech.rw',
      password: await passwordHash('Eve@2026'),
      role: 'SALES_STAFF', phone: '+250788100005', isActive: true,
    }
  })

  const frank = await prisma.user.upsert({
    where: { email: 'frank@santech.rw' },
    update: {},
    create: {
      firstName: 'Frank', lastName: 'Bizimana',
      email: 'frank@santech.rw',
      password: await passwordHash('Frank@2026'),
      role: 'EMPLOYEE', phone: '+250788100006', isActive: true,
    }
  })

  // ── 2. EMPLOYEES ──────────────────────────────────────────────────────────
  console.log('Creating employees...')

  const empAlice = await prisma.employee.upsert({
    where: { userId: alice.id },
    update: {},
    create: {
      userId: alice.id, employeeCode: 'ST-001',
      department: 'Sales & Marketing', position: 'Sales Executive',
      hireDate: new Date('2024-03-01'), baseSalary: 350000,
      currency: 'RWF', performanceScore: 82, skills: ['CRM', 'Field Sales'],
    }
  })

  const empBob = await prisma.employee.upsert({
    where: { userId: bob.id },
    update: {},
    create: {
      userId: bob.id, employeeCode: 'ST-002',
      department: 'IT', position: 'Software Developer',
      hireDate: new Date('2024-01-15'), baseSalary: 600000,
      currency: 'RWF', performanceScore: 91, skills: ['React', 'Node.js', 'PostgreSQL'],
    }
  })

  const empClaire = await prisma.employee.upsert({
    where: { userId: claire.id },
    update: {},
    create: {
      userId: claire.id, employeeCode: 'ST-003',
      department: 'HR', position: 'HR Manager',
      hireDate: new Date('2023-09-01'), baseSalary: 500000,
      currency: 'RWF', performanceScore: 78, skills: ['HR Management', 'Payroll'],
    }
  })

  const empDavid = await prisma.employee.upsert({
    where: { userId: finance.id },
    update: {},
    create: {
      userId: finance.id, employeeCode: 'ST-004',
      department: 'Finance', position: 'Accountant',
      hireDate: new Date('2024-06-01'), baseSalary: 450000,
      currency: 'RWF', performanceScore: 65, skills: ['Accounting', 'QuickBooks'],
      employmentStatus: 'ON_LEAVE',
    }
  })

  const empEve = await prisma.employee.upsert({
    where: { userId: eve.id },
    update: {},
    create: {
      userId: eve.id, employeeCode: 'ST-005',
      department: 'Sales & Marketing', position: 'Marketing Officer',
      hireDate: new Date('2025-01-10'), baseSalary: 320000,
      currency: 'RWF', performanceScore: 74, skills: ['Digital Marketing', 'Social Media'],
    }
  })

  const empFrank = await prisma.employee.upsert({
    where: { userId: frank.id },
    update: {},
    create: {
      userId: frank.id, employeeCode: 'ST-006',
      department: 'IT', position: 'System Administrator',
      hireDate: new Date('2023-11-01'), baseSalary: 480000,
      currency: 'RWF', performanceScore: 88, skills: ['Linux', 'Networking', 'Security'],
    }
  })

  // ── 3. PRODUCTS ───────────────────────────────────────────────────────────
  console.log('Creating products...')

  const products = await Promise.all([
    prisma.product.upsert({ where: { id: 'prod-evs' }, update: {}, create: { id: 'prod-evs', name: 'E-Visitors System (EVS)', category: 'EVS', description: 'Digital gate pass, attendance tracking, visitor management and equipment verification system', price: 8000000, cost: 2000000, taxRate: 18, currency: 'RWF', isActive: true } }),
    prisma.product.upsert({ where: { id: 'prod-santrack' }, update: {}, create: { id: 'prod-santrack', name: 'SANTRACK', category: 'SANTRACK', description: 'Stock and inventory tracking system for businesses of all sizes', price: 3000000, cost: 800000, taxRate: 18, currency: 'RWF', isActive: true } }),
    prisma.product.upsert({ where: { id: 'prod-revixsan' }, update: {}, create: { id: 'prod-revixsan', name: 'REVIXSAN', category: 'REVIXSAN', description: 'Comprehensive business management solution for SMEs', price: 1500000, cost: 400000, taxRate: 18, currency: 'RWF', isActive: true } }),
    prisma.product.upsert({ where: { id: 'prod-sanbook' }, update: {}, create: { id: 'prod-sanbook', name: 'SANBOOK', category: 'SANBOOK', description: 'Financial and accounting solution for small businesses', price: 2000000, cost: 500000, taxRate: 18, currency: 'RWF', isActive: true } }),
    prisma.product.upsert({ where: { id: 'prod-sanhub' }, update: {}, create: { id: 'prod-sanhub', name: 'SANHUB', category: 'SANHUB', description: 'Training and learning hub for technology skills', price: 500000, cost: 100000, taxRate: 18, currency: 'RWF', isActive: true } }),
    prisma.product.upsert({ where: { id: 'prod-website' }, update: {}, create: { id: 'prod-website', name: 'Website Development', category: 'WEBSITE', description: 'Custom website design and development for businesses', price: 800000, cost: 200000, taxRate: 18, currency: 'RWF', isActive: true } }),
    prisma.product.upsert({ where: { id: 'prod-mobile' }, update: {}, create: { id: 'prod-mobile', name: 'Mobile App Development', category: 'MOBILE_APP', description: 'Android and iOS mobile application development', price: 5000000, cost: 1500000, taxRate: 18, currency: 'RWF', isActive: true } }),
    prisma.product.upsert({ where: { id: 'prod-training' }, update: {}, create: { id: 'prod-training', name: 'Training & Consultancy', category: 'TRAINING', description: 'IT training sessions and technology consultancy services', price: 200000, cost: 50000, taxRate: 18, currency: 'RWF', isActive: true } }),
  ])

  // ── 4. CLIENTS ────────────────────────────────────────────────────────────
  console.log('Creating clients...')

  const clientEaseed = await prisma.client.upsert({
    where: { id: 'client-easeed' },
    update: {},
    create: {
      id: 'client-easeed', companyName: 'East African Seed Ltd',
      category: 'SELF_EMPLOYED', status: 'CONTRACTOR', clientType: 'CONTRACTOR',
      phone: '789920635', location: 'Kigali', industry: 'Agriculture',
      contactPersonName: 'John Mugisha', contactPersonPhone: '0788200001',
      contactPersonEmail: 'john@easeed.rw', assignedToId: alice.id,
      source: 'Field Visit', notes: 'Signed contract for SANTRACK',
    }
  })

  const clientEcobank = await prisma.client.upsert({
    where: { id: 'client-ecobank' },
    update: {},
    create: {
      id: 'client-ecobank', companyName: 'ECOBANK Rwanda',
      category: 'INSTITUTION', status: 'QUALIFIED', clientType: 'ACQUISITION',
      phone: '0786740490', location: 'Kigali CBD', industry: 'Banking',
      contactPersonName: 'KAMIKAZI', contactPersonPhone: '0786740490',
      contactPersonEmail: 'akamikazi@ecobank.com', assignedToId: alice.id,
      source: 'Field Visit', notes: 'Requested 2 project proposals for EVS and SANHR IMS',
    }
  })

  const clientSabban = await prisma.client.upsert({
    where: { id: 'client-sabban' },
    update: {},
    create: {
      id: 'client-sabban', companyName: 'SABBAN ABATTOIR',
      category: 'SELF_EMPLOYED', status: 'QUALIFIED', clientType: 'ACQUISITION',
      phone: '0788846240', location: 'Kigali', industry: 'Food Processing',
      contactPersonName: 'HR THEONESTE', contactPersonPhone: '0788846240',
      assignedToId: alice.id, source: 'Field Visit',
      notes: '90 employees. Quoted 12M for EVS system. Board approved.',
    }
  })

  const clientHospital = await prisma.client.upsert({
    where: { id: 'client-hospital' },
    update: {},
    create: {
      id: 'client-hospital', companyName: 'NYARUGENGE HOSPITAL',
      category: 'INSTITUTION', status: 'LEAD', clientType: 'ACQUISITION',
      phone: '0785744154', location: 'Nyarugenge, Kigali', industry: 'Healthcare',
      contactPersonName: 'Ange Police NSENGIYUMVA', contactPersonPhone: '0785744154',
      assignedToId: alice.id, source: 'Field Visit',
      notes: 'Sent EVS proposal. Waiting for director appointment.',
    }
  })

  const clientNtPlastic = await prisma.client.upsert({
    where: { id: 'client-ntplastic' },
    update: {},
    create: {
      id: 'client-ntplastic', companyName: 'N&T PLASTIC INDUSTRIES LTD',
      category: 'INDUSTRY', status: 'LEAD', clientType: 'ACQUISITION',
      phone: '0780601661', location: 'Kigali', industry: 'Manufacturing',
      contactPersonName: 'MUGISHA', contactPersonPhone: '0780601661',
      assignedToId: alice.id, source: 'Field Visit',
      notes: 'Negotiation at 3M for SANTRACK',
    }
  })

  const clientSerena = await prisma.client.upsert({
    where: { id: 'client-serena' },
    update: {},
    create: {
      id: 'client-serena', companyName: 'Serena Hotel',
      category: 'SELF_EMPLOYED', status: 'LEAD', clientType: 'ACQUISITION',
      phone: '0788200454', location: 'Kigali', industry: 'Hospitality',
      contactPersonName: 'Security Manager', contactPersonPhone: '0788200454',
      contactPersonEmail: 'jackson.byakatonda@serenahotels.com',
      assignedToId: alice.id, source: 'Field Visit',
      notes: 'Top manager interested in EVS',
    }
  })

  const clientKabuye = await prisma.client.upsert({
    where: { id: 'client-kabuye' },
    update: {},
    create: {
      id: 'client-kabuye', companyName: 'KABUYE SUGAR WORKS',
      category: 'INDUSTRY', status: 'LEAD', clientType: 'ACQUISITION',
      phone: '788531586', location: 'Kabuye', industry: 'Manufacturing',
      contactPersonName: 'Claude', contactPersonPhone: '788531586',
      assignedToId: alice.id, source: 'Field Visit',
      notes: 'Security manager liked EVS system',
    }
  })

  const clientKemo = await prisma.client.upsert({
    where: { id: 'client-kemo' },
    update: {},
    create: {
      id: 'client-kemo', companyName: 'KEMO & SONS LTD',
      category: 'DISTRIBUTOR', status: 'PROSPECT', clientType: 'ACQUISITION',
      phone: '788525736', location: 'Kigali', industry: 'Distribution',
      assignedToId: alice.id, source: 'Field Visit',
      notes: 'Need proposal for distribution channel and website',
    }
  })

  const clientRwandaMtn = await prisma.client.upsert({
    where: { id: 'client-rwandamtn' },
    update: {},
    create: {
      id: 'client-rwandamtn', companyName: 'Rwanda Mountain Ride',
      category: 'SELF_EMPLOYED', status: 'CONTRACTOR', clientType: 'CONTRACTOR',
      phone: '0790114566', location: 'Kigali', industry: 'Tourism',
      assignedToId: alice.id, source: 'Field Visit',
      notes: 'Website completed and live.',
    }
  })

  // ── 5. FIELD VISITS ───────────────────────────────────────────────────────
  console.log('Creating field visits...')

  const fieldVisits = [
    { visitDate: new Date('2026-09-17'), companyName: 'East African Seed Ltd', category: 'SELF_EMPLOYED' as const, contactPhone: '789920635', whatSantechCanSell: 'SANTRACK', needsAndObservation: 'Products mentioned in notes, including Imbuto/seed-related products. Handwriting is partly unclear.', outcome: 'FOLLOW_UP' as const, comments: 'Follow up on the product opportunity and requirements.', contractWon: true, recordedById: alice.id, clientId: clientEaseed.id },
    { visitDate: new Date('2026-09-17'), companyName: 'Victoria Trading LTD', category: 'SELF_EMPLOYED' as const, contactName: 'EID IBRAHIM', contactPhone: '788256245', whatSantechCanSell: 'SANTRACK', needsAndObservation: 'EID IBRAHIM wants SANTRACK if amount is reduced. Had negotiated at 2M. Will sit with team and review budget.', outcome: 'NEGOTIATION' as const, comments: 'We have to make follow-up with them.', amountPromising: 2000000, contractWon: false, recordedById: alice.id },
    { visitDate: new Date('2026-09-16'), companyName: 'QUINCAILLAIRE KEMEC LTD', category: 'SELF_EMPLOYED' as const, contactPhone: '0783715051', whatSantechCanSell: 'REVIXSAN', needsAndObservation: 'Interested in stock management. REVIXSAN at 250k. Will provide 2 staff trainees.', outcome: 'FOLLOW_UP' as const, followUpDate: new Date('2026-10-15'), comments: 'Call them October 15 after they finish paying taxes.', amountPromising: 250000, contractWon: false, recordedById: alice.id },
    { visitDate: new Date('2026-09-22'), companyName: 'NYARUGENGE HOSPITAL', category: 'INSTITUTION' as const, contactName: 'Ange Police NSENGIYUMVA', contactPhone: '0785744154', location: 'Nyarugenge, Kigali', whatSantechCanSell: 'EVS', needsAndObservation: 'Talked with Secretary and IT. Requesting appointment with Hospital Director Lt Col William KANYANKORE.', outcome: 'PROPOSAL' as const, comments: 'Sent document proposal for EVS with all features and prices.', contractWon: false, recordedById: alice.id, clientId: clientHospital.id },
    { visitDate: new Date('2026-09-29'), companyName: 'ECOBANK', category: 'INSTITUTION' as const, contactName: 'KAMIKAZI', contactPhone: '0786740490', location: 'Kigali', whatSantechCanSell: 'EVS + SANHR IMS', needsAndObservation: 'Met marketing team led by KAMIKAZI. She liked the system and requested 2 project proposals with screenshots.', outcome: 'PROPOSAL' as const, comments: 'Send proposal to akamikazi@ecobank.com and dmana@ecobank.com.', contractWon: false, recordedById: alice.id, clientId: clientEcobank.id },
    { visitDate: new Date('2026-09-16'), companyName: 'N&T PLASTIC INDUSTRIES LTD', category: 'INDUSTRY' as const, contactName: 'MUGISHA', contactPhone: '0780601661', whatSantechCanSell: 'SANTRACK', needsAndObservation: 'Negotiation ongoing at 3M. Need to follow up with MUGISHA — Digital innovation.', outcome: 'NEGOTIATION' as const, comments: 'To call MUGISHA — Digital innovation.', amountPromising: 3000000, contractWon: false, recordedById: alice.id, clientId: clientNtPlastic.id },
    { visitDate: new Date('2026-09-30'), companyName: 'KABUYE SUGAR WORKS', category: 'INDUSTRY' as const, contactName: 'Claude (Security Manager)', contactPhone: '788531586', location: 'Kabuye', whatSantechCanSell: 'EVS', needsAndObservation: 'Security manager liked the EVS system. Currently doing attendance in books and with fingerprints.', outcome: 'INTERESTED' as const, comments: 'HR & Admin: 788531586, Claude Security Manager: 0785447889.', contractWon: false, recordedById: alice.id, clientId: clientKabuye.id },
    { visitDate: new Date('2026-10-07'), companyName: 'KEMO & SONS LTD', category: 'DISTRIBUTOR' as const, contactPhone: '788525736', location: 'Kigali', whatSantechCanSell: 'Website + CRM', needsAndObservation: 'Need proposal for distribution channel and website with CRM.', outcome: 'FOLLOW_UP' as const, comments: 'Prepare a proposal for distribution channel & website.', contractWon: false, recordedById: alice.id, clientId: clientKemo.id },
    { visitDate: new Date('2026-09-25'), companyName: 'Serena Hotel', category: 'SELF_EMPLOYED' as const, contactName: 'Security Manager', contactPhone: '0788200454', location: 'Kigali', whatSantechCanSell: 'EVS', needsAndObservation: 'Top manager interested in EVS but had pending meeting. Told receptionist to give contact of security manager.', outcome: 'INTERESTED' as const, comments: 'Call: 0788200454 / jackson.byakatonda@serenahotels.com.', contractWon: false, recordedById: alice.id, clientId: clientSerena.id },
    { visitDate: new Date('2026-10-01'), companyName: 'SABBAN ABATTOIR', category: 'SELF_EMPLOYED' as const, contactName: 'HR THEONESTE', contactPhone: '0788846240', location: 'Kigali', whatSantechCanSell: 'EVS', needsAndObservation: '90 employees. Need system for employee attendance, client records, and equipment tracking. Quoted at 12M.', outcome: 'NEGOTIATION' as const, comments: 'Follow up with HR THEONESTE: 0788846240.', amountPromising: 12000000, contractWon: false, recordedById: alice.id, clientId: clientSabban.id },
  ]

  for (const visit of fieldVisits) {
    await prisma.fieldVisit.create({ data: visit })
  }

  // ── 6. CONTRACTS ──────────────────────────────────────────────────────────
  console.log('Creating contracts...')

  const contractEaseed = await prisma.contract.upsert({
    where: { contractNumber: 'CT-2026-001' },
    update: {},
    create: {
      contractNumber: 'CT-2026-001', clientId: clientEaseed.id,
      projectName: 'SANTRACK Implementation',
      value: 1500000, currency: 'RWF',
      startDate: new Date('2026-10-01'), endDate: new Date('2026-12-31'),
      paymentTerms: '50% upfront, 50% on delivery',
      deliverables: 'SANTRACK system installation, staff training, 3 months support',
      status: 'ACTIVE', responsibleManagerId: alice.id,
      signedAt: new Date('2026-09-28'),
    }
  })

  const contractSabban = await prisma.contract.upsert({
    where: { contractNumber: 'CT-2026-002' },
    update: {},
    create: {
      contractNumber: 'CT-2026-002', clientId: clientSabban.id,
      projectName: 'EVS System — 90 Employees',
      value: 12000000, currency: 'RWF',
      startDate: new Date('2026-11-01'), endDate: new Date('2027-04-30'),
      paymentTerms: '30% on signing, 40% on installation, 30% on handover',
      deliverables: 'Full EVS: gate pass, attendance, equipment tracking, visitor management for 90 employees',
      status: 'SIGNING', responsibleManagerId: alice.id,
    }
  })

  const contractRwandaMtn = await prisma.contract.upsert({
    where: { contractNumber: 'CT-2025-012' },
    update: {},
    create: {
      contractNumber: 'CT-2025-012', clientId: clientRwandaMtn.id,
      projectName: 'Company Website',
      value: 800000, currency: 'RWF',
      startDate: new Date('2025-11-01'), endDate: new Date('2026-01-31'),
      paymentTerms: '50% upfront, 50% on launch',
      deliverables: 'Full company website with booking system',
      status: 'COMPLETED', responsibleManagerId: bob.id,
      signedAt: new Date('2025-10-28'),
    }
  })

  const contractNtPlastic = await prisma.contract.upsert({
    where: { contractNumber: 'CT-2026-003' },
    update: {},
    create: {
      contractNumber: 'CT-2026-003', clientId: clientNtPlastic.id,
      projectName: 'SANTRACK — Stock Management',
      value: 3000000, currency: 'RWF',
      startDate: new Date('2026-10-15'), endDate: new Date('2027-01-15'),
      paymentTerms: '100% on delivery',
      deliverables: 'SANTRACK customized for plastic manufacturing stock management',
      status: 'REVIEW', responsibleManagerId: bob.id,
    }
  })

  // ── 7. INVOICES ───────────────────────────────────────────────────────────
  console.log('Creating invoices...')

  const inv1 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2026-001' },
    update: {},
    create: {
      invoiceNumber: 'INV-2026-001', clientId: clientEaseed.id,
      contractId: contractEaseed.id,
      amount: 750000, taxAmount: 0, totalAmount: 750000, paidAmount: 750000,
      currency: 'RWF', issueDate: new Date('2026-10-01'), dueDate: new Date('2026-10-15'),
      status: 'PAID', notes: '50% upfront payment',
    }
  })

  const inv2 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2026-002' },
    update: {},
    create: {
      invoiceNumber: 'INV-2026-002', clientId: clientEaseed.id,
      contractId: contractEaseed.id,
      amount: 750000, taxAmount: 0, totalAmount: 750000, paidAmount: 0,
      currency: 'RWF', issueDate: new Date('2026-12-01'), dueDate: new Date('2026-12-15'),
      status: 'DUE', notes: '50% on delivery payment',
    }
  })

  const inv3 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2026-003' },
    update: {},
    create: {
      invoiceNumber: 'INV-2026-003', clientId: clientRwandaMtn.id,
      contractId: contractRwandaMtn.id,
      amount: 800000, taxAmount: 0, totalAmount: 800000, paidAmount: 800000,
      currency: 'RWF', issueDate: new Date('2026-01-28'), dueDate: new Date('2026-02-07'),
      status: 'PAID', notes: 'Full payment received on website launch',
    }
  })

  const inv4 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2026-004' },
    update: {},
    create: {
      invoiceNumber: 'INV-2026-004', clientId: clientNtPlastic.id,
      contractId: contractNtPlastic.id,
      amount: 3000000, taxAmount: 0, totalAmount: 3000000, paidAmount: 1500000,
      currency: 'RWF', issueDate: new Date('2026-10-15'), dueDate: new Date('2026-10-30'),
      status: 'PARTIALLY_PAID', notes: 'Partial payment received. Balance due Oct 30.',
    }
  })

  const inv5 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2026-005' },
    update: {},
    create: {
      invoiceNumber: 'INV-2026-005', clientId: clientEcobank.id,
      amount: 2000000, taxAmount: 0, totalAmount: 2000000, paidAmount: 0,
      currency: 'RWF', issueDate: new Date('2026-10-08'), dueDate: new Date('2026-10-22'),
      status: 'OVERDUE', notes: 'Signing payment — overdue',
    }
  })

  // ── 8. PAYMENTS ───────────────────────────────────────────────────────────
  console.log('Creating payments...')

  await prisma.payment.createMany({
    data: [
      { invoiceId: inv1.id, amount: 750000, currency: 'RWF', paymentDate: new Date('2026-10-02'), paymentMethod: 'Bank Transfer', reference: 'BNK-2026-1001' },
      { invoiceId: inv3.id, amount: 800000, currency: 'RWF', paymentDate: new Date('2026-01-30'), paymentMethod: 'Mobile Money', reference: 'MTN-20260130' },
      { invoiceId: inv4.id, amount: 1500000, currency: 'RWF', paymentDate: new Date('2026-10-18'), paymentMethod: 'Bank Transfer', reference: 'BNK-2026-1045' },
    ],
    skipDuplicates: true,
  })

  // ── 9. PROJECTS ───────────────────────────────────────────────────────────
  console.log('Creating projects...')

  const projSantrack = await prisma.project.upsert({
    where: { id: 'proj-santrack-easeed' },
    update: {},
    create: {
      id: 'proj-santrack-easeed',
      name: 'SANTRACK Implementation — East African Seed Ltd',
      clientId: clientEaseed.id, contractId: contractEaseed.id,
      projectManagerId: bob.id,
      budget: 1500000, contractValue: 1500000, currency: 'RWF',
      startDate: new Date('2026-10-01'), endDate: new Date('2026-12-31'),
      priority: 'HIGH', status: 'IN_PROGRESS', progress: 70,
      description: 'SANTRACK system installation and configuration for East African Seed Ltd',
    }
  })

  const projEVS = await prisma.project.upsert({
    where: { id: 'proj-evs-sabban' },
    update: {},
    create: {
      id: 'proj-evs-sabban',
      name: 'EVS System — SABBAN ABATTOIR (90 Employees)',
      clientId: clientSabban.id, contractId: contractSabban.id,
      projectManagerId: bob.id,
      budget: 12000000, contractValue: 12000000, currency: 'RWF',
      startDate: new Date('2026-11-01'), endDate: new Date('2027-04-30'),
      priority: 'URGENT', status: 'PLANNING', progress: 0,
      description: 'Full EVS system for 90 employees: gate pass, attendance, equipment tracking',
    }
  })

  const projWebsite = await prisma.project.upsert({
    where: { id: 'proj-website-rwandamtn' },
    update: {},
    create: {
      id: 'proj-website-rwandamtn',
      name: 'Company Website — Rwanda Mountain Ride',
      clientId: clientRwandaMtn.id, contractId: contractRwandaMtn.id,
      projectManagerId: bob.id,
      budget: 800000, contractValue: 800000, currency: 'RWF',
      startDate: new Date('2025-11-01'), endDate: new Date('2026-01-31'),
      priority: 'MEDIUM', status: 'COMPLETED', progress: 100,
      description: 'Full company website with booking system',
    }
  })

  // ── 10. MILESTONES ────────────────────────────────────────────────────────
  console.log('Creating milestones...')

  await prisma.milestone.createMany({
    data: [
      { projectId: projSantrack.id, name: 'Requirements & Analysis', deadline: new Date('2026-10-15'), deliverables: 'Requirements document, system specification', paymentPercentage: 15, isCompleted: true, completedAt: new Date('2026-10-14') },
      { projectId: projSantrack.id, name: 'Development & Installation', deadline: new Date('2026-11-15'), deliverables: 'SANTRACK installed and configured', paymentPercentage: 50, isCompleted: false },
      { projectId: projSantrack.id, name: 'Training & Handover', deadline: new Date('2026-12-01'), deliverables: 'Staff trained, system handed over, documentation', paymentPercentage: 35, isCompleted: false },
      { projectId: projEVS.id, name: 'Requirements Analysis', deadline: new Date('2026-11-05'), deliverables: 'Full system requirements for 90 employees', paymentPercentage: 10, isCompleted: false },
      { projectId: projEVS.id, name: 'Hardware Installation', deadline: new Date('2026-12-01'), deliverables: 'Access control terminals installed', paymentPercentage: 30, isCompleted: false },
      { projectId: projEVS.id, name: 'Software Configuration', deadline: new Date('2026-12-20'), deliverables: 'EVS fully configured for 90 employees', paymentPercentage: 30, isCompleted: false },
      { projectId: projEVS.id, name: 'Testing & Acceptance', deadline: new Date('2027-01-10'), deliverables: 'User acceptance testing passed', paymentPercentage: 20, isCompleted: false },
      { projectId: projEVS.id, name: 'Training & Handover', deadline: new Date('2027-01-31'), deliverables: 'Staff trained, system live', paymentPercentage: 10, isCompleted: false },
      { projectId: projWebsite.id, name: 'Final Testing', deadline: new Date('2026-10-01'), deliverables: 'Website tested across all browsers', paymentPercentage: 25, isCompleted: true, completedAt: new Date('2025-12-28') },
    ],
    skipDuplicates: true,
  })

  // ── 11. TASKS ─────────────────────────────────────────────────────────────
  console.log('Creating tasks...')

  await prisma.task.createMany({
    data: [
      { title: 'Visit GAMICO LTD and present EVS system', description: 'Go to GAMICO LTD, meet with ABEL, HR, IT and Security Manager and present the EVS system.', projectId: null, assignedToId: alice.id, assignedById: hrAdmin.id, priority: 'HIGH', startDate: new Date('2026-10-12'), deadline: new Date('2026-10-15'), status: 'IN_PROGRESS', periodStart: new Date('2026-10-12'), periodEnd: new Date('2026-10-15') },
      { title: 'Prepare EVS proposal for Ecobank', description: 'Create 2 detailed project proposals for EVS and SANHR IMS with screenshots and pricing.', assignedToId: alice.id, assignedById: hrAdmin.id, priority: 'URGENT', startDate: new Date('2026-10-10'), deadline: new Date('2026-10-13'), status: 'PENDING_APPROVAL', completedAt: new Date('2026-10-12'), periodStart: new Date('2026-10-10'), periodEnd: new Date('2026-10-13') },
      { title: 'Follow up with SABBAN ABATTOIR', description: 'Call HR THEONESTE regarding EVS system quote of 12M and arrange next meeting.', assignedToId: bob.id, assignedById: hrAdmin.id, priority: 'HIGH', startDate: new Date('2026-10-11'), deadline: new Date('2026-10-14'), status: 'ASSIGNED', periodStart: new Date('2026-10-11'), periodEnd: new Date('2026-10-14') },
      { title: 'Update company website content', description: 'Update the products and services section of the Santech website with new EVS features.', assignedToId: bob.id, assignedById: hrAdmin.id, priority: 'MEDIUM', startDate: new Date('2026-10-08'), deadline: new Date('2026-10-12'), status: 'APPROVED', approvedAt: new Date('2026-10-11'), approvedById: hrAdmin.id, completedAt: new Date('2026-10-11'), periodStart: new Date('2026-10-08'), periodEnd: new Date('2026-10-12') },
      { title: 'Prepare monthly sales report — September 2026', description: 'Compile all field visits, leads and opportunities from September into a management report.', assignedToId: alice.id, assignedById: hrAdmin.id, priority: 'MEDIUM', startDate: new Date('2026-10-01'), deadline: new Date('2026-10-05'), status: 'COMPLETED', completedAt: new Date('2026-10-04'), approvedAt: new Date('2026-10-05'), approvedById: hrAdmin.id, periodStart: new Date('2026-10-01'), periodEnd: new Date('2026-10-05') },
      { title: 'Database backup and server maintenance', description: 'Perform weekly backup of all client databases and check server health.', assignedToId: frank.id, assignedById: hrAdmin.id, priority: 'HIGH', startDate: new Date('2026-10-11'), deadline: new Date('2026-10-11'), status: 'REJECTED', rejectionReason: 'Backup was incomplete — missing the production database. Please redo.', periodStart: new Date('2026-10-11'), periodEnd: new Date('2026-10-11') },
      { title: 'Conduct HR onboarding for new staff', description: 'Onboard 2 new sales staff members — contracts, system access, training.', assignedToId: claire.id, assignedById: hrAdmin.id, priority: 'MEDIUM', startDate: new Date('2026-10-13'), deadline: new Date('2026-10-15'), status: 'CREATED', periodStart: new Date('2026-10-13'), periodEnd: new Date('2026-10-15') },
      { title: 'Prepare salary slips for October 2026', description: 'Generate and review salary slips for all employees for October 2026.', assignedToId: finance.id, assignedById: hrAdmin.id, priority: 'HIGH', startDate: new Date('2026-10-28'), deadline: new Date('2026-10-31'), status: 'CREATED', periodStart: new Date('2026-10-28'), periodEnd: new Date('2026-10-31') },
    ],
    skipDuplicates: true,
  })

  // ── 12. SALARY RECORDS ────────────────────────────────────────────────────
  console.log('Creating salary records...')

  await prisma.salaryRecord.createMany({
    data: [
      { employeeId: empAlice.id, month: 10, year: 2026, baseSalary: 350000, bonuses: 50000, deductions: 15000, netSalary: 385000, currency: 'RWF', isPaid: false },
      { employeeId: empBob.id,   month: 10, year: 2026, baseSalary: 600000, bonuses: 75000, deductions: 20000, netSalary: 655000, currency: 'RWF', isPaid: true, paidAt: new Date('2026-10-05') },
      { employeeId: empClaire.id,month: 10, year: 2026, baseSalary: 500000, bonuses: 0,     deductions: 10000, netSalary: 490000, currency: 'RWF', isPaid: false },
      { employeeId: empDavid.id, month: 10, year: 2026, baseSalary: 450000, bonuses: 30000, deductions: 10000, netSalary: 470000, currency: 'RWF', isPaid: true, paidAt: new Date('2026-10-05') },
      { employeeId: empFrank.id, month: 10, year: 2026, baseSalary: 480000, bonuses: 40000, deductions: 12000, netSalary: 508000, currency: 'RWF', isPaid: false },
    ],
    skipDuplicates: true,
  })

  // ── 13. OPPORTUNITIES ─────────────────────────────────────────────────────
  console.log('Creating opportunities...')

  await prisma.opportunity.createMany({
    data: [
      { name: 'EVS System — SABBAN ABATTOIR', clientId: clientSabban.id, stage: 'NEGOTIATION', estimatedValue: 12000000, currency: 'RWF', probability: 80, expectedCloseDate: new Date('2026-11-01'), assignedToId: alice.id, notes: '90 employees. Quoted 12M. Board approval pending.', nextAction: 'Call HR THEONESTE to confirm board decision', followUpDate: new Date('2026-10-15') },
      { name: 'EVS + SANHR IMS — ECOBANK', clientId: clientEcobank.id, stage: 'PROPOSAL', estimatedValue: 8000000, currency: 'RWF', probability: 60, expectedCloseDate: new Date('2026-11-15'), assignedToId: alice.id, notes: 'Requested 2 project proposals with screenshots.', nextAction: 'Send completed proposal document', followUpDate: new Date('2026-10-14') },
      { name: 'SANTRACK — N&T PLASTIC INDUSTRIES', clientId: clientNtPlastic.id, stage: 'NEGOTIATION', estimatedValue: 3000000, currency: 'RWF', probability: 75, expectedCloseDate: new Date('2026-10-30'), assignedToId: alice.id, notes: 'Negotiating at 3M.', nextAction: 'Call MUGISHA to confirm final price', followUpDate: new Date('2026-10-12') },
      { name: 'EVS — NYARUGENGE HOSPITAL', clientId: clientHospital.id, stage: 'PROPOSAL', estimatedValue: 15000000, currency: 'RWF', probability: 55, expectedCloseDate: new Date('2026-12-01'), assignedToId: alice.id, notes: 'Sent full EVS proposal. Waiting for director approval.', nextAction: 'Call Secretary for appointment update', followUpDate: new Date('2026-10-16') },
      { name: 'EVS — Serena Hotel', clientId: clientSerena.id, stage: 'CONTACTED', estimatedValue: 10000000, currency: 'RWF', probability: 25, expectedCloseDate: new Date('2026-11-30'), assignedToId: alice.id, notes: 'Top manager interested. Need to meet security manager.', nextAction: 'Call security manager to schedule demo', followUpDate: new Date('2026-10-13') },
      { name: 'EVS — KABUYE SUGAR WORKS', clientId: clientKabuye.id, stage: 'QUALIFIED', estimatedValue: 5000000, currency: 'RWF', probability: 45, expectedCloseDate: new Date('2026-11-15'), assignedToId: alice.id, notes: 'Security manager liked EVS. Currently use books + fingerprints.', nextAction: 'Schedule full system demo', followUpDate: new Date('2026-10-18') },
    ],
    skipDuplicates: true,
  })

  // ── 14. AUDIT LOGS ────────────────────────────────────────────────────────
  console.log('Creating audit logs...')

  await prisma.auditLog.createMany({
    data: [
      { userId: superAdmin.id, action: 'LOGIN',    entity: 'Auth',       entityId: superAdmin.id,     ipAddress: '192.168.1.10', userAgent: 'Chrome / Windows' },
      { userId: superAdmin.id, action: 'CREATE',   entity: 'User',       entityId: alice.id,          newValue: { email: 'sales@santech.rw', role: 'SALES_STAFF' }, ipAddress: '192.168.1.10', userAgent: 'Chrome / Windows' },
      { userId: hrAdmin.id,    action: 'UPDATE',   entity: 'Employee',   entityId: empAlice.id,       oldValue: { baseSalary: 300000 }, newValue: { baseSalary: 350000 }, ipAddress: '192.168.1.11', userAgent: 'Firefox / Windows' },
      { userId: alice.id,      action: 'CREATE',   entity: 'FieldVisit', entityId: 'fv-ecobank',      newValue: { company: 'ECOBANK', product: 'EVS', outcome: 'PROPOSAL' }, ipAddress: '192.168.1.12', userAgent: 'Chrome / Android' },
      { userId: hrAdmin.id,    action: 'APPROVE',  entity: 'Task',       entityId: 'task-4',          oldValue: { status: 'PENDING_APPROVAL' }, newValue: { status: 'APPROVED' }, ipAddress: '192.168.1.11', userAgent: 'Firefox / Windows' },
      { userId: superAdmin.id, action: 'CREATE',   entity: 'Contract',   entityId: contractEaseed.id, newValue: { value: 1500000, status: 'ACTIVE' }, ipAddress: '192.168.1.10', userAgent: 'Chrome / Windows' },
      { userId: hrAdmin.id,    action: 'PAYMENT',  entity: 'Invoice',    entityId: inv1.id,           newValue: { amount: 750000, method: 'Bank Transfer', reference: 'BNK-2026-1001' }, ipAddress: '192.168.1.11', userAgent: 'Firefox / Windows' },
    ],
    skipDuplicates: true,
  })

  console.log('')
  console.log('✅ Database seeded successfully!')
  console.log('')
  console.log('🔑 Login credentials:')
  console.log('   Super Admin:     admin@santech.rw    /  Admin@2026')
  console.log('   Admin (HR):      hr@santech.rw       /  Hr@2026')
  console.log('   Sales Staff:     sales@santech.rw    /  Sales@2026')
  console.log('   Finance Manager: finance@santech.rw  /  Finance@2026')
  console.log('   Employee (Bob):  employee@santech.rw /  Employee@2026')
  console.log('')
  console.log('📊 Data seeded:')
  console.log('   - 8 users')
  console.log('   - 6 employees with salary records')
  console.log('   - 8 products/services')
  console.log('   - 9 clients')
  console.log('   - 10 field visits (from Excel)')
  console.log('   - 4 contracts')
  console.log('   - 5 invoices + 3 payments')
  console.log('   - 3 projects + 9 milestones')
  console.log('   - 8 tasks')
  console.log('   - 6 opportunities (deal pipeline)')
  console.log('   - 7 audit logs')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })