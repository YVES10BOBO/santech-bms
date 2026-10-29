/**
 * Documents, attendance & leave, tenders, procurement, training,
 * knowledge base and company settings.
 */
import { Response } from 'express'
import type { Prisma } from '@prisma/client'
import prisma from '../lib/prisma'
import { logAudit } from '../lib/audit'
import { notify, notifyRoles } from '../lib/notifications'
import { ADMINS, FINANCE, hasRole } from '../lib/roles'
import type { AuthRequest } from '../middleware/auth'

const fail = (res: Response, error: unknown, where: string) => {
  console.error(`${where} error:`, error)
  res.status(500).json({ success: false, message: 'Internal server error' })
}
const userName = { select: { id: true, firstName: true, lastName: true } }
const day = (v: unknown) => new Date(`${String(v).slice(0, 10)}T00:00:00.000Z`)
const nameOf = (u: { firstName: string; lastName: string } | null | undefined) => (u ? `${u.firstName} ${u.lastName}` : '')

// ── DOCUMENTS ─────────────────────────────────────────────────────────────────

export async function getDocuments(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const rows = await prisma.document.findMany({ include: { uploadedBy: userName }, orderBy: { date: 'desc' } })
    res.json({ success: true, data: rows })
  } catch (e) { fail(res, e, 'getDocuments') }
}

export async function saveDocument(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id
    const b = req.body
    if (!id && !b.name) { res.status(400).json({ success: false, message: 'Document name is required' }); return }
    const data = {
      ...(b.name !== undefined && { name: b.name }),
      ...(b.category !== undefined && { category: b.category }),
      ...(b.description !== undefined && { description: b.description || null }),
      ...(b.size !== undefined && { size: b.size || null }),
      ...(b.status !== undefined && { status: b.status }),
    }
    const d = id
      ? await prisma.document.update({ where: { id }, data, include: { uploadedBy: userName } })
      : await prisma.document.create({ data: { category: 'OTHER', ...data, name: b.name, uploadedById: req.user!.id }, include: { uploadedBy: userName } })
    await logAudit(req, {
      action: id ? (b.status ? 'STATUS_CHANGE' : 'UPDATE') : 'CREATE', entity: 'Document', entityId: d.id, entityName: d.name,
      description: id ? (b.status === 'ARCHIVED' ? `Archived document ${d.name}` : `Updated document ${d.name}`) : `Added document ${d.name}`,
    })
    res.status(id ? 200 : 201).json({ success: true, data: d, message: id ? 'Document updated' : 'Document added' })
  } catch (e) { fail(res, e, 'saveDocument') }
}

// ── ATTENDANCE & LEAVE ────────────────────────────────────────────────────────

const staffInclude = { user: { select: { id: true, firstName: true, lastName: true, employee: { select: { department: true } } } } }

export async function getAttendance(req: AuthRequest, res: Response): Promise<void> {
  try {
    const hr = hasRole(req.user?.role, [...ADMINS, 'PROJECT_MANAGER'])
    const where = hr ? {} : { userId: req.user!.id }
    const [attendance, leaves] = await Promise.all([
      prisma.attendance.findMany({ where, include: staffInclude, orderBy: [{ date: 'desc' }] }),
      prisma.leaveRequest.findMany({ where, include: { ...staffInclude, reviewedBy: userName }, orderBy: { createdAt: 'desc' } }),
    ])
    res.json({ success: true, data: { attendance, leaves } })
  } catch (e) { fail(res, e, 'getAttendance') }
}

function hoursBetween(a?: string, b?: string) {
  if (!a || !b) return 0
  const [h1, m1] = a.split(':').map(Number)
  const [h2, m2] = b.split(':').map(Number)
  return Math.max(0, Math.round(((h2 * 60 + m2) - (h1 * 60 + m1)) / 6) / 10)
}

