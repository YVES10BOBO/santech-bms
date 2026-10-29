/**
 * Client services & renewals (recurring revenue), marketing campaigns, timesheets.
 */
import { Response } from 'express'
import prisma from '../lib/prisma'
import { logAudit } from '../lib/audit'
import { PROJECT_LEADS, hasRole } from '../lib/roles'
import type { AuthRequest } from '../middleware/auth'

const fail = (res: Response, error: unknown, where: string) => {
  console.error(`${where} error:`, error)
  res.status(500).json({ success: false, message: 'Internal server error' })
}
const userName = { select: { id: true, firstName: true, lastName: true } }
const date = (v: unknown) => new Date(String(v))

// ── CLIENT SERVICES & RENEWALS ────────────────────────────────────────────────

const subInclude = { client: { select: { id: true, companyName: true } } }
const CYCLE_MONTHS: Record<string, number> = { MONTHLY: 1, QUARTERLY: 3, ANNUAL: 12 }

export async function getSubscriptions(_req: AuthRequest, res: Response): Promise<void> {
  try {
    // Unpaid services past their renewal date are overdue
    await prisma.clientSubscription.updateMany({ where: { paymentStatus: 'UNPAID', renewalDate: { lt: new Date() } }, data: { paymentStatus: 'OVERDUE' } })
    const rows = await prisma.clientSubscription.findMany({ include: subInclude, orderBy: { renewalDate: 'asc' } })
    res.json({ success: true, data: rows })
  } catch (e) { fail(res, e, 'getSubscriptions') }
}

function subData(b: Record<string, unknown>) {
  return {
    ...(b.clientId !== undefined && { clientId: String(b.clientId) }),
    ...(b.systemName !== undefined && { systemName: String(b.systemName) }),
    ...(b.systemLink !== undefined && { systemLink: (b.systemLink as string) || null }),
    ...(b.serviceType !== undefined && { serviceType: String(b.serviceType) }),
    ...(b.hostingProvider !== undefined && { hostingProvider: String(b.hostingProvider) }),
    ...(b.hostingAccountEmail !== undefined && { hostingAccountEmail: (b.hostingAccountEmail as string) || null }),
    ...(b.hostingAccountInfo !== undefined && { hostingAccountInfo: (b.hostingAccountInfo as string) || null }),
    ...(b.billingCycle !== undefined && { billingCycle: String(b.billingCycle) }),
    ...(b.startDate !== undefined && { startDate: date(b.startDate) }),
    ...(b.renewalDate !== undefined && { renewalDate: date(b.renewalDate) }),
    ...(b.amount !== undefined && { amount: parseFloat(String(b.amount)) || 0 }),
    ...(b.cost !== undefined && { cost: parseFloat(String(b.cost)) || 0 }),
    ...(b.taxIncluded !== undefined && { taxIncluded: !!b.taxIncluded }),
    ...(b.taxRate !== undefined && { taxRate: parseFloat(String(b.taxRate)) || 0 }),
    ...(b.notes !== undefined && { notes: (b.notes as string) || null }),
  }
}

export async function saveSubscription(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id
    const b = req.body
    if (!id && (!b.clientId || !b.systemName || !b.startDate || !b.renewalDate || b.amount === undefined)) {
      res.status(400).json({ success: false, message: 'Client, system, dates and amount are required' }); return
    }
    const s = id
      ? await prisma.clientSubscription.update({ where: { id }, data: subData(b), include: subInclude })
      : await prisma.clientSubscription.create({ data: { serviceType: 'HOSTING_ONLY', ...subData(b) } as never, include: subInclude })
    await logAudit(req, {
      action: id ? 'UPDATE' : 'CREATE', entity: 'ClientService', entityId: s.id, entityName: `${s.systemName} — ${s.client.companyName ?? ''}`,
      description: id ? `Updated service ${s.systemName}` : `Added ${s.serviceType.replace(/_/g, ' ').toLowerCase()} service for ${s.client.companyName}`,
      newValue: { amount: s.amount, renewalDate: s.renewalDate.toISOString().slice(0, 10) },
    })
    res.status(id ? 200 : 201).json({ success: true, data: s, message: id ? 'Service updated' : 'Service added' })
  } catch (e) { fail(res, e, 'saveSubscription') }
}

/** Client paid this cycle: books the income in Finance. */
export async function paySubscription(req: AuthRequest, res: Response): Promise<void> {
  try {
    const before = await prisma.clientSubscription.findUnique({ where: { id: req.params.id }, include: subInclude })
    if (!before) { res.status(404).json({ success: false, message: 'Service not found' }); return }
    if (before.paymentStatus === 'PAID') { res.status(400).json({ success: false, message: 'Already paid for this period' }); return }
    // 'Tax included' on this page means VAT applies on top of the amount
    const total = before.amount + (before.taxIncluded ? Math.round(before.amount * before.taxRate / 100) : 0)
    const now = new Date()
    const s = await prisma.$transaction(async tx => {
      const updated = await tx.clientSubscription.update({ where: { id: before.id }, data: { paymentStatus: 'PAID', paymentDate: now }, include: subInclude })
      await tx.incomeEntry.create({
        data: {
          date: now, amount: total, category: 'Maintenance',
          description: `${before.serviceType.replace(/_/g, ' ').toLowerCase()} — ${before.systemName}`,
          clientId: before.clientId, clientName: before.client.companyName, recordedById: req.user!.id,
        },
      })
      return updated
    })
    await logAudit(req, {
      action: 'PAYMENT', entity: 'ClientService', entityId: s.id, entityName: `${s.systemName} — ${s.client.companyName ?? ''}`,
      description: `Recorded service payment of RWF ${total.toLocaleString('en-US')} from ${s.client.companyName}`,
      oldValue: { paymentStatus: before.paymentStatus }, newValue: { paymentStatus: 'PAID', amount: total },
    })
    res.json({ success: true, data: s, message: 'Marked paid — added to Finance income' })
  } catch (e) { fail(res, e, 'paySubscription') }
}

