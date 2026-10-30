/**
 * Demo data for: expense claims (one at each step), document expiry dates and an earlier
 * document version, support response times and ratings, and project warranties.
 * Safe to run on every deploy: fixed ids / only fills values that are still empty.
 */
import { PrismaClient } from '@prisma/client'
import { simplePdf } from './documentLinks'

const d = (s: string) => new Date(`${s}T00:00:00.000Z`)
const HOUR = 3600 * 1000

export async function seedClaimsExpiryWarranty(prisma: PrismaClient) {
  const userId = async (email: string) => (await prisma.user.findUnique({ where: { email }, select: { id: true } }))?.id
  const admin = (await userId('admin@santech.rw'))!
  const id = async (email: string) => (await userId(email)) ?? admin

  // ── Expense claims: pending, manager-approved, approved (booked in Finance), rejected ──
  const claims = [
    { claimNumber: 'EXP-2026-001', by: 'alice@santech.rw', description: 'Moto taxi to field visits in Nyarugenge (week 43)', category: 'Transport', amount: 18000, date: '2026-10-24',
      status: 'PENDING' },
    { claimNumber: 'EXP-2026-002', by: 'frank@santech.rw', description: 'USB fingerprint reader for EVS testing', category: 'Equipment', amount: 65000, date: '2026-10-20',
      status: 'MANAGER_APPROVED', managerBy: 'bob@santech.rw', managerName: 'Bob Nkurunziza', managerAt: '2026-10-21' },
    { claimNumber: 'EXP-2026-003', by: 'bob@santech.rw', description: 'Mobile internet bundle for on-site SANTRACK installation', category: 'Internet', amount: 25000, date: '2026-10-08',
      status: 'APPROVED', managerBy: 'claire@santech.rw', managerName: 'Claire Mukamana', managerAt: '2026-10-09', financeName: 'David Habimana', financeAt: '2026-10-10' },
    { claimNumber: 'EXP-2026-004', by: 'eve@santech.rw', description: 'Printing of TechForward Expo flyers (500 copies)', category: 'Marketing', amount: 90000, date: '2026-10-15',
      status: 'REJECTED', rejectedByName: 'Claire Mukamana', rejectionReason: 'Please attach the printer invoice and resubmit' },
  ]
  for (const c of claims) {
    if (await prisma.expenseClaim.findUnique({ where: { claimNumber: c.claimNumber }, select: { id: true } })) continue
    const requestedById = await id(c.by)
    let expenseId: string | null = null
    if (c.status === 'APPROVED') {
      const david = await id('david@santech.rw')
      const who = await prisma.user.findUnique({ where: { id: requestedById }, select: { firstName: true, lastName: true } })
      expenseId = (await prisma.expenseEntry.create({
        data: { date: d(c.date), description: `Expense claim ${c.claimNumber} — ${c.description} (${who?.firstName} ${who?.lastName})`, category: c.category, amount: c.amount, recordedById: david },
      })).id
    }
    await prisma.expenseClaim.create({
      data: {
        claimNumber: c.claimNumber, description: c.description, category: c.category, amount: c.amount, date: d(c.date), status: c.status,
        requestedById, managerId: c.managerBy ? await id(c.managerBy) : null, managerName: c.managerName ?? null, managerAt: c.managerAt ? d(c.managerAt) : null,
        financeName: c.financeName ?? null, financeAt: c.financeAt ? d(c.financeAt) : null,
        rejectedByName: c.rejectedByName ?? null, rejectionReason: c.rejectionReason ?? null, expenseId, createdAt: d(c.date),
      },
    })
  }

  // ── Documents: expiry dates (only where none is set) ──
  const expiries: [string, string][] = [
    ['doc-05', '2026-11-15'], // Employee Leave Policy v2 — due for review
    ['doc-15', '2026-11-10'], // KABUYE draft contract — offer validity
    ['doc-01', '2026-12-31'], // Company profile 2026
    ['doc-10', '2027-09-10'], // N&T signed contract — end of term
  ]
  for (const [docId, date] of expiries) await prisma.document.updateMany({ where: { id: docId, expiryDate: null }, data: { expiryDate: d(date) } })

  // ── An earlier version of the ECOBANK proposal ──
  const ecobank = await prisma.document.findUnique({ where: { id: 'doc-07' } })
  if (ecobank && !(await prisma.documentVersion.count({ where: { documentId: ecobank.id } }))) {
    const data = simplePdf('ECOBANK - EVS and SANHR IMS proposal (first draft)', [
      'Santech Innovate - SAN-BMS', 'Version 1 - first draft sent for internal review', '',
      'Replaced by version 2 after the pricing review with the Sales Manager.',
    ])
    const file = await prisma.storedFile.create({ data: { name: 'ECOBANK - EVS and SANHR IMS proposal (v1).pdf', mimeType: 'application/pdf', size: data.length, data, uploadedById: ecobank.uploadedById } })
    const by = await prisma.user.findUnique({ where: { id: ecobank.uploadedById }, select: { firstName: true, lastName: true } })
    await prisma.documentVersion.create({
      data: {
        documentId: ecobank.id, version: 1, fileId: file.id, name: 'ECOBANK - EVS and SANHR IMS proposal (v1).pdf', size: `${Math.max(1, Math.round(data.length / 1024))} KB`,
        uploadedById: ecobank.uploadedById, uploadedByName: by ? `${by.firstName} ${by.lastName}` : null, createdAt: d('2026-10-02'),
      },
    })
    await prisma.document.update({ where: { id: ecobank.id }, data: { version: 2 } })
  }

  // ── Support: first response times and customer ratings ──
  const tickets = await prisma.supportTicket.findMany({ orderBy: { createdAt: 'asc' } })
  const responseHours = [2, 5, 1, 26, 3, 8]
  const ratings = [5, 4, 5, 3, 4, 5]
  for (const [i, t] of tickets.entries()) {
    if (!t.firstResponseAt && t.status !== 'NEW') {
      await prisma.supportTicket.update({ where: { id: t.id }, data: { firstResponseAt: new Date(t.createdAt.getTime() + responseHours[i % responseHours.length] * HOUR) } })
    }
    if (t.satisfaction === null && (t.status === 'RESOLVED' || t.status === 'CLOSED')) {
      await prisma.supportTicket.update({ where: { id: t.id }, data: { satisfaction: ratings[i % ratings.length], satisfactionNote: ratings[i % ratings.length] >= 4 ? 'Quick and clear help' : 'Fixed, but took longer than expected' } })
    }
  }

  // ── Project warranties ──
  const warranties: [string, string][] = [['proj-website', '2026-11-20'], ['proj-santrack', '2027-06-30'], ['proj-stock', '2027-12-31']]
  for (const [projectId, date] of warranties) await prisma.project.updateMany({ where: { id: projectId, warrantyEndDate: null }, data: { warrantyEndDate: d(date) } })

  console.log('✅ Expense claims, document expiry/versions, support times and warranties seeded')
}