/** Record or correct a day (HR), or check yourself in/out ("self": true). */
export async function saveAttendance(req: AuthRequest, res: Response): Promise<void> {
  try {
    const b = req.body
    const isHr = hasRole(req.user?.role, ADMINS)
    const userId = b.userId && isHr ? b.userId : req.user!.id
    const date = day(b.date || new Date().toISOString())
    const existing = await prisma.attendance.findUnique({ where: { userId_date: { userId, date } } })
    const checkIn = b.checkIn ?? existing?.checkIn ?? undefined
    const checkOut = b.checkOut ?? existing?.checkOut ?? undefined
    // Late after 08:30 unless HR sets the status
    const status = (isHr && b.status) || (b.status === 'ABSENT' ? 'ABSENT' : checkIn && checkIn > '08:30' ? 'LATE' : 'PRESENT')
    const data = { checkIn: checkIn || null, checkOut: checkOut || null, hoursWorked: hoursBetween(checkIn, checkOut), status, notes: b.notes ?? existing?.notes ?? null }
    const a = await prisma.attendance.upsert({
      where: { userId_date: { userId, date } },
      update: data,
      create: { userId, date, ...data },
      include: staffInclude,
    })
    await logAudit(req, {
      action: existing ? 'UPDATE' : 'CREATE', entity: 'Attendance', entityId: a.id, entityName: `${nameOf(a.user)} — ${date.toISOString().slice(0, 10)}`,
      description: `${existing ? 'Updated' : 'Recorded'} attendance for ${nameOf(a.user)}: ${a.status}${a.checkIn ? ` (in ${a.checkIn}${a.checkOut ? `, out ${a.checkOut}` : ''})` : ''}`,
    })
    res.json({ success: true, data: a, message: existing ? 'Attendance updated' : 'Attendance recorded' })
  } catch (e) { fail(res, e, 'saveAttendance') }
}

export async function requestLeave(req: AuthRequest, res: Response): Promise<void> {
  try {
    const b = req.body
    if (!b.leaveType || !b.startDate || !b.endDate) { res.status(400).json({ success: false, message: 'Leave type and dates are required' }); return }
    const start = day(b.startDate), end = day(b.endDate)
    if (end < start) { res.status(400).json({ success: false, message: 'End date is before start date' }); return }
    const userId = b.userId && hasRole(req.user?.role, ADMINS) ? b.userId : req.user!.id
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
    const l = await prisma.leaveRequest.create({
      data: { userId, leaveType: b.leaveType, startDate: start, endDate: end, days, reason: b.reason || null },
      include: { ...staffInclude, reviewedBy: userName },
    })
    await notifyRoles(ADMINS, { type: 'SYSTEM', title: 'Leave Request', link: '/team/attendance', key: `leave-${l.id}`, description: `${nameOf(l.user)} requests ${days} day(s) of ${l.leaveType.toLowerCase()} leave from ${b.startDate}` }, req.user!.id)
    await logAudit(req, { action: 'CREATE', entity: 'Leave', entityId: l.id, entityName: nameOf(l.user), description: `${nameOf(l.user)} requested ${days} day(s) ${l.leaveType.toLowerCase()} leave` })
    res.status(201).json({ success: true, data: l, message: 'Leave request sent for approval' })
  } catch (e) { fail(res, e, 'requestLeave') }
}

export async function reviewLeave(req: AuthRequest, res: Response): Promise<void> {
  try {
    const status = req.params.decision === 'approve' ? 'APPROVED' : req.params.decision === 'reject' ? 'REJECTED' : null
    if (!status) { res.status(404).json({ success: false, message: 'Unknown action' }); return }
    const before = await prisma.leaveRequest.findUnique({ where: { id: req.params.id } })
    if (!before) { res.status(404).json({ success: false, message: 'Leave request not found' }); return }
    if (before.userId === req.user!.id) { res.status(403).json({ success: false, message: 'You cannot approve your own leave' }); return }
    if (before.status !== 'PENDING') { res.status(400).json({ success: false, message: 'This request was already reviewed' }); return }
    const l = await prisma.$transaction(async tx => {
      const updated = await tx.leaveRequest.update({
        where: { id: before.id }, data: { status, reviewedById: req.user!.id, reviewedAt: new Date() },
        include: { ...staffInclude, reviewedBy: userName },
      })
      // Leave that covers today puts the employee on leave
      const now = new Date()
      if (status === 'APPROVED' && before.startDate <= now && before.endDate >= day(now.toISOString())) {
        await tx.employee.updateMany({ where: { userId: before.userId }, data: { employmentStatus: 'ON_LEAVE' } })
      }
      return updated
    })
    await notify(l.userId, { type: 'SYSTEM', title: status === 'APPROVED' ? 'Leave Approved' : 'Leave Rejected', link: '/team/attendance', description: `Your ${l.leaveType.toLowerCase()} leave (${l.days} day(s)) was ${status.toLowerCase()}` })
    await logAudit(req, { action: status === 'APPROVED' ? 'APPROVE' : 'REJECT', entity: 'Leave', entityId: l.id, entityName: nameOf(l.user), description: `${status === 'APPROVED' ? 'Approved' : 'Rejected'} ${l.days} day(s) leave for ${nameOf(l.user)}` })
    res.json({ success: true, data: l, message: status === 'APPROVED' ? 'Leave approved' : 'Leave rejected' })
  } catch (e) { fail(res, e, 'reviewLeave') }
}

