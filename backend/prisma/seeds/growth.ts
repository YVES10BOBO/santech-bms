/**
 * Demo data for Client Services & Renewals, Marketing Campaigns and Timesheets.
 * Safe to run on every deploy: fixed ids, created only when missing.
 */
import { PrismaClient } from '@prisma/client'

const d = (s: string) => new Date(`${s}T00:00:00.000Z`)

export async function seedGrowth(prisma: PrismaClient) {
  const byEmail = async (email: string) => (await prisma.user.findUnique({ where: { email } }))!
  const admin = await byEmail('admin@santech.rw')
  const alice = await byEmail('alice@santech.rw')
  const bob = await byEmail('bob@santech.rw')
  const frank = await byEmail('frank@santech.rw')
  const eve = await byEmail('eve@santech.rw')

  const findClient = async (name: string) =>
    (await prisma.client.findFirst({ where: { companyName: { startsWith: name, mode: 'insensitive' } }, orderBy: { createdAt: 'asc' } }))?.id
  const ensureClient = async (id: string, name: string, phone: string) =>
    (await findClient(name)) ?? (await prisma.client.create({
      data: { id, companyName: name, kind: 'BUSINESS', category: 'SELF_EMPLOYED', status: 'CONTRACTOR', clientType: 'CONTRACTOR', phone, location: 'Kigali', assignedToId: alice.id, services: ['Website'] },
    })).id

  // ── Client services & renewals ────────────────────────────────────────────
  const services = [
    { id: 'svc-01', client: ['cl-rmride', 'Rwanda Mountain Ride', ''], system: 'Company Website', link: 'www.rwandamountainride.com', type: 'HOSTING_AND_MAINTENANCE', provider: 'SPACESHIP', email: 'hosting@santech.rw', info: 'Account: ST-SPACE-001 | Server: shared-us-01', start: '2026-01-15', renew: '2026-12-15', amount: 180000, cost: 85000, taxIncl: true, tax: 18, status: 'PAID', paid: '2026-01-15', notes: 'Annual hosting + maintenance. Client pays in January every year.' },
    { id: 'svc-02', client: ['cl-bloom', 'Bloom Kigali', '0786021700'], system: 'Flower Shop Website', link: 'www.bloomkigali.rw', type: 'HOSTING_ONLY', provider: 'AOS_RWANDA', email: 'hosting@santech.rw', info: 'Account: AOS-BK-002 | Plan: Business Hosting', start: '2026-03-01', renew: '2026-11-30', amount: 120000, cost: 60000, taxIncl: false, tax: 0, status: 'PAID', paid: '2026-03-01', notes: 'Hosting only. No maintenance contract.' },
    { id: 'svc-03', client: ['cl-foodsupp', 'Food Supplements Shop', '0788431118'], system: 'Business Website', link: 'www.foodsupplements.rw', type: 'DOMAIN_AND_HOSTING', provider: 'NAMECHEAP', email: 'domains@santech.rw', info: 'Account: NC-FSS-003 | Domain registrar: Namecheap', start: '2026-09-15', renew: '2026-12-01', amount: 95000, cost: 45000, taxIncl: true, tax: 18, status: 'UNPAID', notes: 'Domain + hosting package. Client has not paid yet.' },
    { id: 'svc-04', client: ['cl-easeed', 'East African Seed', ''], system: 'SANTRACK System — Maintenance', link: 'internal-system', type: 'MAINTENANCE_ONLY', provider: 'SANTECH_SERVER', info: 'Local installation at client premises. Remote support via TeamViewer.', start: '2026-10-01', renew: '2027-09-30', amount: 300000, cost: 0, taxIncl: true, tax: 18, status: 'PAID', paid: '2026-10-01', notes: 'Annual maintenance for SANTRACK: updates, bug fixes and support.' },
    { id: 'svc-05', client: ['cl-frama', 'FRAMA Fashion', '0788112233'], system: 'Fashion Business Website', link: 'www.framafashion.rw', type: 'HOSTING_AND_MAINTENANCE', provider: 'SPACESHIP', email: 'hosting@santech.rw', info: 'Account: ST-SPACE-005 | Server: shared-us-03', start: '2025-11-01', renew: '2026-10-25', amount: 200000, cost: 90000, taxIncl: true, tax: 18, status: 'OVERDUE', notes: 'OVERDUE — client has not renewed. Follow up urgently.' },
    { id: 'svc-06', client: ['cl-kpprime', 'KP Prime Rwanda LTD', '0788445566'], system: 'Corporate Website', link: 'www.kpprime.rw', type: 'HOSTING_ONLY', provider: 'AOS_RWANDA', email: 'hosting@santech.rw', info: 'Account: AOS-KP-006 | Plan: Professional', start: '2026-10-05', renew: '2026-11-05', amount: 150000, cost: 70000, taxIncl: false, tax: 0, status: 'UNPAID', notes: 'New client. Invoice sent. Awaiting payment.', cycle: 'MONTHLY' },
  ]
  for (const s of services) {
    const [cid, name, phone] = s.client
    const clientId = await ensureClient(cid, name, phone)
    await prisma.clientSubscription.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id, clientId, systemName: s.system, systemLink: s.link, serviceType: s.type, hostingProvider: s.provider,
        hostingAccountEmail: s.email ?? null, hostingAccountInfo: s.info, billingCycle: s.cycle ?? 'ANNUAL',
        startDate: d(s.start), renewalDate: d(s.renew), amount: s.amount, cost: s.cost, taxIncluded: s.taxIncl, taxRate: s.tax,
        paymentStatus: s.status, paymentDate: s.paid ? d(s.paid) : null, notes: s.notes, createdAt: d(s.start),
      },
    })
  }
  console.log('✅ Client services seeded')

  // ── Marketing campaigns ───────────────────────────────────────────────────
  const campaigns = [
    { id: 'camp-01', name: 'TechForward Expo 2026', type: 'EXPO_EVENT', status: 'COMPLETED', objective: 'Present Santech products to Kigali businesses', audience: 'SMEs in Kigali', start: '2026-10-01', end: '2026-10-05', budget: 500000, leads: 18, clients: 4, revenue: 4200000, channel: 'Events', team: 'Sales & Marketing Team', notes: 'Very successful expo. Good brand visibility.' },
    { id: 'camp-02', name: 'Kigali Industrial Zone Field Campaign', type: 'FIELD_VISITS', status: 'ACTIVE', objective: 'Visit all industries in Kigali industrial zones', audience: 'Manufacturing companies', start: '2026-09-01', end: '2026-11-30', budget: 300000, leads: 24, clients: 2, revenue: 3000000, channel: 'Direct', team: 'Alice Uwimana, Eve Ingabire', notes: 'Ongoing. High lead generation rate.' },
    { id: 'camp-03', name: 'EVS Campaign — Banks & Institutions', type: 'COLD_OUTREACH', status: 'ACTIVE', objective: 'Sell EVS to banks, hospitals and government institutions', audience: 'Banks, hospitals, police, government', start: '2026-09-15', end: '2026-12-31', budget: 200000, leads: 12, clients: 1, revenue: 0, channel: 'Direct', team: 'Alice Uwimana', notes: 'Revenue pending contract signing.' },
    { id: 'camp-04', name: 'Social Media Awareness Campaign', type: 'SOCIAL_MEDIA', status: 'ACTIVE', objective: 'Increase Santech brand awareness on LinkedIn, Facebook and Instagram', audience: 'General business community in Rwanda', start: '2026-10-01', end: '2026-12-31', budget: 150000, leads: 5, clients: 0, revenue: 0, channel: 'Social Media', team: 'Eve Ingabire', notes: 'Brand building phase.' },
    { id: 'camp-05', name: 'SANHUB Training Program Q4 2026', type: 'OTHER', status: 'PLANNING', objective: 'Offer paid training programs through SANHUB to students and professionals', audience: 'University students, young professionals', start: '2026-11-01', end: '2026-12-31', budget: 400000, leads: 0, clients: 0, revenue: 0, channel: 'Events', team: 'Bob Nkurunziza, Claire Mukamana', notes: 'Curriculum under development.' },
    { id: 'camp-06', name: 'Referral Program Launch', type: 'REFERRAL', status: 'PLANNING', objective: 'Existing clients refer new clients and earn commission', audience: 'Existing Santech clients', start: '2026-11-15', end: '2027-03-31', budget: 100000, leads: 0, clients: 0, revenue: 0, channel: 'Referral', team: 'Sales Team', notes: 'Commission structure being defined.' },
  ]
  for (const c of campaigns) {
    await prisma.campaign.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id, name: c.name, type: c.type, status: c.status, objective: c.objective, targetAudience: c.audience,
        startDate: d(c.start), endDate: d(c.end), budget: c.budget, channel: c.channel, assignedTeam: c.team,
        leadsGenerated: c.leads, clientsAcquired: c.clients, revenueGenerated: c.revenue, notes: c.notes,
        createdById: eve?.id ?? admin.id,
      },
    })
  }
  console.log('✅ Campaigns seeded')

  // ── Timesheets ────────────────────────────────────────────────────────────
  const project = async (id: string) => (await prisma.project.findUnique({ where: { id }, select: { id: true } }))?.id
  const entries = [
    { id: 'ts-01', user: bob.id,   project: 'proj-santrack',   task: 'Requirements Analysis',  date: '2026-10-05', hours: 8,   status: 'APPROVED', notes: 'Completed requirements document.' },
    { id: 'ts-02', user: bob.id,   project: 'proj-santrack',   task: 'Development',            date: '2026-10-06', hours: 7.5, status: 'APPROVED', notes: 'Core module development.' },
    { id: 'ts-03', user: frank.id, project: 'proj-website',    task: 'Frontend Design',        date: '2026-10-05', hours: 6,   status: 'PENDING',  notes: 'Homepage layout.' },
    { id: 'ts-04', user: frank.id, project: 'proj-evs-sabban', task: 'Hardware Installation',  date: '2026-10-07', hours: 9,   status: 'PENDING',  notes: 'Installed terminals at site.' },
    { id: 'ts-05', user: alice.id, project: 'proj-evs-sabban', task: 'Client Meeting',         date: '2026-10-08', hours: 2,   status: 'APPROVED', notes: 'Kickoff meeting with SABBAN.' },
    { id: 'ts-06', user: bob.id,   project: 'proj-santrack',   task: 'Testing',                date: '2026-10-09', hours: 5,   status: 'REJECTED', notes: 'UAT failed — rescheduled.' },
    { id: 'ts-07', user: bob.id,   project: 'proj-stock',      task: 'Discovery workshops',    date: '2026-10-12', hours: 6,   status: 'APPROVED', notes: 'Warehouse process mapping at N&T.' },
    { id: 'ts-08', user: frank.id, project: 'proj-stock',      task: 'Server setup',           date: '2026-10-14', hours: 7,   status: 'APPROVED', notes: 'Prepared on-site server for SANTRACK.' },
    { id: 'ts-09', user: bob.id,   project: 'proj-website',    task: 'SEO optimisation',       date: '2026-09-28', hours: 4,   status: 'APPROVED', notes: 'Final SEO pass before handover.' },
    { id: 'ts-10', user: alice.id, project: 'proj-santrack',   task: 'User training session',  date: '2026-10-20', hours: 3,   status: 'APPROVED', notes: 'Trained 12 users at East African Seed.' },
  ]
  for (const t of entries) {
    const projectId = await project(t.project)
    if (!projectId) continue
    await prisma.timesheet.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id, userId: t.user, projectId, task: t.task, date: d(t.date), hours: t.hours, status: t.status, notes: t.notes,
        ...(t.status !== 'PENDING' && { reviewedById: admin.id, reviewedAt: d(t.date) }),
      },
    })
  }
  console.log('✅ Timesheets seeded')
}
