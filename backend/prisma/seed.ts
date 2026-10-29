/**
 * SAN-BMS Seed File — Demo data for supervisor presentation
 * Run: npx prisma db seed
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { seedFinanceAndWorkflows } from './seeds/financeAndWorkflows'
import { seedSalesAndOperations } from './seeds/salesAndOperations'
import { seedActivity } from './seeds/activity'
import { seedGrowth } from './seeds/growth'
import { seedOffice } from './seeds/office'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding SAN-BMS database...')

  const password = await bcrypt.hash('Santech@2026', 12)

  // ── 1. USERS ──────────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@santech.rw' },
    update: {},
    create: { firstName: 'System', lastName: 'Admin', email: 'admin@santech.rw', password, phone: '0788000000', role: 'SUPER_ADMIN', isActive: true },
  })
  const aliceUser = await prisma.user.upsert({
    where: { email: 'alice@santech.rw' },
    update: {},
    create: { firstName: 'Alice', lastName: 'Uwimana', email: 'alice@santech.rw', password, phone: '0788100001', role: 'SALES_STAFF', isActive: true },
  })
  const bobUser = await prisma.user.upsert({
    where: { email: 'bob@santech.rw' },
    update: {},
    create: { firstName: 'Bob', lastName: 'Nkurunziza', email: 'bob@santech.rw', password, phone: '0788100002', role: 'PROJECT_MANAGER', isActive: true },
  })
  const claireUser = await prisma.user.upsert({
    where: { email: 'claire@santech.rw' },
    update: {},
    create: { firstName: 'Claire', lastName: 'Mukamana', email: 'claire@santech.rw', password, phone: '0788100003', role: 'ADMIN', isActive: true },
  })
  const davidUser = await prisma.user.upsert({
    where: { email: 'david@santech.rw' },
    update: {},
    create: { firstName: 'David', lastName: 'Habimana', email: 'david@santech.rw', password, phone: '0788100004', role: 'FINANCE_MANAGER', isActive: true },
  })
  const eveUser = await prisma.user.upsert({
    where: { email: 'eve@santech.rw' },
    update: {},
    create: { firstName: 'Eve', lastName: 'Ingabire', email: 'eve@santech.rw', password, phone: '0788100005', role: 'MARKETING_MANAGER', isActive: true },
  })
  const frankUser = await prisma.user.upsert({
    where: { email: 'frank@santech.rw' },
    update: {},
    create: { firstName: 'Frank', lastName: 'Bizimana', email: 'frank@santech.rw', password, phone: '0788100006', role: 'EMPLOYEE', isActive: true },
  })
  console.log('✅ Users seeded')

  // ── 2. EMPLOYEES ──────────────────────────────────────────
  const aliceEmp = await prisma.employee.upsert({
    where: { employeeCode: 'ST-001' },
    update: {},
    create: { userId: aliceUser.id, employeeCode: 'ST-001', department: 'Sales & Marketing', position: 'Sales Executive', hireDate: new Date('2024-03-01'), employmentStatus: 'ACTIVE', baseSalary: 350000, currency: 'RWF', performanceScore: 82, skills: ['CRM', 'Field Sales'] },
  })
  const bobEmp = await prisma.employee.upsert({
    where: { employeeCode: 'ST-002' },
    update: {},
    create: { userId: bobUser.id, employeeCode: 'ST-002', department: 'IT', position: 'Software Developer', hireDate: new Date('2024-01-15'), employmentStatus: 'ACTIVE', baseSalary: 600000, currency: 'RWF', performanceScore: 91, skills: ['React', 'Node.js', 'PostgreSQL'] },
  })
  const claireEmp = await prisma.employee.upsert({
    where: { employeeCode: 'ST-003' },
    update: {},
    create: { userId: claireUser.id, employeeCode: 'ST-003', department: 'HR', position: 'HR Manager', hireDate: new Date('2023-09-01'), employmentStatus: 'ACTIVE', baseSalary: 500000, currency: 'RWF', performanceScore: 78, skills: ['HR Management', 'Payroll'] },
  })
  const davidEmp = await prisma.employee.upsert({
    where: { employeeCode: 'ST-004' },
    update: {},
    create: { userId: davidUser.id, employeeCode: 'ST-004', department: 'Finance', position: 'Accountant', hireDate: new Date('2024-06-01'), employmentStatus: 'ON_LEAVE', baseSalary: 450000, currency: 'RWF', performanceScore: 65, skills: ['Accounting', 'QuickBooks'] },
  })
  const eveEmp = await prisma.employee.upsert({
    where: { employeeCode: 'ST-005' },
    update: {},
    create: { userId: eveUser.id, employeeCode: 'ST-005', department: 'Sales & Marketing', position: 'Marketing Officer', hireDate: new Date('2025-01-10'), employmentStatus: 'ACTIVE', baseSalary: 320000, currency: 'RWF', performanceScore: 74, skills: ['Digital Marketing', 'Social Media'] },
  })
  const frankEmp = await prisma.employee.upsert({
    where: { employeeCode: 'ST-006' },
    update: {},
    create: { userId: frankUser.id, employeeCode: 'ST-006', department: 'IT', position: 'System Administrator', hireDate: new Date('2023-11-01'), employmentStatus: 'ACTIVE', baseSalary: 480000, currency: 'RWF', performanceScore: 88, skills: ['Linux', 'Networking', 'Security'] },
  })

  // Salary records
  for (const { emp, net } of [
    { emp: aliceEmp, net: 350000 }, { emp: bobEmp, net: 600000 },
    { emp: claireEmp, net: 500000 }, { emp: davidEmp, net: 450000 },
    { emp: eveEmp, net: 320000 }, { emp: frankEmp, net: 480000 },
  ]) {
    await prisma.salaryRecord.upsert({
      where: { employeeId_month_year: { employeeId: emp.id, month: 10, year: 2026 } },
      update: {},
      create: { employeeId: emp.id, month: 10, year: 2026, baseSalary: net, bonuses: 0, deductions: 0, netSalary: net, currency: 'RWF', isPaid: true, paidAt: new Date('2026-10-25') },
    })
  }
  console.log('✅ Employees and salary records seeded')

  // ── 3. CLIENTS ────────────────────────────────────────────
  const clientRows = [
    { id: 'cl-easeed',   companyName: 'East African Seed Ltd',    category: 'INDUSTRY' as const,      status: 'CONTRACTOR' as const, phone: '0788400001', email: 'info@easeed.rw',              location: 'Kigali', industry: 'Agriculture',    kind: 'BUSINESS' as const, tinNumber: '100000001', active: true },
    { id: 'cl-sabban',   companyName: 'SABBAN ABATTOIR',          category: 'INDUSTRY' as const,      status: 'QUALIFIED' as const,  phone: '0788846240', email: 'hr@sabban.rw',                location: 'Kigali', industry: 'Food Processing',kind: 'BUSINESS' as const, tinNumber: '100000002', active: true },
    { id: 'cl-rmride',   companyName: 'Rwanda Mountain Ride',     category: 'SELF_EMPLOYED' as const, status: 'CONTRACTOR' as const, phone: '0788400003', email: 'info@rwandamtride.rw',        location: 'Kigali', industry: 'Tourism',        kind: 'BUSINESS' as const, tinNumber: '100000003', active: true },
    { id: 'cl-ntplast',  companyName: 'N&T PLASTIC INDUSTRIES',   category: 'INDUSTRY' as const,      status: 'CONTRACTOR' as const, phone: '0780601661', email: 'info@ntplastic.rw',           location: 'Kigali', industry: 'Manufacturing',  kind: 'BUSINESS' as const, tinNumber: '100000004', active: true },
    { id: 'cl-ecobank',  companyName: 'ECOBANK Rwanda',           category: 'INSTITUTION' as const,   status: 'QUALIFIED' as const,  phone: '0786740490', email: 'info@ecobank.rw',             location: 'Kigali', industry: 'Banking',        kind: 'BUSINESS' as const, tinNumber: '100000005', active: true },
    { id: 'cl-hospital', companyName: 'NYARUGENGE HOSPITAL',      category: 'INSTITUTION' as const,   status: 'QUALIFIED' as const,  phone: '0785744154', email: 'info@nyarugenge-hospital.rw', location: 'Kigali', industry: 'Healthcare',     kind: 'BUSINESS' as const, tinNumber: '100000006', active: true },
    { id: 'cl-cta',      companyName: 'Capital Transport Agency', category: 'INSTITUTION' as const,   status: 'PROSPECT' as const,   phone: '0788400007', email: 'info@cta.rw',                 location: 'Kigali', industry: 'Transport',      kind: 'BUSINESS' as const, tinNumber: '100000007', active: true },
    { id: 'cl-kabuye',   companyName: 'KABUYE SUGAR WORKS',       category: 'INDUSTRY' as const,      status: 'QUALIFIED' as const,  phone: '0788531586', email: 'info@kabuye.rw',              location: 'Kigali', industry: 'Food Processing',kind: 'BUSINESS' as const, tinNumber: '100000008', active: true },
    { id: 'cl-serena',   companyName: 'Serena Hotel',             category: 'SELF_EMPLOYED' as const, status: 'PROSPECT' as const,   phone: '0788200454', email: 'info@serena.rw',              location: 'Kigali', industry: 'Hospitality',    kind: 'BUSINESS' as const, tinNumber: '100000009', active: true },
    { id: 'cl-gamico',   companyName: 'GAMICO LTD',               category: 'INDUSTRY' as const,      status: 'LEAD' as const,       phone: '0785024796', email: 'abel@gamico.rw',              location: 'Kigali', industry: 'Manufacturing',  kind: 'BUSINESS' as const, tinNumber: '100000010', active: true },
    // Individual clients
    { id: 'cl-ind-jp',   companyName: 'Jean Pierre Habimana',     category: 'SELF_EMPLOYED' as const, status: 'PROSPECT' as const,   phone: '0788100010', email: 'jp@gmail.com',                location: 'Kigali', industry: 'Individual',     kind: 'INDIVIDUAL' as const, fullName: 'Jean Pierre Habimana', active: true },
    { id: 'cl-ind-cl',   companyName: 'Claudine Uwase',           category: 'SELF_EMPLOYED' as const, status: 'PROSPECT' as const,   phone: '0785300001', email: 'claudine@gmail.com',           location: 'Musanze', industry: 'Individual',    kind: 'INDIVIDUAL' as const, fullName: 'Claudine Uwase', idNumber: '1199870012345678', active: true },
  ]

  const createdClients: Record<string, string> = {}
  for (const c of clientRows) {
    const { id, ...data } = c
    const client = await prisma.client.upsert({
      where: { id },
      update: {},
      create: { id, ...data, clientType: 'ACQUISITION', assignedToId: aliceUser.id, services: [] },
    })
    createdClients[c.companyName] = client.id
  }
  console.log('✅ Clients seeded')

  // ── 4. CONTRACTS ──────────────────────────────────────────
  const contractRows = [
    { id: 'ct-2026-001', contractNumber: 'CT-2026-001', clientId: createdClients['East African Seed Ltd'],   projectName: 'SANTRACK Implementation',        value: 1500000,  currency: 'RWF', startDate: new Date('2026-08-01'), endDate: new Date('2026-12-31'), paymentTerms: '50% upfront, 50% on delivery',                  status: 'ACTIVE' as const,    responsibleManagerId: aliceUser.id, signedAt: new Date('2026-07-25') },
    { id: 'ct-2026-002', contractNumber: 'CT-2026-002', clientId: createdClients['SABBAN ABATTOIR'],         projectName: 'EVS System — 90 Employees',      value: 12000000, currency: 'RWF', startDate: new Date('2026-11-01'), endDate: new Date('2027-04-30'), paymentTerms: '30% signing, 40% installation, 30% handover',   status: 'SIGNING' as const,   responsibleManagerId: bobUser.id },
    { id: 'ct-2026-003', contractNumber: 'CT-2026-003', clientId: createdClients['Rwanda Mountain Ride'],    projectName: 'Company Website',                value: 800000,   currency: 'RWF', startDate: new Date('2026-07-01'), endDate: new Date('2026-09-30'), paymentTerms: 'Full payment on delivery',                       status: 'COMPLETED' as const, responsibleManagerId: aliceUser.id, signedAt: new Date('2026-06-28') },
    { id: 'ct-2026-004', contractNumber: 'CT-2026-004', clientId: createdClients['N&T PLASTIC INDUSTRIES'],  projectName: 'SANTRACK Stock Management',       value: 3000000,  currency: 'RWF', startDate: new Date('2026-09-15'), endDate: new Date('2027-02-28'), paymentTerms: '50% upfront, 50% on go-live',                   status: 'ACTIVE' as const,    responsibleManagerId: aliceUser.id, signedAt: new Date('2026-09-10') },
    { id: 'ct-2026-005', contractNumber: 'CT-2026-005', clientId: createdClients['ECOBANK Rwanda'],          projectName: 'EVS + SANHR IMS',                value: 8000000,  currency: 'RWF', startDate: new Date('2026-10-01'), endDate: new Date('2027-03-31'), paymentTerms: 'Milestone-based payments',                       status: 'REVIEW' as const,    responsibleManagerId: bobUser.id },
  ]
  const createdContracts: Record<string, string> = {}
  for (const c of contractRows) {
    const { id, ...data } = c
    const contract = await prisma.contract.upsert({ where: { contractNumber: c.contractNumber }, update: {}, create: { id, ...data } })
    createdContracts[c.contractNumber] = contract.id
  }
  console.log('✅ Contracts seeded')

  // ── 5. PROJECTS ───────────────────────────────────────────
  const projectRows = [
    { id: 'proj-santrack',  name: 'SANTRACK Implementation',       clientId: createdClients['East African Seed Ltd'],   contractId: createdContracts['CT-2026-001'], projectManagerId: aliceUser.id,  budget: 1500000,  contractValue: 1500000,  currency: 'RWF', startDate: new Date('2026-08-01'), endDate: new Date('2026-12-31'), priority: 'HIGH' as const,   status: 'IN_PROGRESS' as const, progress: 70,  description: 'Full SANTRACK ERP implementation.' },
    { id: 'proj-evs-sabban',name: 'EVS System — 90 Employees',    clientId: createdClients['SABBAN ABATTOIR'],          contractId: createdContracts['CT-2026-002'], projectManagerId: bobUser.id,    budget: 12000000, contractValue: 12000000, currency: 'RWF', startDate: new Date('2026-11-01'), endDate: new Date('2027-04-30'), priority: 'URGENT' as const, status: 'PLANNING' as const,    progress: 0,   description: 'Enterprise EVS for 90 employees.' },
    { id: 'proj-website',   name: 'Company Website',               clientId: createdClients['Rwanda Mountain Ride'],    contractId: createdContracts['CT-2026-003'], projectManagerId: aliceUser.id,  budget: 800000,   contractValue: 800000,   currency: 'RWF', startDate: new Date('2026-07-01'), endDate: new Date('2026-09-30'), priority: 'MEDIUM' as const, status: 'COMPLETED' as const,   progress: 100, description: 'Corporate website design.' },
    { id: 'proj-stock',     name: 'SANTRACK Stock Management',     clientId: createdClients['N&T PLASTIC INDUSTRIES'],  contractId: createdContracts['CT-2026-004'], projectManagerId: claireUser.id, budget: 3000000,  contractValue: 3000000,  currency: 'RWF', startDate: new Date('2026-09-15'), endDate: new Date('2027-02-28'), priority: 'HIGH' as const,   status: 'IN_PROGRESS' as const, progress: 30,  description: 'Stock and inventory module.' },
    { id: 'proj-hospital',  name: 'EVS Hospital Access Control',   clientId: createdClients['NYARUGENGE HOSPITAL'],                                                  projectManagerId: bobUser.id,    budget: 15000000, contractValue: 15000000, currency: 'RWF', startDate: new Date('2026-12-01'), endDate: new Date('2027-06-30'), priority: 'HIGH' as const,   status: 'NOT_STARTED' as const, progress: 0,   description: 'Biometric access control.' },
    { id: 'proj-cta',       name: 'Custom Driver Management System',clientId: createdClients['Capital Transport Agency'],                                             projectManagerId: claireUser.id, budget: 5000000,  contractValue: 5000000,  currency: 'RWF', startDate: new Date('2026-11-15'), endDate: new Date('2027-05-31'), priority: 'MEDIUM' as const, status: 'PLANNING' as const,    progress: 0,   description: 'Driver licensing and trip management.' },
  ]
  const createdProjects: Record<string, string> = {}
  for (const p of projectRows) {
    const { id, ...data } = p
    const project = await prisma.project.upsert({ where: { id }, update: {}, create: { id, ...data } })
    createdProjects[p.name] = project.id
  }

  // Milestones
  const milestoneGroups = [
    { proj: 'SANTRACK Implementation',    items: [{ name: 'Requirements Gathering', deadline: new Date('2026-08-15'), done: true, pct: 0 }, { name: 'System Setup & Configuration', deadline: new Date('2026-09-30'), done: true, pct: 50 }, { name: 'User Training', deadline: new Date('2026-11-15'), done: false, pct: 0 }, { name: 'Go-Live & Handover', deadline: new Date('2026-12-31'), done: false, pct: 50 }] },
    { proj: 'EVS System — 90 Employees',  items: [{ name: 'Site Survey', deadline: new Date('2026-11-15'), done: false, pct: 30 }, { name: 'Hardware Procurement', deadline: new Date('2026-12-15'), done: false, pct: 0 }, { name: 'Installation & Testing', deadline: new Date('2027-02-28'), done: false, pct: 40 }, { name: 'Training & Handover', deadline: new Date('2027-04-30'), done: false, pct: 30 }] },
    { proj: 'Company Website',            items: [{ name: 'Design Approved', deadline: new Date('2026-07-31'), done: true, pct: 0 }, { name: 'Development Complete', deadline: new Date('2026-08-31'), done: true, pct: 0 }, { name: 'Launch & Handover', deadline: new Date('2026-09-30'), done: true, pct: 100 }] },
    { proj: 'SANTRACK Stock Management',  items: [{ name: 'Discovery & Analysis', deadline: new Date('2026-10-15'), done: true, pct: 50 }, { name: 'Configuration & Setup', deadline: new Date('2026-12-15'), done: false, pct: 0 }, { name: 'Staff Training', deadline: new Date('2027-01-31'), done: false, pct: 50 }] },
  ]
  for (const { proj, items } of milestoneGroups) {
    const pid = createdProjects[proj]
    if (!pid) continue
    for (const m of items) {
      const exists = await prisma.milestone.findFirst({ where: { projectId: pid, name: m.name } })
      if (!exists) await prisma.milestone.create({ data: { projectId: pid, name: m.name, deadline: m.deadline, paymentPercentage: m.pct, isCompleted: m.done, completedAt: m.done ? m.deadline : null } })
    }
  }
  console.log('✅ Projects and milestones seeded')

  // ── 6. INVOICES & PAYMENTS ────────────────────────────────
  const invoiceRows = [
    { id: 'inv-001', invoiceNumber: 'INV-2026-001', clientId: createdClients['East African Seed Ltd'],   contractId: createdContracts['CT-2026-001'], amount: 750000,  taxAmount: 0, totalAmount: 750000,  paidAmount: 750000,  currency: 'RWF', issueDate: new Date('2026-10-01'), dueDate: new Date('2026-10-15'), status: 'PAID' as const,             notes: '50% upfront',   pay: { amount: 750000,  date: new Date('2026-10-02'), method: 'Bank Transfer',  ref: 'BNK-2026-1001' } },
    { id: 'inv-002', invoiceNumber: 'INV-2026-002', clientId: createdClients['East African Seed Ltd'],   contractId: createdContracts['CT-2026-001'], amount: 750000,  taxAmount: 0, totalAmount: 750000,  paidAmount: 0,       currency: 'RWF', issueDate: new Date('2026-12-01'), dueDate: new Date('2026-12-15'), status: 'DUE' as const,              notes: '50% on delivery', pay: null },
    { id: 'inv-003', invoiceNumber: 'INV-2026-003', clientId: createdClients['Rwanda Mountain Ride'],    contractId: createdContracts['CT-2026-003'], amount: 800000,  taxAmount: 0, totalAmount: 800000,  paidAmount: 800000,  currency: 'RWF', issueDate: new Date('2026-09-28'), dueDate: new Date('2026-10-07'), status: 'PAID' as const,             notes: 'Full payment',  pay: { amount: 800000,  date: new Date('2026-09-30'), method: 'Mobile Money',   ref: 'MTN-20260930' } },
    { id: 'inv-004', invoiceNumber: 'INV-2026-004', clientId: createdClients['N&T PLASTIC INDUSTRIES'],  contractId: createdContracts['CT-2026-004'], amount: 3000000, taxAmount: 0, totalAmount: 3000000, paidAmount: 1500000, currency: 'RWF', issueDate: new Date('2026-10-15'), dueDate: new Date('2026-10-30'), status: 'PARTIALLY_PAID' as const,   notes: 'Partial payment', pay: { amount: 1500000, date: new Date('2026-10-18'), method: 'Bank Transfer',  ref: 'BNK-2026-1045' } },
    { id: 'inv-005', invoiceNumber: 'INV-2026-005', clientId: createdClients['ECOBANK Rwanda'],          contractId: createdContracts['CT-2026-005'], amount: 2000000, taxAmount: 0, totalAmount: 2000000, paidAmount: 0,       currency: 'RWF', issueDate: new Date('2026-10-08'), dueDate: new Date('2026-10-22'), status: 'OVERDUE' as const,          notes: 'Signing payment overdue', pay: null },
    { id: 'inv-006', invoiceNumber: 'INV-2026-006', clientId: createdClients['SABBAN ABATTOIR'],         contractId: createdContracts['CT-2026-002'], amount: 3600000, taxAmount: 0, totalAmount: 3600000, paidAmount: 0,       currency: 'RWF', issueDate: new Date('2026-11-01'), dueDate: new Date('2026-11-15'), status: 'DRAFT' as const,            notes: '30% on signing draft', pay: null },
  ]
  for (const inv of invoiceRows) {
    const { id, pay, ...data } = inv
    const existing = await prisma.invoice.upsert({ where: { invoiceNumber: inv.invoiceNumber }, update: {}, create: { id, ...data } })
    if (pay) {
      const payExists = await prisma.payment.findFirst({ where: { invoiceId: existing.id } })
      if (!payExists) await prisma.payment.create({ data: { invoiceId: existing.id, amount: pay.amount, currency: 'RWF', paymentDate: pay.date, paymentMethod: pay.method, reference: pay.ref } })
    }
  }
  console.log('✅ Invoices and payments seeded')

  // ── 7. TASKS ──────────────────────────────────────────────
  const taskRows = [
    { id: 'task-001', title: 'SANTRACK User Training — Session 1',          projectId: createdProjects['SANTRACK Implementation'],    assignedToId: aliceUser.id, assignedById: adminUser.id, priority: 'HIGH' as const,   deadline: new Date('2026-11-15'), status: 'IN_PROGRESS' as const,      estimatedHours: 8,   description: 'Conduct first training session for East African Seed Ltd staff.' },
    { id: 'task-002', title: 'Prepare EVS Site Survey Report',               projectId: createdProjects['EVS System — 90 Employees'],  assignedToId: bobUser.id,   assignedById: adminUser.id, priority: 'URGENT' as const, deadline: new Date('2026-11-15'), status: 'ASSIGNED' as const,         estimatedHours: 6,   description: 'Complete physical site survey at SABBAN ABATTOIR.' },
    { id: 'task-003', title: 'Deploy SANTRACK on N&T Server',                projectId: createdProjects['SANTRACK Stock Management'],   assignedToId: bobUser.id,   assignedById: adminUser.id, priority: 'HIGH' as const,   deadline: new Date('2026-12-01'), status: 'IN_PROGRESS' as const,      estimatedHours: 16,  description: 'Install and configure SANTRACK on client server.' },
    { id: 'task-004', title: 'Send EVS Proposal to ECOBANK',                                                                           assignedToId: aliceUser.id, assignedById: adminUser.id, priority: 'URGENT' as const, deadline: new Date('2026-10-28'), status: 'REVIEW' as const,           estimatedHours: 4,   actualHours: 3.5, description: 'Finalize and email EVS + SANHR IMS proposal to KAMIKAZI.' },
    { id: 'task-005', title: 'Monthly Performance Report — October',                                                                   assignedToId: claireUser.id,assignedById: adminUser.id, priority: 'MEDIUM' as const, deadline: new Date('2026-10-31'), status: 'ASSIGNED' as const,         estimatedHours: 5,   description: 'Compile October performance metrics.' },
    { id: 'task-006', title: 'Follow Up — NYARUGENGE HOSPITAL Contract',                                                               assignedToId: aliceUser.id, assignedById: adminUser.id, priority: 'HIGH' as const,   deadline: new Date('2026-11-01'), status: 'CREATED' as const,          estimatedHours: 2,   description: 'Call secretary to confirm Director approval.' },
    { id: 'task-007', title: 'Update Website SEO — Rwanda Mountain Ride',   projectId: createdProjects['Company Website'],             assignedToId: bobUser.id,   assignedById: adminUser.id, priority: 'LOW' as const,    deadline: new Date('2026-09-29'), status: 'APPROVED' as const,         estimatedHours: 4,   actualHours: 4, description: 'Apply final SEO optimizations.' },
    { id: 'task-008', title: 'Prepare Invoice INV-2026-002',                                                                           assignedToId: davidUser.id, assignedById: adminUser.id, priority: 'MEDIUM' as const, deadline: new Date('2026-12-01'), status: 'ASSIGNED' as const,         estimatedHours: 2,   description: 'Issue second milestone invoice to East African Seed Ltd.' },
  ]
  for (const t of taskRows) {
    const { id, ...data } = t
    await prisma.task.upsert({ where: { id }, update: {}, create: { id, ...data } })
  }
  console.log('✅ Tasks seeded')

  // ── 8. OPPORTUNITIES ──────────────────────────────────────
  const oppRows = [
    { id: 'opp-sabban',   name: 'EVS System — SABBAN ABATTOIR',         clientId: createdClients['SABBAN ABATTOIR'],          stage: 'NEGOTIATION' as const,         estimatedValue: 12000000, probability: 80,  expectedCloseDate: new Date('2026-11-01'), assignedToId: aliceUser.id, currency: 'RWF', notes: '90 employees.' },
    { id: 'opp-ecobank',  name: 'EVS + SANHR IMS — ECOBANK',            clientId: createdClients['ECOBANK Rwanda'],           stage: 'PROPOSAL' as const,            estimatedValue: 8000000,  probability: 60,  expectedCloseDate: new Date('2026-11-15'), assignedToId: aliceUser.id, currency: 'RWF', notes: 'Requested 2 proposals.' },
    { id: 'opp-ntplast',  name: 'SANTRACK — N&T PLASTIC',               clientId: createdClients['N&T PLASTIC INDUSTRIES'],   stage: 'WON' as const,                 estimatedValue: 3000000,  probability: 100, expectedCloseDate: new Date('2026-09-30'), assignedToId: aliceUser.id, currency: 'RWF', notes: 'Contract signed.' },
    { id: 'opp-hospital', name: 'EVS — NYARUGENGE HOSPITAL',            clientId: createdClients['NYARUGENGE HOSPITAL'],      stage: 'PROPOSAL' as const,            estimatedValue: 15000000, probability: 55,  expectedCloseDate: new Date('2026-12-01'), assignedToId: aliceUser.id, currency: 'RWF', notes: 'Waiting director approval.' },
    { id: 'opp-serena',   name: 'EVS — Serena Hotel',                   clientId: createdClients['Serena Hotel'],             stage: 'CONTACTED' as const,           estimatedValue: 10000000, probability: 25,  expectedCloseDate: new Date('2026-11-30'), assignedToId: aliceUser.id, currency: 'RWF', notes: 'Top manager interested.' },
    { id: 'opp-kabuye',   name: 'SANTRACK — KABUYE SUGAR WORKS',        clientId: createdClients['KABUYE SUGAR WORKS'],       stage: 'QUALIFIED' as const,           estimatedValue: 5000000,  probability: 45,  expectedCloseDate: new Date('2026-11-15'), assignedToId: aliceUser.id, currency: 'RWF', notes: 'Security manager interested.' },
    { id: 'opp-gamico',   name: 'EVS — GAMICO LTD',                     clientId: createdClients['GAMICO LTD'],               stage: 'REQUIREMENT_ANALYSIS' as const, estimatedValue: 7000000,  probability: 50,  expectedCloseDate: new Date('2026-11-20'), assignedToId: aliceUser.id, currency: 'RWF', notes: 'ABEL arranging meeting.' },
  ]
  for (const o of oppRows) {
    const { id, ...data } = o
    await prisma.opportunity.upsert({ where: { id }, update: {}, create: { id, ...data } })
  }
  console.log('✅ Opportunities seeded')

  // ── 9. FIELD VISITS ───────────────────────────────────────
  const visitRows = [
    { id: 'fv-001', visitDate: new Date('2026-09-16'), companyName: 'N&T PLASTIC INDUSTRIES', category: 'INDUSTRY' as const,      location: 'Kigali', contactName: 'MUGISHA',                   contactPhone: '0780601661', needsAndObservation: 'Looking for stock management solution.', whatSantechCanSell: 'SANTRACK Stock Module', outcome: 'NEGOTIATION' as const, followUpDate: new Date('2026-10-12'), contractWon: true,  recordedById: aliceUser.id, clientId: createdClients['N&T PLASTIC INDUSTRIES'] },
    { id: 'fv-002', visitDate: new Date('2026-09-22'), companyName: 'NYARUGENGE HOSPITAL',     category: 'INSTITUTION' as const,   location: 'Kigali', contactName: 'Ange Police NSENGIYUMVA', contactPhone: '0785744154', needsAndObservation: 'Need biometric access control.',          whatSantechCanSell: 'EVS Enterprise',        outcome: 'PROPOSAL' as const,    followUpDate: new Date('2026-11-01'), contractWon: false, recordedById: aliceUser.id, clientId: createdClients['NYARUGENGE HOSPITAL'] },
    { id: 'fv-003', visitDate: new Date('2026-09-25'), companyName: 'Serena Hotel',            category: 'SELF_EMPLOYED' as const, location: 'Kigali', contactName: 'Security Manager',          contactPhone: '0788200454', needsAndObservation: 'Top manager interested in EVS.',          whatSantechCanSell: 'EVS Hotel Edition',     outcome: 'INTERESTED' as const,  followUpDate: new Date('2026-11-05'), contractWon: false, recordedById: aliceUser.id, clientId: createdClients['Serena Hotel'] },
    { id: 'fv-004', visitDate: new Date('2026-09-29'), companyName: 'ECOBANK Rwanda',          category: 'INSTITUTION' as const,   location: 'Kigali', contactName: 'KAMIKAZI',                  contactPhone: '0786740490', needsAndObservation: 'Requested EVS + HR IMS proposals.',       whatSantechCanSell: 'EVS + SANHR IMS',       outcome: 'PROPOSAL' as const,    followUpDate: new Date('2026-10-28'), contractWon: false, recordedById: aliceUser.id, clientId: createdClients['ECOBANK Rwanda'] },
    { id: 'fv-005', visitDate: new Date('2026-09-30'), companyName: 'KABUYE SUGAR WORKS',      category: 'INDUSTRY' as const,      location: 'Kigali', contactName: 'Claude',                    contactPhone: '0788531586', needsAndObservation: 'Security manager interested.',            whatSantechCanSell: 'EVS + SANTRACK',        outcome: 'INTERESTED' as const,  followUpDate: new Date('2026-11-02'), contractWon: false, recordedById: aliceUser.id, clientId: createdClients['KABUYE SUGAR WORKS'] },
    { id: 'fv-006', visitDate: new Date('2026-10-07'), companyName: 'GAMICO LTD',              category: 'INDUSTRY' as const,      location: 'Kigali', contactName: 'ABEL',                      contactPhone: '0785024796', needsAndObservation: 'ABEL arranging meeting with team.',        whatSantechCanSell: 'EVS Enterprise',        outcome: 'FOLLOW_UP' as const,   followUpDate: new Date('2026-11-03'), contractWon: false, recordedById: aliceUser.id, clientId: createdClients['GAMICO LTD'] },
    { id: 'fv-007', visitDate: new Date('2026-10-10'), companyName: 'East African Seed Ltd',   category: 'INDUSTRY' as const,      location: 'Kigali', contactName: 'MUGISHA',                   contactPhone: '0788400001', needsAndObservation: 'Progress review on SANTRACK implementation.', whatSantechCanSell: 'SANTRACK',            outcome: 'NEGOTIATION' as const, followUpDate: new Date('2026-11-15'), contractWon: true,  recordedById: aliceUser.id, clientId: createdClients['East African Seed Ltd'] },
    { id: 'fv-008', visitDate: new Date('2026-10-14'), companyName: 'SABBAN ABATTOIR',         category: 'INDUSTRY' as const,      location: 'Kigali', contactName: 'HR THEONESTE',              contactPhone: '0788846240', needsAndObservation: 'Board reviewing EVS contract.',           whatSantechCanSell: 'EVS 90-employee system', outcome: 'PROPOSAL' as const,   followUpDate: new Date('2026-10-30'), contractWon: false, recordedById: aliceUser.id, clientId: createdClients['SABBAN ABATTOIR'] },
  ]
  for (const v of visitRows) {
    const { id, ...data } = v
    await prisma.fieldVisit.upsert({ where: { id }, update: {}, create: { id, ...data } })
  }
  console.log('✅ Field visits seeded')

  // ── 10. FINANCE, PAYROLL, CONTRACT SIGNING, MILESTONES, AUDIT TRAIL ─────
  // Leads, quotations, support, products, departments, extra staff, reception, notifications
  await seedSalesAndOperations(prisma)
  await seedFinanceAndWorkflows(prisma)
  // Communication log and meetings
  await seedActivity(prisma)
  // Client services, campaigns, timesheets
  await seedGrowth(prisma)
  // Documents, attendance, tenders, procurement, training, knowledge base, company profile
  await seedOffice(prisma)

  console.log('\n🎉 All seed data loaded!')
  console.log('📋 Demo logins (all use password: Santech@2026):')
  console.log('   admin@santech.rw  — SUPER_ADMIN')
  console.log('   alice@santech.rw  — SALES_STAFF')
  console.log('   bob@santech.rw    — PROJECT_MANAGER')
  console.log('   claire@santech.rw — ADMIN')
  console.log('   david@santech.rw  — FINANCE_MANAGER')
  console.log('   eve@santech.rw    — MARKETING_MANAGER')
  console.log('   frank@santech.rw  — EMPLOYEE')
}

main()
  .catch(e => { console.error('❌ Seed error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