// ── TENDERS ───────────────────────────────────────────────────────────────────

export async function getTenders(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const rows = await prisma.tender.findMany({ include: { assignedTo: userName }, orderBy: { deadline: 'desc' } })
    res.json({ success: true, data: rows })
  } catch (e) { fail(res, e, 'getTenders') }
}

export async function saveTender(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id
    const b = req.body
    if (!id && (!b.title || !b.issuer || !b.deadline)) { res.status(400).json({ success: false, message: 'Title, issuer and deadline are required' }); return }
    const before = id ? await prisma.tender.findUnique({ where: { id } }) : null
    const data = {
      ...(b.title !== undefined && { title: b.title }),
      ...(b.issuer !== undefined && { issuer: b.issuer }),
      ...(b.reference !== undefined && { reference: b.reference || null }),
      ...(b.value !== undefined && { value: parseFloat(b.value) || 0 }),
      ...(b.deadline !== undefined && { deadline: day(b.deadline) }),
      ...(b.description !== undefined && { description: b.description || null }),
      ...(b.assignedToId !== undefined && { assignedToId: b.assignedToId || null }),
      ...(b.status !== undefined && { status: b.status }),
      ...(b.status === 'SUBMITTED' && !before?.submissionDate && { submissionDate: new Date() }),
    }
    const t = id
      ? await prisma.tender.update({ where: { id }, data, include: { assignedTo: userName } })
      : await prisma.tender.create({ data: { ...data, title: b.title, issuer: b.issuer, deadline: day(b.deadline), assignedToId: b.assignedToId || req.user!.id }, include: { assignedTo: userName } })
    if (t.assignedToId && t.assignedToId !== req.user!.id && (!before || before.assignedToId !== t.assignedToId)) {
      await notify(t.assignedToId, { type: 'FOLLOW_UP', title: 'Tender Assigned', link: '/sales/tenders', description: `${t.title} (${t.issuer}) — deadline ${t.deadline.toISOString().slice(0, 10)}` })
    }
    await logAudit(req, {
      action: id ? (b.status && b.status !== before?.status ? 'STATUS_CHANGE' : 'UPDATE') : 'CREATE', entity: 'Tender', entityId: t.id, entityName: t.title,
      description: id ? (b.status && b.status !== before?.status ? `Tender "${t.title}" moved to ${t.status}` : `Updated tender "${t.title}"`) : `Added tender "${t.title}" from ${t.issuer}`,
      oldValue: before ? { status: before.status } : undefined, newValue: { status: t.status, value: t.value },
    })
    res.status(id ? 200 : 201).json({ success: true, data: t, message: id ? 'Tender updated' : 'Tender added' })
  } catch (e) { fail(res, e, 'saveTender') }
}

// ── PROCUREMENT ───────────────────────────────────────────────────────────────

const prInclude = { requestedBy: userName, approvedBy: userName }
const PR_FLOW: Record<string, string[]> = { PENDING: ['APPROVED', 'CANCELLED'], APPROVED: ['ORDERED', 'CANCELLED'], ORDERED: ['DELIVERED', 'CANCELLED'] }
const PR_EXPENSE: Record<string, string> = { IT_EQUIPMENT: 'Equipment', HARDWARE: 'Equipment', OFFICE_SUPPLIES: 'Other', SOFTWARE: 'Other', SERVICES: 'Other', OTHER: 'Other' }

export async function getPurchases(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const rows = await prisma.purchaseRequest.findMany({ include: prInclude, orderBy: { requestDate: 'desc' } })
    res.json({ success: true, data: rows })
  } catch (e) { fail(res, e, 'getPurchases') }
}