/** Starts the next billing period: renewal date moves forward one cycle, payment due again. */
export async function renewSubscription(req: AuthRequest, res: Response): Promise<void> {
  try {
    const before = await prisma.clientSubscription.findUnique({ where: { id: req.params.id }, include: subInclude })
    if (!before) { res.status(404).json({ success: false, message: 'Service not found' }); return }
    const months = CYCLE_MONTHS[before.billingCycle] ?? 12
    const next = new Date(before.renewalDate)
    next.setUTCMonth(next.getUTCMonth() + months)
    const s = await prisma.clientSubscription.update({
      where: { id: before.id },
      data: { renewalDate: next, paymentStatus: 'UNPAID', paymentDate: null },
      include: subInclude,
    })
    await logAudit(req, {
      action: 'UPDATE', entity: 'ClientService', entityId: s.id, entityName: `${s.systemName} — ${s.client.companyName ?? ''}`,
      description: `Renewed ${s.systemName} until ${next.toISOString().slice(0, 10)}`,
      oldValue: { renewalDate: before.renewalDate.toISOString().slice(0, 10) }, newValue: { renewalDate: next.toISOString().slice(0, 10) },
    })
    res.json({ success: true, data: s, message: `Renewed until ${next.toISOString().slice(0, 10)} — payment now due` })
  } catch (e) { fail(res, e, 'renewSubscription') }
}

// ── MARKETING CAMPAIGNS ───────────────────────────────────────────────────────

export async function getCampaigns(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const rows = await prisma.campaign.findMany({ include: { createdBy: userName }, orderBy: { startDate: 'desc' } })
    res.json({ success: true, data: rows })
  } catch (e) { fail(res, e, 'getCampaigns') }
}

export async function saveCampaign(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id
    const b = req.body
    if (!id && (!b.name || !b.startDate || !b.endDate || b.budget === undefined)) {
      res.status(400).json({ success: false, message: 'Name, dates and budget are required' }); return
    }
    if (b.startDate && b.endDate && b.endDate < b.startDate) { res.status(400).json({ success: false, message: 'End date is before start date' }); return }
    const data = {
      ...(b.name !== undefined && { name: b.name }),
      ...(b.type !== undefined && { type: b.type }),
      ...(b.status !== undefined && { status: b.status }),
      ...(b.objective !== undefined && { objective: b.objective || null }),
      ...(b.targetAudience !== undefined && { targetAudience: b.targetAudience || null }),
      ...(b.startDate !== undefined && { startDate: date(b.startDate) }),
      ...(b.endDate !== undefined && { endDate: date(b.endDate) }),
      ...(b.budget !== undefined && { budget: parseFloat(b.budget) || 0 }),
      ...(b.channel !== undefined && { channel: b.channel }),
      ...(b.assignedTeam !== undefined && { assignedTeam: b.assignedTeam || null }),
      ...(b.leadsGenerated !== undefined && { leadsGenerated: parseInt(b.leadsGenerated) || 0 }),
      ...(b.clientsAcquired !== undefined && { clientsAcquired: parseInt(b.clientsAcquired) || 0 }),
      ...(b.revenueGenerated !== undefined && { revenueGenerated: parseFloat(b.revenueGenerated) || 0 }),
      ...(b.notes !== undefined && { notes: b.notes || null }),
    }
    const before = id ? await prisma.campaign.findUnique({ where: { id } }) : null
    const c = id
      ? await prisma.campaign.update({ where: { id }, data, include: { createdBy: userName } })
      : await prisma.campaign.create({ data: { type: 'OTHER', ...data, createdById: req.user!.id } as never, include: { createdBy: userName } })
    await logAudit(req, {
      action: id ? (b.status && b.status !== before?.status ? 'STATUS_CHANGE' : 'UPDATE') : 'CREATE', entity: 'Campaign', entityId: c.id, entityName: c.name,
      description: id ? `Updated campaign ${c.name}` : `Created campaign ${c.name} with budget RWF ${c.budget.toLocaleString('en-US')}`,
      oldValue: before ? { status: before.status, leads: before.leadsGenerated, revenue: before.revenueGenerated } : undefined,
      newValue: { status: c.status, leads: c.leadsGenerated, revenue: c.revenueGenerated },
    })
    res.status(id ? 200 : 201).json({ success: true, data: c, message: id ? 'Campaign updated' : 'Campaign created' })
  } catch (e) { fail(res, e, 'saveCampaign') }
}

