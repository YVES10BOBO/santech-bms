/**
 * Demo data for Documents, Attendance & Leave, Tenders, Procurement, Training,
 * Knowledge Base and the Company Profile. The records come from the old page
 * mock arrays, saved as JSON in ./data (see the file names below).
 * Safe to run on every deploy: fixed ids, created only when missing.
 */
import { PrismaClient } from '@prisma/client'
import documents from './data/documents.json'
import attendance from './data/attendance.json'
import leaves from './data/leaves.json'
import tenders from './data/tenders.json'
import procurement from './data/procurement.json'
import trainings from './data/trainings.json'
import articles from './data/articles.json'

const d = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00.000Z`)

export async function seedOffice(prisma: PrismaClient) {
  const users = await prisma.user.findMany({ select: { id: true, firstName: true, lastName: true, email: true } })
  const byEmail = (e: string) => users.find(u => u.email === e)!.id
  const admin = byEmail('admin@santech.rw')
  // Names used in the old mock data → real accounts (unknown names fall back to a sensible owner)
  const alias: Record<string, string> = {
    'System Admin': admin, 'Admin': admin, 'HR Manager': byEmail('claire@santech.rw'),
    'Frank Kagabo': byEmail('frank@santech.rw'), 'Carol Ingabire': byEmail('frank@santech.rw'),
    'Grace Niyonsaba': byEmail('grace@santech.rw'), 'Henry Kayitare': byEmail('frank@santech.rw'),
  }
  const userId = (name: string, fallback = admin) =>
    alias[name] ?? users.find(u => `${u.firstName} ${u.lastName}`.toLowerCase() === name.toLowerCase())?.id ?? fallback

  // ── Documents ─────────────────────────────────────────────────────────────
  for (const [i, doc] of documents.entries()) {
    const id = `doc-${String(i + 1).padStart(2, '0')}`
    await prisma.document.upsert({
      where: { id }, update: {},
      create: { id, name: doc.name, category: doc.category, description: doc.description, size: doc.size, status: doc.status, uploadedById: userId(doc.uploadedBy), date: d(doc.date), createdAt: d(doc.date) },
    })
  }
  console.log('✅ Documents seeded')

  // ── Attendance & leave (Henry is not on staff, so his rows go to Frank) ────
  for (const a of attendance) {
    const uid = userId(a.employeeName)
    const date = d(a.date)
    const exists = await prisma.attendance.findUnique({ where: { userId_date: { userId: uid, date } } })
    if (!exists) {
      await prisma.attendance.create({
        data: { userId: uid, date, checkIn: a.checkIn || null, checkOut: a.checkOut || null, hoursWorked: a.hoursWorked, status: a.status, notes: a.notes || null },
      })
    }
  }
  for (const [i, l] of leaves.entries()) {
    const id = `leave-${String(i + 1).padStart(2, '0')}`
    await prisma.leaveRequest.upsert({
      where: { id }, update: {},
      create: {
        id, userId: userId(l.employeeName), leaveType: l.leaveType, startDate: d(l.startDate), endDate: d(l.endDate), days: l.days,
        reason: l.reason, status: l.status, ...(l.status !== 'PENDING' && { reviewedById: byEmail('claire@santech.rw'), reviewedAt: d(l.startDate) }),
      },
    })
  }
  console.log('✅ Attendance and leave seeded')

  // ── Tenders ───────────────────────────────────────────────────────────────
  for (const [i, t] of tenders.entries()) {
    const id = `tender-${String(i + 1).padStart(2, '0')}`
    await prisma.tender.upsert({
      where: { id }, update: {},
      create: {
        id, title: t.title, issuer: t.client, reference: t.reference, value: t.value, deadline: d(t.deadline),
        submissionDate: 'submissionDate' in t && t.submissionDate ? d(t.submissionDate as string) : null,
        status: t.status, description: t.description, assignedToId: userId(t.assignedTo, byEmail('alice@santech.rw')),
      },
    })
  }
  console.log('✅ Tenders seeded')

  // ── Procurement (delivered items were already booked as expenses) ─────────
  for (const [i, p] of procurement.entries()) {
    const id = `pr-${String(i + 1).padStart(2, '0')}`
    await prisma.purchaseRequest.upsert({
      where: { id }, update: {},
      create: {
        id, itemName: p.itemName, category: p.category, quantity: p.quantity, unitPrice: p.unitPrice, supplier: p.supplier, status: p.status,
        notes: p.notes, requestedById: userId(p.requestedBy), requestDate: d(p.requestDate),
        ...(['APPROVED', 'ORDERED', 'DELIVERED'].includes(p.status) && { approvedById: byEmail('david@santech.rw') }),
        ...(p.status === 'DELIVERED' && { deliveredAt: d(p.requestDate) }),
      },
    })
  }
  console.log('✅ Procurement seeded')

  // ── Training sessions + attendees ─────────────────────────────────────────
  for (const [i, s] of trainings.entries()) {
    const id = `training-${String(i + 1).padStart(2, '0')}`
    const exists = await prisma.trainingSession.findUnique({ where: { id } })
    if (exists) continue
    await prisma.trainingSession.create({
      data: {
        id, title: s.title, type: s.type, description: s.description, trainer: s.trainer, venue: s.venue,
        startDate: d(s.startDate), endDate: d(s.endDate), startTime: s.startTime, endTime: s.endTime,
        maxAttendees: s.maxAttendees, feePerPerson: s.feePerPerson, status: s.status,
        certificateTemplate: s.certificateTemplate, notes: s.notes, createdById: userId(s.trainer), createdAt: d(s.createdAt),
        attendees: {
          create: s.attendees.map(a => ({
            name: a.name, company: a.company, phone: a.phone, email: a.email, status: a.status,
            certificateIssued: a.certificateIssued, feePaid: a.feePaid, feeAmount: a.feeAmount || s.feePerPerson,
          })),
        },
      },
    })
  }
  console.log('✅ Training seeded')

  // ── Knowledge base ────────────────────────────────────────────────────────
  for (const a of articles) {
    await prisma.knowledgeArticle.upsert({
      where: { id: a.id }, update: {},
      create: {
        id: a.id, title: a.title, category: a.category, excerpt: a.excerpt, content: a.content, status: a.status,
        tags: a.tags, views: a.views, authorId: userId(a.author), createdAt: d(a.date), updatedAt: d(a.date),
      },
    })
  }
  console.log('✅ Knowledge base seeded')

  // ── Company profile ───────────────────────────────────────────────────────
  await prisma.setting.upsert({
    where: { key: 'company' }, update: {},
    create: {
      key: 'company',
      value: {
        name: 'Santech Innovate', legalName: 'Santech Rwanda Limited', registrationNumber: '102621580', tin: '102621580',
        address: 'KG 9 Ave, Kacyiru', city: 'Kigali', country: 'Rwanda', phone: '+250 788 000 000', email: 'info@santech.rw',
        website: 'https://www.santech.rw', industry: 'Information Technology',
        description: 'Santech Innovate builds and manages technology systems for client companies: EVS, SANTRACK, REVIXSAN, SANBOOK, SANHUB training and custom software.',
      },
    },
  })
  // Opening cash balance for the financial statements (set once, never overwritten)
  const fin = await prisma.setting.findUnique({ where: { key: 'finance' } })
  if (!fin) await prisma.setting.create({ data: { key: 'finance', value: { openingCash: 15000000 } } })
  console.log('✅ Company profile seeded')
}