export async function createPurchase(req: AuthRequest, res: Response): Promise<void> {
  try {
    const b = req.body
    const quantity = parseInt(b.quantity), unitPrice = parseFloat(b.unitPrice)
    if (!b.itemName || !(quantity > 0) || !(unitPrice >= 0)) { res.status(400).json({ success: false, message: 'Item, quantity and unit price are required' }); return }
    const p = await prisma.purchaseRequest.create({
      data: { itemName: b.itemName, category: b.category || 'OTHER', quantity, unitPrice, supplier: b.supplier || null, notes: b.notes || null, requestedById: req.user!.id },
      include: prInclude,
    })
    await notifyRoles(FINANCE, { type: 'SYSTEM', title: 'Purchase Request', link: '/procurement', key: `pr-${p.id}`, description: `${nameOf(p.requestedBy)} requests ${quantity} × ${p.itemName} (RWF ${(quantity * unitPrice).toLocaleString('en-US')})` }, req.user!.id)
    await logAudit(req, { action: 'CREATE', entity: 'Purchase', entityId: p.id, entityName: p.itemName, description: `Requested ${quantity} × ${p.itemName} — RWF ${(quantity * unitPrice).toLocaleString('en-US')}` })
    res.status(201).json({ success: true, data: p, message: 'Request sent for approval' })
  } catch (e) { fail(res, e, 'createPurchase') }
}

/** PENDING → APPROVED → ORDERED → DELIVERED (books an expense) or CANCELLED. */
export async function updatePurchaseStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const next = String(req.body.status ?? '')
    const before = await prisma.purchaseRequest.findUnique({ where: { id: req.params.id } })
    if (!before) { res.status(404).json({ success: false, message: 'Request not found' }); return }
    if (!(PR_FLOW[before.status] ?? []).includes(next)) { res.status(400).json({ success: false, message: `Cannot move from ${before.status} to ${next}` }); return }
    if (next === 'APPROVED' && before.requestedById === req.user!.id && !hasRole(req.user?.role, ['SUPER_ADMIN'])) {
      res.status(403).json({ success: false, message: 'You cannot approve your own purchase request' }); return
    }
    const total = before.quantity * before.unitPrice
    const p = await prisma.$transaction(async tx => {
      let expenseId: string | undefined
      if (next === 'DELIVERED') {
        const exp = await tx.expenseEntry.create({
          data: {
            date: new Date(), description: `Purchase — ${before.quantity} × ${before.itemName}`, category: PR_EXPENSE[before.category] ?? 'Other',
            amount: total, notes: before.supplier ? `Supplier: ${before.supplier}` : null, recordedById: req.user!.id,
          },
        })
        expenseId = exp.id
      }
      return tx.purchaseRequest.update({
        where: { id: before.id },
        data: {
          status: next,
          ...(next === 'APPROVED' && { approvedById: req.user!.id }),
          ...(next === 'DELIVERED' && { deliveredAt: new Date(), expenseId }),
        },
        include: prInclude,
      })
    })
    if (next === 'APPROVED' || next === 'CANCELLED') {
      await notify(p.requestedById, { type: 'SYSTEM', title: next === 'APPROVED' ? 'Purchase Approved' : 'Purchase Cancelled', link: '/procurement', description: `${p.quantity} × ${p.itemName}` })
    }
    await logAudit(req, {
      action: next === 'APPROVED' ? 'APPROVE' : next === 'CANCELLED' ? 'REJECT' : 'STATUS_CHANGE', entity: 'Purchase', entityId: p.id, entityName: p.itemName,
      description: next === 'DELIVERED' ? `${p.itemName} delivered — RWF ${total.toLocaleString('en-US')} added to expenses` : `Purchase ${p.itemName} moved from ${before.status} to ${next}`,
      oldValue: { status: before.status }, newValue: { status: next },
    })
    res.json({ success: true, data: p, message: next === 'DELIVERED' ? 'Delivered — cost added to Finance expenses' : `Marked ${next.toLowerCase()}` })
  } catch (e) { fail(res, e, 'updatePurchaseStatus') }
}

// ── TRAINING ──────────────────────────────────────────────────────────────────

const sessionInclude = { attendees: { orderBy: { createdAt: 'asc' as const } }, createdBy: userName }

export async function getTrainings(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const rows = await prisma.trainingSession.findMany({ include: sessionInclude, orderBy: { startDate: 'desc' } })
    res.json({ success: true, data: rows })
  } catch (e) { fail(res, e, 'getTrainings') }
}

