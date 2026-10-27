/**
 * SAN-BMS Seed File
 * Seeds mock data matching the frontend pages for supervisor demonstration.
 * Run: npx ts-node prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding SAN-BMS database...')

  // ────────────────────────────────────────────────────────────
  // 1. USERS & EMPLOYEES
  // ────────────────────────────────────────────────────────────

  const password = await bcrypt.hash('Santech@2026', 12)

  // Admin / CEO
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@santech.rw' },
    update: {},
    create: {
      firstName: 'System', lastName: 'Admin',
      email: 'admin@santech.rw', password,
      phone: '0788000000', role: 'SUPER_ADMIN', isActive: true,
    }
  })

  // Alice — Sales
  const aliceUser = await prisma.user.upsert({
    where: { email: 'alice@santech.rw' },
    update: {},
    create: {
      firstName: 'Alice', lastName: 'Uwimana',
      email: 'alice@santech.rw', password,
      phone: '0788100001', role: 'SALES_STAFF', isActive: true,
    }
  })

  // Bob — IT
  const bobUser = await prisma.user.upsert({
    where: { email: 'bob@santech.rw' },
    update: {},
    create: {
      firstName: 'Bob', lastName: 'Nkurunziza',
      email: 'bob@santech.rw', password,
      phone: '0788100002', role: 'PROJECT_MANAGER', isActive: true,
    }
  })

  // Claire — HR
  const claireUser = await prisma.user.upsert({
    where: { email: 'claire@santech.rw' },
    update: {},
    create: {
      firstName: 'Claire', lastName: 'Mukamana',
      email: 'claire@santech.rw', password,
      phone: '0788100003', role: 'ADMIN', isActive: true,
    }
  })

  // David — Finance
  const davidUser = await prisma.user.upsert({
    where: { email: 'david@santech.rw' },
    update: {},
    create: {
      firstName: 'David', lastName: 'Habimana',
      email: 'david@santech.rw', password,
      phone: '0788100004', role: 'FINANCE_MANAGER', isActive: true,
    }
  })

  // Eve — Marketing
  const eveUser = await prisma.user.upsert({
    where: { email: 'eve@santech.rw' },
    update: {},
    create: {
      firstName: 'Eve', lastName: 'Ingabire',
      email: 'eve@santech.rw', password,
      phone: '0788100005', role: 'MARKETING_MANAGER', isActive: true,
    }
  })

  // Frank — IT sysadmin
  const frankUser = await prisma.user.upsert({
    where: { email: 'frank@santech.rw' },
    update: {},
    create: {
      firstName: 'Frank', lastName: 'Bizimana',
      email: 'frank@santech.rw', password,
      phone: '0788100006', role: 'EMPLOYEE', isActive: true,
    }
  })

  // Employee records — sequential to avoid pgbouncer pool exhaustion
  const aliceEmp = await prisma.employee.upsert({
    where: { employeeCode: 'ST-001' },
    update: {},
    create: {
      userId: aliceUser.id, employeeCode: 'ST-001',
      department: 'Sales & Marketing', position: 'Sales Executive',
      hireDate: new Date('2024-03-01'), employmentStatus: 'ACTIVE',
      baseSalary: 350000, currency: 'RWF', performanceScore: 82,
      skills: ['CRM', 'Field Sales'],
    }
  })
  const bobEmp = await prisma.employee.upsert({
    where: { employeeCode: 'ST-002' },
    update: {},
    create: {
      userId: bobUser.id, employeeCode: 'ST-002',
      department: 'IT', position: 'Software Developer',
      hireDate: new Date('2024-01-15'), employmentStatus: 'ACTIVE',
      baseSalary: 600000, currency: 'RWF', performanceScore: 91,
      skills: ['React', 'Node.js', 'PostgreSQL'],
    }
  })
  const claireEmp = await prisma.employee.upsert({
    where: { employeeCode: 'ST-003' },
    update: {},
    create: {
      userId: claireUser.id, employeeCode: 'ST-003',
      department: 'HR', position: 'HR Manager',
      hireDate: new Date('2023-09-01'), employmentStatus: 'ACTIVE',
      baseSalary: 500000, currency: 'RWF', performanceScore: 78,
      skills: ['HR Management', 'Payroll'],
    }
  })
  const davidEmp = await prisma.employee.upsert({
        skills: ['Accounting', 'QuickBooks'],
      }
    }),
    prisma.employee.upsert({
      where: { employeeCode: 'ST-005' },
      update: {},
      create: {
        userId: eveUser.id, employeeCode: 'ST-005',
        department: 'Sales & Marketing', position: 'Marketing Officer',
        hireDate: new Date('2025-01-10'), employmentStatus: 'ACTIVE',
        baseSalary: 320000, currency: 'RWF', performanceScore: 74,
        skills: ['Digital Marketing', 'Social Media'],
      }
    }),
    prisma.employee.upsert({
      where: { employeeCode: 'ST-006' },
      update: {},
      create: {
        userId: frankUser.id, employeeCode: 'ST-006',
        department: 'IT', position: 'System Administrator',
        hireDate: new Date('2023-11-01'), employmentStatus: 'ACTIVE',
        baseSalary: 480000, currency: 'RWF', performanceScore: 88,
        skills: ['Linux', 'Networking', 'Security'],
      }
    }),
  ])

  // Salary records — October 2026
  const salaryMonth = 10, salaryYear = 2026
  const empSalaries = [
    { emp: aliceEmp, net: 350000 }, { emp: bobEmp, net: 600000 },
    { emp: claireEmp, net: 500000 }, { emp: davidEmp, net: 450000 },
    { emp: eveEmp, net: 320000 }, { emp: frankEmp, net: 480000 },
  ]
  for (const { emp, net } of empSalaries) {
    await prisma.salaryRecord.upsert({
      where: { employeeId_month_year: { employeeId: emp.id, month: salaryMonth, year: salaryYear } },
      update: {},
      create: {
        employeeId: emp.id, month: salaryMonth, year: salaryYear,
        baseSalary: net, bonuses: 0, deductions: 0, netSalary: net,
        currency: 'RWF', isPaid: true, paidAt: new Date('2026-10-25'),
      }
    })
  }
  console.log('✅ Employees and salary records seeded')

  // ────────────────────────────────────────────────────────────
  // 2. CLIENTS
  // ────────────────────────────────────────────────────────────

  const clientsData = [
    { companyName: 'East African Seed Ltd', category: 'INDUSTRY' as const, status: 'CONTRACTOR' as const, phone: '0788400001', email: 'info@easeed.rw', location: 'Kigali', industry: 'Agriculture', assignedToId: aliceUser.id },
    { companyName: 'SABBAN ABATTOIR', category: 'INDUSTRY' as const, status: 'QUALIFIED' as const, phone: '0788846240', email: 'hr@sabban.rw', location: 'Kigali', industry: 'Food Processing', assignedToId: aliceUser.id },
    { companyName: 'Rwanda Mountain Ride', category: 'SELF_EMPLOYED' as const, status: 'CONTRACTOR' as const, phone: '0788400003', email: 'info@rwandamtride.rw', location: 'Kigali', industry: 'Tourism', assignedToId: aliceUser.id },
    { companyName: 'N&T PLASTIC INDUSTRIES', category: 'INDUSTRY' as const, status: 'CONTRACTOR' as const, phone: '0780601661', email: 'info@ntplastic.rw', location: 'Kigali', industry: 'Manufacturing', assignedToId: aliceUser.id },
    { companyName: 'ECOBANK Rwanda', category: 'INSTITUTION' as const, status: 'QUALIFIED' as const, phone: '0786740490', email: 'info@ecobank.rw', location: 'Kigali', industry: 'Banking', assignedToId: aliceUser.id },
    { companyName: 'NYARUGENGE HOSPITAL', category: 'INSTITUTION' as const, status: 'QUALIFIED' as const, phone: '0785744154', email: 'info@nyarugenge-hospital.rw', location: 'Kigali', industry: 'Healthcare', assignedToId: aliceUser.id },
    { companyName: 'Capital Transport Agency', category: 'INSTITUTION' as const, status: 'PROSPECT' as const, phone: '0788400007', email: 'info@cta.rw', location: 'Kigali', industry: 'Transport', assignedToId: aliceUser.id },
    { companyName: 'KABUYE SUGAR WORKS', category: 'INDUSTRY' as const, status: 'QUALIFIED' as const, phone: '0788531586', email: 'info@kabuye.rw', location: 'Kigali', industry: 'Food Processing', assignedToId: aliceUser.id },
    { companyName: 'Serena Hotel', category: 'SELF_EMPLOYED' as const, status: 'PROSPECT' as const, phone: '0788200454', email: 'info@serena.rw', location: 'Kigali', industry: 'Hospitality', assignedToId: aliceUser.id },
    { companyName: 'GAMICO LTD', category: 'INDUSTRY' as const, status: 'LEAD' as const, phone: '0785024796', email: 'abel@gamico.rw', location: 'Kigali', industry: 'Manufacturing', assignedToId: aliceUser.id },
  ]

  const createdClients: Record<string, string> = {}
  for (const c of clientsData) {
    const existing = await prisma.client.findFirst({ where: { companyName: c.companyName } })
    const client = existing || await prisma.client.create({ data: { ...c, clientType: 'ACQUISITION', active: true } })
    createdClients[c.companyName] = client.id
  }
  console.log('✅ Clients seeded')

  // ────────────────────────────────────────────────────────────
  // 3. CONTRACTS
  // ────────────────────────────────────────────────────────────

  const contractsData = [
    {
      contractNumber: 'CT-2026-001',
      clientId: createdClients['East African Seed Ltd'],
      projectName: 'SANTRACK Implementation',
      value: 1500000, currency: 'RWF',
      startDate: new Date('2026-08-01'), endDate: new Date('2026-12-31'),
      paymentTerms: '50% upfront, 50% on delivery',
      status: 'ACTIVE' as const, responsibleManagerId: aliceUser.id,
      signedAt: new Date('2026-07-25'),
    },
    {
      contractNumber: 'CT-2026-002',
      clientId: createdClients['SABBAN ABATTOIR'],
      projectName: 'EVS System — 90 Employees',
      value: 12000000, currency: 'RWF',
      startDate: new Date('2026-11-01'), endDate: new Date('2027-04-30'),
      paymentTerms: '30% signing, 40% installation, 30% handover',
      status: 'SIGNING' as const, responsibleManagerId: bobUser.id,
    },
    {
      contractNumber: 'CT-2026-003',
      clientId: createdClients['Rwanda Mountain Ride'],
      projectName: 'Company Website',
      value: 800000, currency: 'RWF',
      startDate: new Date('2026-07-01'), endDate: new Date('2026-09-30'),
      paymentTerms: 'Full payment on delivery',
      status: 'COMPLETED' as const, responsibleManagerId: aliceUser.id,
      signedAt: new Date('2026-06-28'),
    },
    {
      contractNumber: 'CT-2026-004',
      clientId: createdClients['N&T PLASTIC INDUSTRIES'],
      projectName: 'SANTRACK Stock Management',
      value: 3000000, currency: 'RWF',
      startDate: new Date('2026-09-15'), endDate: new Date('2027-02-28'),
      paymentTerms: '50% upfront, 50% on go-live',
      status: 'ACTIVE' as const, responsibleManagerId: aliceUser.id,
      signedAt: new Date('2026-09-10'),
    },
    {
      contractNumber: 'CT-2026-005',
      clientId: createdClients['ECOBANK Rwanda'],
      projectName: 'EVS + SANHR IMS',
      value: 8000000, currency: 'RWF',
      startDate: new Date('2026-10-01'), endDate: new Date('2027-03-31'),
      paymentTerms: 'Milestone-based payments',
      status: 'REVIEW' as const, responsibleManagerId: bobUser.id,
    },
  ]

  const createdContracts: Record<string, string> = {}
  for (const c of contractsData) {
    const existing = await prisma.contract.findFirst({ where: { contractNumber: c.contractNumber } })
    const contract = existing || await prisma.contract.create({ data: c })
    createdContracts[c.contractNumber] = contract.id
  }
  console.log('✅ Contracts seeded')

  // ────────────────────────────────────────────────────────────
  // 4. PROJECTS
  // ────────────────────────────────────────────────────────────

  const projectsData = [
    {
      name: 'SANTRACK Implementation',
      clientId: createdClients['East African Seed Ltd'],
      contractId: createdContracts['CT-2026-001'],
      projectManagerId: aliceUser.id,
      budget: 1500000, contractValue: 1500000, currency: 'RWF',
      startDate: new Date('2026-08-01'), endDate: new Date('2026-12-31'),
      priority: 'HIGH' as const, status: 'IN_PROGRESS' as const, progress: 70,
      description: 'Full SANTRACK ERP implementation for inventory and sales tracking.',
    },
    {
      name: 'EVS System — 90 Employees',
      clientId: createdClients['SABBAN ABATTOIR'],
      contractId: createdContracts['CT-2026-002'],
      projectManagerId: bobUser.id,
      budget: 12000000, contractValue: 12000000, currency: 'RWF',
      startDate: new Date('2026-11-01'), endDate: new Date('2027-04-30'),
      priority: 'URGENT' as const, status: 'PLANNING' as const, progress: 0,
      description: 'Enterprise EVS access control for 90 employees.',
    },
    {
      name: 'Company Website',
      clientId: createdClients['Rwanda Mountain Ride'],
      contractId: createdContracts['CT-2026-003'],
      projectManagerId: aliceUser.id,
      budget: 800000, contractValue: 800000, currency: 'RWF',
      startDate: new Date('2026-07-01'), endDate: new Date('2026-09-30'),
      priority: 'MEDIUM' as const, status: 'COMPLETED' as const, progress: 100,
      description: 'Corporate website design and development.',
    },
    {
      name: 'SANTRACK Stock Management',
      clientId: createdClients['N&T PLASTIC INDUSTRIES'],
      contractId: createdContracts['CT-2026-004'],
      projectManagerId: claireUser.id,
      budget: 3000000, contractValue: 3000000, currency: 'RWF',
      startDate: new Date('2026-09-15'), endDate: new Date('2027-02-28'),
      priority: 'HIGH' as const, status: 'IN_PROGRESS' as const, progress: 30,
      description: 'Stock and inventory module deployment.',
    },
    {
      name: 'EVS Hospital Access Control',
      clientId: createdClients['NYARUGENGE HOSPITAL'],
      projectManagerId: bobUser.id,
      budget: 15000000, contractValue: 15000000, currency: 'RWF',
      startDate: new Date('2026-12-01'), endDate: new Date('2027-06-30'),
      priority: 'HIGH' as const, status: 'NOT_STARTED' as const, progress: 0,
      description: 'Biometric access control for all hospital zones.',
    },
    {
      name: 'Custom Driver Management System',
      clientId: createdClients['Capital Transport Agency'],
      projectManagerId: claireUser.id,
      budget: 5000000, contractValue: 5000000, currency: 'RWF',
      startDate: new Date('2026-11-15'), endDate: new Date('2027-05-31'),
      priority: 'MEDIUM' as const, status: 'PLANNING' as const, progress: 0,
      description: 'Custom web app for driver licensing and trip management.',
    },
  ]

  const createdProjects: Record<string, string> = {}
  for (const p of projectsData) {
    const existing = await prisma.project.findFirst({ where: { name: p.name } })
    const project = existing || await prisma.project.create({ data: p })
    createdProjects[p.name] = project.id
  }

  // Milestones
  const milestonesData = [
    { projectName: 'SANTRACK Implementation', items: [
      { name: 'Requirements Gathering', deadline: new Date('2026-08-15'), isCompleted: true, paymentPercentage: 0 },
      { name: 'System Setup & Configuration', deadline: new Date('2026-09-30'), isCompleted: true, paymentPercentage: 50 },
      { name: 'User Training', deadline: new Date('2026-11-15'), isCompleted: false, paymentPercentage: 0 },
      { name: 'Go-Live & Handover', deadline: new Date('2026-12-31'), isCompleted: false, paymentPercentage: 50 },
    ]},
    { projectName: 'EVS System — 90 Employees', items: [
      { name: 'Site Survey', deadline: new Date('2026-11-15'), isCompleted: false, paymentPercentage: 30 },
      { name: 'Hardware Procurement', deadline: new Date('2026-12-15'), isCompleted: false, paymentPercentage: 0 },
      { name: 'Installation & Testing', deadline: new Date('2027-02-28'), isCompleted: false, paymentPercentage: 40 },
      { name: 'Training & Handover', deadline: new Date('2027-04-30'), isCompleted: false, paymentPercentage: 30 },
    ]},
    { projectName: 'Company Website', items: [
      { name: 'Design Approved', deadline: new Date('2026-07-31'), isCompleted: true, paymentPercentage: 0 },
      { name: 'Development Complete', deadline: new Date('2026-08-31'), isCompleted: true, paymentPercentage: 0 },
      { name: 'Launch & Handover', deadline: new Date('2026-09-30'), isCompleted: true, paymentPercentage: 100 },
    ]},
    { projectName: 'SANTRACK Stock Management', items: [
      { name: 'Discovery & Analysis', deadline: new Date('2026-10-15'), isCompleted: true, paymentPercentage: 50 },
      { name: 'Configuration & Setup', deadline: new Date('2026-12-15'), isCompleted: false, paymentPercentage: 0 },
      { name: 'Staff Training', deadline: new Date('2027-01-31'), isCompleted: false, paymentPercentage: 50 },
    ]},
  ]

  for (const { projectName, items } of milestonesData) {
    const pid = createdProjects[projectName]
    if (!pid) continue
    for (const m of items) {
      const existing = await prisma.milestone.findFirst({ where: { projectId: pid, name: m.name } })
      if (!existing) {
        await prisma.milestone.create({
          data: { projectId: pid, name: m.name, deadline: m.deadline, paymentPercentage: m.paymentPercentage, isCompleted: m.isCompleted, completedAt: m.isCompleted ? m.deadline : null }
        })
      }
    }
  }
  console.log('✅ Projects and milestones seeded')

  // ────────────────────────────────────────────────────────────
  // 5. INVOICES & PAYMENTS
  // ────────────────────────────────────────────────────────────

  const invoicesData = [
    {
      invoiceNumber: 'INV-2026-001', clientId: createdClients['East African Seed Ltd'], contractId: createdContracts['CT-2026-001'],
      amount: 750000, taxAmount: 0, totalAmount: 750000, paidAmount: 750000, currency: 'RWF',
      issueDate: new Date('2026-10-01'), dueDate: new Date('2026-10-15'), status: 'PAID' as const, notes: '50% upfront payment',
      payment: { amount: 750000, date: new Date('2026-10-02'), method: 'Bank Transfer', ref: 'BNK-2026-1001' }
    },
    {
      invoiceNumber: 'INV-2026-002', clientId: createdClients['East African Seed Ltd'], contractId: createdContracts['CT-2026-001'],
      amount: 750000, taxAmount: 0, totalAmount: 750000, paidAmount: 0, currency: 'RWF',
      issueDate: new Date('2026-12-01'), dueDate: new Date('2026-12-15'), status: 'DUE' as const, notes: '50% on delivery payment',
      payment: null
    },
    {
      invoiceNumber: 'INV-2026-003', clientId: createdClients['Rwanda Mountain Ride'], contractId: createdContracts['CT-2026-003'],
      amount: 800000, taxAmount: 0, totalAmount: 800000, paidAmount: 800000, currency: 'RWF',
      issueDate: new Date('2026-09-28'), dueDate: new Date('2026-10-07'), status: 'PAID' as const, notes: 'Full payment received on website launch',
      payment: { amount: 800000, date: new Date('2026-09-30'), method: 'Mobile Money', ref: 'MTN-20260930' }
    },
    {
      invoiceNumber: 'INV-2026-004', clientId: createdClients['N&T PLASTIC INDUSTRIES'], contractId: createdContracts['CT-2026-004'],
      amount: 3000000, taxAmount: 0, totalAmount: 3000000, paidAmount: 1500000, currency: 'RWF',
      issueDate: new Date('2026-10-15'), dueDate: new Date('2026-10-30'), status: 'PARTIALLY_PAID' as const, notes: 'Partial payment received. Balance due Oct 30.',
      payment: { amount: 1500000, date: new Date('2026-10-18'), method: 'Bank Transfer', ref: 'BNK-2026-1045' }
    },
    {
      invoiceNumber: 'INV-2026-005', clientId: createdClients['ECOBANK Rwanda'], contractId: createdContracts['CT-2026-005'],
      amount: 2000000, taxAmount: 0, totalAmount: 2000000, paidAmount: 0, currency: 'RWF',
      issueDate: new Date('2026-10-08'), dueDate: new Date('2026-10-22'), status: 'OVERDUE' as const, notes: 'Signing payment — overdue',
      payment: null
    },
    {
      invoiceNumber: 'INV-2026-006', clientId: createdClients['SABBAN ABATTOIR'], contractId: createdContracts['CT-2026-002'],
      amount: 3600000, taxAmount: 0, totalAmount: 3600000, paidAmount: 0, currency: 'RWF',
      issueDate: new Date('2026-11-01'), dueDate: new Date('2026-11-15'), status: 'DRAFT' as const, notes: '30% on signing — draft invoice',
      payment: null
    },
  ]

  for (const inv of invoicesData) {
    const existing = await prisma.invoice.findFirst({ where: { invoiceNumber: inv.invoiceNumber } })
    if (!existing) {
      const { payment, ...invData } = inv
      const created = await prisma.invoice.create({ data: invData })
      if (payment) {
        await prisma.payment.create({ data: { invoiceId: created.id, amount: payment.amount, currency: 'RWF', paymentDate: payment.date, paymentMethod: payment.method, reference: payment.ref } })
      }
    }
  }
  console.log('✅ Invoices and payments seeded')

  // ────────────────────────────────────────────────────────────
  // 6. TASKS
  // ────────────────────────────────────────────────────────────

  const tasksData = [
    { title: 'SANTRACK User Training — Session 1', description: 'Conduct first training session for East African Seed Ltd staff.', projectId: createdProjects['SANTRACK Implementation'], assignedToId: aliceUser.id, assignedById: adminUser.id, priority: 'HIGH' as const, deadline: new Date('2026-11-15'), status: 'IN_PROGRESS' as const, estimatedHours: 8 },
    { title: 'Prepare EVS Site Survey Report', description: 'Complete physical site survey at SABBAN ABATTOIR and submit report.', projectId: createdProjects['EVS System — 90 Employees'], assignedToId: bobUser.id, assignedById: adminUser.id, priority: 'URGENT' as const, deadline: new Date('2026-11-15'), status: 'ASSIGNED' as const, estimatedHours: 6 },
    { title: 'Deploy SANTRACK on N&T Server', description: 'Install and configure SANTRACK on client server environment.', projectId: createdProjects['SANTRACK Stock Management'], assignedToId: bobUser.id, assignedById: adminUser.id, priority: 'HIGH' as const, deadline: new Date('2026-12-01'), status: 'IN_PROGRESS' as const, estimatedHours: 16 },
    { title: 'Send EVS Proposal to ECOBANK', description: 'Finalize and email EVS + SANHR IMS proposal to KAMIKAZI at ECOBANK.', assignedToId: aliceUser.id, assignedById: adminUser.id, priority: 'URGENT' as const, deadline: new Date('2026-10-28'), status: 'REVIEW' as const, estimatedHours: 4, actualHours: 3.5 },
    { title: 'Monthly Performance Report — October', description: 'Compile and submit October performance metrics to management.', assignedToId: claireUser.id, assignedById: adminUser.id, priority: 'MEDIUM' as const, deadline: new Date('2026-10-31'), status: 'ASSIGNED' as const, estimatedHours: 5 },
    { title: 'Follow Up — NYARUGENGE HOSPITAL Contract', description: 'Call secretary to confirm Director approval for EVS proposal.', assignedToId: aliceUser.id, assignedById: adminUser.id, priority: 'HIGH' as const, deadline: new Date('2026-11-01'), status: 'CREATED' as const, estimatedHours: 2 },
    { title: 'Update Website SEO — Rwanda Mountain Ride', description: 'Apply final SEO optimizations before handover.', projectId: createdProjects['Company Website'], assignedToId: bobUser.id, assignedById: adminUser.id, priority: 'LOW' as const, deadline: new Date('2026-09-29'), status: 'APPROVED' as const, estimatedHours: 4, actualHours: 4 },
    { title: 'Prepare Invoice INV-2026-002', description: 'Issue second milestone invoice to East African Seed Ltd.', assignedToId: davidUser.id, assignedById: adminUser.id, priority: 'MEDIUM' as const, deadline: new Date('2026-12-01'), status: 'ASSIGNED' as const, estimatedHours: 2 },
  ]

  for (const t of tasksData) {
    const existing = await prisma.task.findFirst({ where: { title: t.title } })
    if (!existing) await prisma.task.create({ data: t })
  }
  console.log('✅ Tasks seeded')

  // ────────────────────────────────────────────────────────────
  // 7. SALES PIPELINE / OPPORTUNITIES
  // ────────────────────────────────────────────────────────────

  const oppsData = [
    { name: 'EVS System — SABBAN ABATTOIR', clientId: createdClients['SABBAN ABATTOIR'], stage: 'NEGOTIATION' as const, estimatedValue: 12000000, probability: 80, expectedCloseDate: new Date('2026-11-01'), assignedToId: aliceUser.id, notes: '90 employees. System for attendance, client records and equipment tracking.', nextAction: 'Call HR THEONESTE to confirm board decision', followUpDate: new Date('2026-10-30') },
    { name: 'EVS + SANHR IMS — ECOBANK', clientId: createdClients['ECOBANK Rwanda'], stage: 'PROPOSAL' as const, estimatedValue: 8000000, probability: 60, expectedCloseDate: new Date('2026-11-15'), assignedToId: aliceUser.id, notes: 'Requested 2 project proposals with screenshots.', nextAction: 'Send completed proposal document', followUpDate: new Date('2026-10-28') },
    { name: 'SANTRACK — N&T PLASTIC INDUSTRIES', clientId: createdClients['N&T PLASTIC INDUSTRIES'], stage: 'WON' as const, estimatedValue: 3000000, probability: 100, expectedCloseDate: new Date('2026-09-30'), assignedToId: aliceUser.id, notes: 'Contract signed. Project in progress.', nextAction: 'Monitor project delivery', followUpDate: null },
    { name: 'EVS — NYARUGENGE HOSPITAL', clientId: createdClients['NYARUGENGE HOSPITAL'], stage: 'PROPOSAL' as const, estimatedValue: 15000000, probability: 55, expectedCloseDate: new Date('2026-12-01'), assignedToId: aliceUser.id, notes: 'Sent full EVS proposal. Waiting for director approval.', nextAction: 'Call Secretary for appointment update', followUpDate: new Date('2026-11-01') },
    { name: 'EVS — Serena Hotel', clientId: createdClients['Serena Hotel'], stage: 'CONTACTED' as const, estimatedValue: 10000000, probability: 25, expectedCloseDate: new Date('2026-11-30'), assignedToId: aliceUser.id, notes: 'Top manager interested. Need to meet security manager.', nextAction: 'Call security manager to schedule demo', followUpDate: new Date('2026-11-05') },
    { name: 'SANTRACK — KABUYE SUGAR WORKS', clientId: createdClients['KABUYE SUGAR WORKS'], stage: 'QUALIFIED' as const, estimatedValue: 5000000, probability: 45, expectedCloseDate: new Date('2026-11-15'), assignedToId: aliceUser.id, notes: 'Security manager liked EVS. Currently use books + fingerprints.', nextAction: 'Schedule full system demo', followUpDate: new Date('2026-11-02') },
    { name: 'EVS — GAMICO LTD', clientId: createdClients['GAMICO LTD'], stage: 'REQUIREMENT_ANALYSIS' as const, estimatedValue: 7000000, probability: 50, expectedCloseDate: new Date('2026-11-20'), assignedToId: aliceUser.id, notes: 'ABEL will arrange meeting with HR, IT and Security Manager.', nextAction: 'Present system to HR, IT and Security team', followUpDate: new Date('2026-11-03') },
  ]

  for (const o of oppsData) {
    const existing = await prisma.opportunity.findFirst({ where: { name: o.name } })
    if (!existing) await prisma.opportunity.create({ data: { ...o, currency: 'RWF' } })
  }
  console.log('✅ Sales pipeline / opportunities seeded')

  // ────────────────────────────────────────────────────────────
  // 8. FIELD VISITS
  // ────────────────────────────────────────────────────────────

  const visitsData = [
    { visitDate: new Date('2026-09-16'), companyName: 'N&T PLASTIC INDUSTRIES', category: 'INDUSTRY' as const, location: 'Kigali', contactName: 'MUGISHA', contactPhone: '0780601661', needsAndObservation: 'Looking for stock management solution. Currently doing manual tracking.', whatSantechCanSell: 'SANTRACK Stock Module', outcome: 'NEGOTIATION' as const, followUpDate: new Date('2026-10-12'), contractWon: true, recordedById: aliceUser.id, clientId: createdClients['N&T PLASTIC INDUSTRIES'] },
    { visitDate: new Date('2026-09-22'), companyName: 'NYARUGENGE HOSPITAL', category: 'INSTITUTION' as const, location: 'Kigali', contactName: 'Ange Police NSENGIYUMVA', contactPhone: '0785744154', needsAndObservation: 'Need biometric access control for hospital zones.', whatSantechCanSell: 'EVS Enterprise', outcome: 'PROPOSAL' as const, followUpDate: new Date('2026-11-01'), contractWon: false, recordedById: aliceUser.id, clientId: createdClients['NYARUGENGE HOSPITAL'] },
    { visitDate: new Date('2026-09-25'), companyName: 'Serena Hotel', category: 'SELF_EMPLOYED' as const, location: 'Kigali', contactName: 'Security Manager', contactPhone: '0788200454', needsAndObservation: 'Top manager interested in EVS for hotel access control.', whatSantechCanSell: 'EVS Hotel Edition', outcome: 'INTERESTED' as const, followUpDate: new Date('2026-11-05'), contractWon: false, recordedById: aliceUser.id, clientId: createdClients['Serena Hotel'] },
    { visitDate: new Date('2026-09-29'), companyName: 'ECOBANK Rwanda', category: 'INSTITUTION' as const, location: 'Kigali', contactName: 'KAMIKAZI', contactPhone: '0786740490', needsAndObservation: 'Requested EVS + HR IMS proposals with screenshots.', whatSantechCanSell: 'EVS + SANHR IMS', outcome: 'PROPOSAL' as const, followUpDate: new Date('2026-10-28'), contractWon: false, recordedById: aliceUser.id, clientId: createdClients['ECOBANK Rwanda'] },
    { visitDate: new Date('2026-09-30'), companyName: 'KABUYE SUGAR WORKS', category: 'INDUSTRY' as const, location: 'Kigali', contactName: 'Claude', contactPhone: '0788531586', needsAndObservation: 'Security manager interested. Use books and fingerprints currently.', whatSantechCanSell: 'EVS + SANTRACK', outcome: 'INTERESTED' as const, followUpDate: new Date('2026-11-02'), contractWon: false, recordedById: aliceUser.id, clientId: createdClients['KABUYE SUGAR WORKS'] },
    { visitDate: new Date('2026-10-07'), companyName: 'GAMICO LTD', category: 'INDUSTRY' as const, location: 'Kigali', contactName: 'ABEL', contactPhone: '0785024796', needsAndObservation: 'ABEL will arrange meeting with HR, IT and Security Manager.', whatSantechCanSell: 'EVS Enterprise', outcome: 'FOLLOW_UP' as const, followUpDate: new Date('2026-11-03'), contractWon: false, recordedById: aliceUser.id, clientId: createdClients['GAMICO LTD'] },
  ]

  for (const v of visitsData) {
    const existing = await prisma.fieldVisit.findFirst({ where: { companyName: v.companyName, visitDate: v.visitDate } })
    if (!existing) await prisma.fieldVisit.create({ data: v })
  }
  console.log('✅ Field visits seeded')

  // ────────────────────────────────────────────────────────────
  // 9. AUDIT LOG SAMPLES
  // ────────────────────────────────────────────────────────────

  const auditItems = [
    { userId: adminUser.id, action: 'CREATE', entity: 'Invoice', entityId: 'INV-2026-001', oldValue: null, newValue: { amount: 750000, status: 'PAID' } as object },
    { userId: aliceUser.id, action: 'UPDATE', entity: 'Opportunity', entityId: 'opp-sabban', oldValue: { stage: 'PROPOSAL' } as object, newValue: { stage: 'NEGOTIATION' } as object },
    { userId: davidUser.id, action: 'RECORD_PAYMENT', entity: 'Payment', entityId: 'pay-001', oldValue: null, newValue: { amount: 750000, method: 'Bank Transfer' } as object },
    { userId: bobUser.id, action: 'CREATE', entity: 'Project', entityId: 'proj-evs-sabban', oldValue: null, newValue: { name: 'EVS System — 90 Employees', status: 'PLANNING' } as object },
    { userId: claireUser.id, action: 'UPDATE', entity: 'Employee', entityId: 'ST-004', oldValue: { status: 'ACTIVE' } as object, newValue: { status: 'ON_LEAVE' } as object },
  ]

  for (const a of auditItems) {
    await prisma.auditLog.create({
      data: { userId: a.userId, action: a.action, entity: a.entity, entityId: a.entityId, oldValue: a.oldValue ?? undefined, newValue: a.newValue }
    }).catch(() => null)
  }
  console.log('✅ Audit log samples seeded')

  console.log('\n🎉 All seed data loaded successfully!')
  console.log('\n📋 Demo Login Credentials:')
  console.log('   Admin:   admin@santech.rw  / Santech@2026')
  console.log('   Sales:   alice@santech.rw  / Santech@2026')
  console.log('   Dev:     bob@santech.rw    / Santech@2026')
  console.log('   Finance: david@santech.rw  / Santech@2026')
}

main()
  .catch(e => { console.error('❌ Seed error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())