// ── TIMESHEETS + PROJECT PROFITABILITY ────────────────────────────────────────

const HOURS_PER_MONTH = 176 // 22 working days × 8 hours

export async function getTimesheets(req: AuthRequest, res: Response): Promise<void> {
  try {
    const lead = hasRole(req.user?.role, PROJECT_LEADS)
    const [rows, projects, employees] = await Promise.all([
      prisma.timesheet.findMany({
        where: lead ? {} : { userId: req.user!.id },
        include: { user: userName, project: { select: { id: true, name: true } }, reviewedBy: userName },
        orderBy: { date: 'desc' },
      }),
      lead ? prisma.project.findMany({ select: { id: true, name: true, contractValue: true, budget: true, status: true, invoices: { select: { payments: { select: { amount: true } } } } } }) : Promise.resolve([]),
      lead ? prisma.employee.findMany({ select: { userId: true, baseSalary: true } }) : Promise.resolve([]),
    ])
    // Profitability = payments received on the project's invoices − staff time cost (approved hours × hourly rate)
    const rate = new Map(employees.map(e => [e.userId, e.baseSalary / HOURS_PER_MONTH]))
    const approved = rows.filter(r => r.status === 'APPROVED')
    const profitability = projects.map(p => {
      const mine = approved.filter(r => r.project.id === p.id)
      const hours = mine.reduce((s, r) => s + r.hours, 0)
      const staffCost = Math.round(mine.reduce((s, r) => s + r.hours * (rate.get(r.user.id) ?? 0), 0))
      const received = p.invoices.reduce((s, i) => s + i.payments.reduce((a, pay) => a + pay.amount, 0), 0)
      return { projectId: p.id, project: p.name, status: p.status, contractValue: p.contractValue, received, hours, staffCost, profit: received - staffCost }
    }).filter(p => p.hours > 0 || p.received > 0).sort((a, b) => b.received - a.received)
    res.json({ success: true, data: rows, profitability })
  } catch (e) { fail(res, e, 'getTimesheets') }
}

export async function createTimesheet(req: AuthRequest, res: Response): Promise<void> {
  try {
    const b = req.body
    const hours = parseFloat(b.hours)
    if (!b.projectId || !b.task || !b.date || !(hours > 0 && hours <= 24)) {
      res.status(400).json({ success: false, message: 'Project, task, date and hours (0–24) are required' }); return
    }
    // Staff log their own time; project leads may log for someone else
    const userId = b.userId && hasRole(req.user?.role, PROJECT_LEADS) ? b.userId : req.user!.id
    const t = await prisma.timesheet.create({
      data: { userId, projectId: b.projectId, task: b.task, date: date(b.date), hours, notes: b.notes || null },
      include: { user: userName, project: { select: { id: true, name: true } }, reviewedBy: userName },
    })
    await logAudit(req, {
      action: 'CREATE', entity: 'Timesheet', entityId: t.id, entityName: `${t.user.firstName} ${t.user.lastName} — ${t.project.name}`,
      description: `Logged ${hours}h on ${t.project.name} (${t.task})`, newValue: { hours, date: String(b.date).slice(0, 10) },
    })
    res.status(201).json({ success: true, data: t, message: 'Time logged — waiting for approval' })
  } catch (e) { fail(res, e, 'createTimesheet') }
}

export async function reviewTimesheet(req: AuthRequest, res: Response): Promise<void> {
  try {
    const status = req.params.decision === 'approve' ? 'APPROVED' : req.params.decision === 'reject' ? 'REJECTED' : null
    if (!status) { res.status(404).json({ success: false, message: 'Unknown action' }); return }
    const before = await prisma.timesheet.findUnique({ where: { id: req.params.id } })
    if (!before) { res.status(404).json({ success: false, message: 'Entry not found' }); return }
    if (before.userId === req.user!.id) { res.status(403).json({ success: false, message: 'You cannot approve your own time' }); return }
    if (before.status !== 'PENDING') { res.status(400).json({ success: false, message: 'Only pending entries can be reviewed' }); return }
    const t = await prisma.timesheet.update({
      where: { id: before.id },
      data: { status, reviewedById: req.user!.id, reviewedAt: new Date() },
      include: { user: userName, project: { select: { id: true, name: true } }, reviewedBy: userName },
    })
    await logAudit(req, {
      action: status === 'APPROVED' ? 'APPROVE' : 'REJECT', entity: 'Timesheet', entityId: t.id,
      entityName: `${t.user.firstName} ${t.user.lastName} — ${t.project.name}`,
      description: `${status === 'APPROVED' ? 'Approved' : 'Rejected'} ${t.hours}h by ${t.user.firstName} ${t.user.lastName} on ${t.project.name}`,
      oldValue: { status: 'PENDING' }, newValue: { status },
    })
    res.json({ success: true, data: t, message: status === 'APPROVED' ? 'Time approved' : 'Time rejected' })
  } catch (e) { fail(res, e, 'reviewTimesheet') }
}