export async function saveTraining(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id
    const b = req.body
    if (!id && (!b.title || !b.trainer || !b.startDate || !b.endDate)) { res.status(400).json({ success: false, message: 'Title, trainer and dates are required' }); return }
    const data = {
      ...(b.title !== undefined && { title: b.title }),
      ...(b.type !== undefined && { type: b.type }),
      ...(b.description !== undefined && { description: b.description || null }),
      ...(b.trainer !== undefined && { trainer: b.trainer }),
      ...(b.venue !== undefined && { venue: b.venue || null }),
      ...(b.startDate !== undefined && { startDate: day(b.startDate) }),
      ...(b.endDate !== undefined && { endDate: day(b.endDate) }),
      ...(b.startTime !== undefined && { startTime: b.startTime || null }),
      ...(b.endTime !== undefined && { endTime: b.endTime || null }),
      ...(b.maxAttendees !== undefined && { maxAttendees: parseInt(b.maxAttendees) || 20 }),
      ...(b.feePerPerson !== undefined && { feePerPerson: parseFloat(b.feePerPerson) || 0 }),
      ...(b.status !== undefined && { status: b.status }),
      ...(b.certificateTemplate !== undefined && { certificateTemplate: b.certificateTemplate || null }),
      ...(b.notes !== undefined && { notes: b.notes || null }),
    }
    const s = id
      ? await prisma.trainingSession.update({ where: { id }, data, include: sessionInclude })
      : await prisma.trainingSession.create({ data: { type: 'OTHER', ...data, title: b.title, trainer: b.trainer, startDate: day(b.startDate), endDate: day(b.endDate), createdById: req.user!.id }, include: sessionInclude })
    await logAudit(req, { action: id ? 'UPDATE' : 'CREATE', entity: 'Training', entityId: s.id, entityName: s.title, description: id ? `Updated training ${s.title}` : `Scheduled training ${s.title}` })
    res.status(id ? 200 : 201).json({ success: true, data: s, message: id ? 'Training updated' : 'Training scheduled' })
  } catch (e) { fail(res, e, 'saveTraining') }
}

export async function addAttendee(req: AuthRequest, res: Response): Promise<void> {
  try {
    const s = await prisma.trainingSession.findUnique({ where: { id: req.params.id }, include: { _count: { select: { attendees: true } } } })
    if (!s) { res.status(404).json({ success: false, message: 'Training not found' }); return }
    if (s._count.attendees >= s.maxAttendees) { res.status(400).json({ success: false, message: 'This session is full' }); return }
    const b = req.body
    if (!b.name) { res.status(400).json({ success: false, message: 'Attendee name is required' }); return }
    await prisma.trainingAttendee.create({ data: { sessionId: s.id, name: b.name, company: b.company || null, phone: b.phone || null, email: b.email || null, feeAmount: s.feePerPerson } })
    const updated = await prisma.trainingSession.findUnique({ where: { id: s.id }, include: sessionInclude })
    await logAudit(req, { action: 'CREATE', entity: 'Training', entityId: s.id, entityName: s.title, description: `Registered ${b.name} for ${s.title}` })
    res.status(201).json({ success: true, data: updated, message: 'Attendee registered' })
  } catch (e) { fail(res, e, 'addAttendee') }
}

/** Mark attendance / certificate / fee paid. Paying the fee books Training income. */
export async function updateAttendee(req: AuthRequest, res: Response): Promise<void> {
  try {
    const a = await prisma.trainingAttendee.findUnique({ where: { id: req.params.attendeeId }, include: { session: true } })
    if (!a) { res.status(404).json({ success: false, message: 'Attendee not found' }); return }
    const b = req.body
    if (b.certificateIssued && !['ATTENDED', 'CERTIFIED'].includes(b.status ?? a.status)) {
      res.status(400).json({ success: false, message: 'Only attendees who attended can receive a certificate' }); return
    }
    await prisma.$transaction(async tx => {
      let incomeId: string | undefined
      if (b.feePaid === true && !a.feePaid && a.feeAmount > 0) {
        const inc = await tx.incomeEntry.create({
          data: { date: new Date(), description: `Training fee — ${a.name} (${a.session.title})`, category: 'Training', amount: a.feeAmount, clientName: a.company || a.name, recordedById: req.user!.id },
        })
        incomeId = inc.id
      }
      await tx.trainingAttendee.update({
        where: { id: a.id },
        data: {
          ...(b.status !== undefined && { status: b.status }),
          ...(b.feePaid !== undefined && { feePaid: !!b.feePaid }),
          ...(b.certificateIssued !== undefined && { certificateIssued: !!b.certificateIssued, ...(b.certificateIssued && { status: 'CERTIFIED' }) }),
          ...(incomeId && { incomeId }),
        },
      })
    })
    const updated = await prisma.trainingSession.findUnique({ where: { id: a.sessionId }, include: sessionInclude })
    res.json({ success: true, data: updated, message: b.feePaid === true && a.feeAmount > 0 && !a.feePaid ? 'Fee recorded — added to Finance income' : 'Attendee updated' })
  } catch (e) { fail(res, e, 'updateAttendee') }
}

// ── KNOWLEDGE BASE ────────────────────────────────────────────────────────────

export async function getArticles(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Drafts are only visible to their author and admins
    const where: Prisma.KnowledgeArticleWhereInput = hasRole(req.user?.role, ADMINS) ? {} : { OR: [{ status: 'PUBLISHED' }, { authorId: req.user!.id }] }
    const rows = await prisma.knowledgeArticle.findMany({ where, include: { author: userName }, orderBy: { updatedAt: 'desc' } })
    res.json({ success: true, data: rows })
  } catch (e) { fail(res, e, 'getArticles') }
}

export async function saveArticle(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id
    const b = req.body
    if (!id && (!b.title || !b.content)) { res.status(400).json({ success: false, message: 'Title and content are required' }); return }
    if (id) {
      const before = await prisma.knowledgeArticle.findUnique({ where: { id } })
      if (!before) { res.status(404).json({ success: false, message: 'Article not found' }); return }
      if (before.authorId !== req.user!.id && !hasRole(req.user?.role, ADMINS)) { res.status(403).json({ success: false, message: 'Only the author can edit this article' }); return }
    }
    const tags = Array.isArray(b.tags) ? b.tags : String(b.tags ?? '').split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean)
    const data = {
      ...(b.title !== undefined && { title: b.title }),
      ...(b.category !== undefined && { category: b.category }),
      ...(b.content !== undefined && { content: b.content, excerpt: b.excerpt || String(b.content).replace(/\s+/g, ' ').slice(0, 140) }),
      ...(b.status !== undefined && { status: b.status }),
      ...(b.tags !== undefined && { tags }),
    }
    const a = id
      ? await prisma.knowledgeArticle.update({ where: { id }, data, include: { author: userName } })
      : await prisma.knowledgeArticle.create({ data: { category: 'GENERAL', ...data, title: b.title, content: b.content, authorId: req.user!.id }, include: { author: userName } })
    await logAudit(req, { action: id ? 'UPDATE' : 'CREATE', entity: 'Article', entityId: a.id, entityName: a.title, description: `${id ? 'Updated' : 'Wrote'} knowledge base article "${a.title}" (${a.status.toLowerCase()})` })
    res.status(id ? 200 : 201).json({ success: true, data: a, message: id ? 'Article updated' : 'Article saved' })
  } catch (e) { fail(res, e, 'saveArticle') }
}

export async function viewArticle(req: AuthRequest, res: Response): Promise<void> {
  try {
    const a = await prisma.knowledgeArticle.update({ where: { id: req.params.id }, data: { views: { increment: 1 } }, include: { author: userName } })
    res.json({ success: true, data: a })
  } catch (e) { fail(res, e, 'viewArticle') }
}

// ── COMPANY SETTINGS ──────────────────────────────────────────────────────────

const COMPANY_FIELDS = ['name', 'legalName', 'registrationNumber', 'tin', 'address', 'city', 'country', 'phone', 'email', 'website', 'industry', 'description']

export async function getCompany(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'company' } })
    res.json({ success: true, data: row?.value ?? {} })
  } catch (e) { fail(res, e, 'getCompany') }
}

export async function saveCompany(req: AuthRequest, res: Response): Promise<void> {
  try {
    const before = await prisma.setting.findUnique({ where: { key: 'company' } })
    const value = Object.fromEntries(COMPANY_FIELDS.map(f => [f, String(req.body[f] ?? '').trim()]))
    if (!value.name) { res.status(400).json({ success: false, message: 'Company name is required' }); return }
    await prisma.setting.upsert({ where: { key: 'company' }, update: { value }, create: { key: 'company', value } })
    const old = (before?.value ?? {}) as Record<string, string>
    const changed = COMPANY_FIELDS.filter(f => (old[f] ?? '') !== value[f])
    await logAudit(req, {
      action: 'UPDATE', entity: 'Company', entityId: 'company', entityName: value.name,
      description: changed.length ? `Updated company profile: ${changed.join(', ')}` : 'Saved company profile (no changes)',
      oldValue: Object.fromEntries(changed.map(f => [f, old[f] ?? ''])), newValue: Object.fromEntries(changed.map(f => [f, value[f]])),
    })
    res.json({ success: true, data: value, message: 'Company profile saved' })
  } catch (e) { fail(res, e, 'saveCompany') }
}
