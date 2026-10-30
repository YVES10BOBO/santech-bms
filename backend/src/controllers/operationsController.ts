/**
 * Support tickets, product catalog, departments and reception (visitors).
 */
import { Response } from 'express'
import type { Prisma, TicketStatus, ProductCategory } from '@prisma/client'
import prisma from '../lib/prisma'
import { logAudit } from '../lib/audit'
import { notify } from '../lib/notifications'
import { nextDocumentNumber } from '../lib/numbering'
import type { AuthRequest } from '../middleware/auth'

const fail = (res: Response, error: unknown, where: string) => {
  console.error(`${where} error:`, error)
  res.status(500).json({ success: false, message: 'Internal server error' })
}
const userName = { select: { id: true, firstName: true, lastName: true } }

// ── SUPPORT TICKETS ───────────────────────────────────────────────────────────

const ticketInclude = { client: { select: { id: true, companyName: true, fullName: true, teamName: true, delegationName: true } }, assignedTo: userName, createdBy: userName }

export async function getTickets(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const rows = await prisma.supportTicket.findMany({ include: ticketInclude, orderBy: { createdAt: 'desc' } })
    res.json({ success: true, data: rows })
  } catch (e) { fail(res, e, 'getTickets') }
}

export async function createTicket(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { clientId, subject, description, product, priority, assignedToId } = req.body
    if (!clientId || !subject || !description) {
      res.status(400).json({ success: false, message: 'Client, subject and description are required' }); return
    }
    const t = await prisma.supportTicket.create({
      data: {
        ticketNo: await nextDocumentNumber('TKT'), clientId, subject, description,
        product: product || 'Other', priority: priority || 'MEDIUM',
        status: assignedToId ? 'ASSIGNED' : 'NEW', assignedToId: assignedToId || null, createdById: req.user!.id,
      },
      include: ticketInclude,
    })
    if (t.assignedToId && t.assignedToId !== req.user!.id) {
      await notify(t.assignedToId, {
        type: 'SYSTEM', title: 'Support Ticket Assigned', link: '/support',
        description: `${t.ticketNo} (${t.priority}) — ${t.client.companyName}: ${t.subject}`,
      })
    }
    await logAudit(req, {
      action: 'CREATE', entity: 'Ticket', entityId: t.id, entityName: `${t.ticketNo} — ${t.client.companyName ?? ''}`,
      description: `Opened ${t.priority.toLowerCase()} ticket ${t.ticketNo}: ${t.subject}`,
      newValue: { product: t.product, priority: t.priority, status: t.status },
    })
    res.status(201).json({ success: true, data: t, message: `Ticket ${t.ticketNo} created` })
  } catch (e) { fail(res, e, 'createTicket') }
}

export async function updateTicket(req: AuthRequest, res: Response): Promise<void> {
  try {
    const before = await prisma.supportTicket.findUnique({ where: { id: req.params.id } })
    if (!before) { res.status(404).json({ success: false, message: 'Ticket not found' }); return }
    const { status, assignedToId, priority, satisfaction, satisfactionNote } = req.body as {
      status?: TicketStatus; assignedToId?: string | null; priority?: string; satisfaction?: number; satisfactionNote?: string
    }
    if (before.status === 'CLOSED' && status && status !== 'CLOSED') {
      res.status(400).json({ success: false, message: 'Closed tickets cannot be reopened — create a new ticket' }); return
    }
    const nextStatus = status ?? (assignedToId && before.status === 'NEW' ? 'ASSIGNED' : undefined)
    // Customer satisfaction (1–5) can only be given once the ticket is resolved
    if (satisfaction !== undefined) {
      const rating = Number(satisfaction)
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) { res.status(400).json({ success: false, message: 'Rating must be 1 to 5' }); return }
      if (!['RESOLVED', 'CLOSED'].includes(nextStatus ?? before.status)) { res.status(400).json({ success: false, message: 'Rate the support after the ticket is resolved' }); return }
    }
    // First response: the first time the team actually works on the ticket
    const responded = !before.firstResponseAt && !!nextStatus && ['IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'].includes(nextStatus)
    const t = await prisma.supportTicket.update({
      where: { id: before.id },
      data: {
        ...(nextStatus && { status: nextStatus }),
        ...(assignedToId !== undefined && { assignedToId: assignedToId || null }),
        ...(priority && { priority: priority as Prisma.SupportTicketUpdateInput['priority'] }),
        ...(nextStatus === 'RESOLVED' && !before.resolvedAt && { resolvedAt: new Date() }),
        ...(nextStatus === 'CLOSED' && !before.resolvedAt && { resolvedAt: new Date() }),
        ...(responded && { firstResponseAt: new Date() }),
        ...(satisfaction !== undefined && { satisfaction: Number(satisfaction), satisfactionNote: satisfactionNote?.trim() || null }),
      },
      include: ticketInclude,
    })
    if (assignedToId && assignedToId !== before.assignedToId && assignedToId !== req.user!.id) {
      await notify(assignedToId, { type: 'SYSTEM', title: 'Support Ticket Assigned', link: '/support', description: `${t.ticketNo} — ${t.client.companyName}: ${t.subject}` })
    }
    await logAudit(req, {
      action: nextStatus && nextStatus !== before.status ? 'STATUS_CHANGE' : 'UPDATE',
      entity: 'Ticket', entityId: t.id, entityName: `${t.ticketNo} — ${t.client.companyName ?? ''}`,
      description: nextStatus && nextStatus !== before.status ? `Ticket ${t.ticketNo} moved from ${before.status} to ${nextStatus}`
        : satisfaction !== undefined ? `Customer rated ticket ${t.ticketNo}: ${satisfaction}/5` : `Updated ticket ${t.ticketNo}`,
      oldValue: { status: before.status, assignedToId: before.assignedToId }, newValue: { status: t.status, assignedToId: t.assignedToId },
    })
    res.json({ success: true, data: t, message: 'Ticket updated' })
  } catch (e) { fail(res, e, 'updateTicket') }
}

// ── PRODUCT CATALOG ───────────────────────────────────────────────────────────

const CATEGORY_TO_DB: Record<string, ProductCategory> = {
  EVS: 'EVS', SANTRACK: 'SANTRACK', REVIXSAN: 'REVIXSAN', SANBOOK: 'SANBOOK', SANHUB: 'SANHUB',
  Website: 'WEBSITE', 'Mobile App': 'MOBILE_APP', Training: 'TRAINING', Consultancy: 'CONSULTANCY',
  Maintenance: 'MAINTENANCE', Other: 'OTHER', CRM: 'CRM', ERP: 'ERP', 'AI Solution': 'AI_SOLUTION', IoT: 'IOT',
}
export const CATEGORY_TO_LABEL = Object.fromEntries(Object.entries(CATEGORY_TO_DB).map(([k, v]) => [v, k])) as Record<ProductCategory, string>
const toProductDto = (p: Prisma.ProductGetPayload<object>) => ({ ...p, category: CATEGORY_TO_LABEL[p.category] ?? 'Other' })

export async function getProducts(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const rows = await prisma.product.findMany({ orderBy: [{ isActive: 'desc' }, { name: 'asc' }] })
    res.json({ success: true, data: rows.map(toProductDto) })
  } catch (e) { fail(res, e, 'getProducts') }
}

function productData(b: Record<string, unknown>) {
  return {
    ...(b.name !== undefined && { name: String(b.name) }),
    ...(b.category !== undefined && { category: CATEGORY_TO_DB[String(b.category)] ?? 'OTHER' }),
    ...(b.description !== undefined && { description: (b.description as string) || null }),
    ...(b.price !== undefined && { price: parseFloat(String(b.price)) || 0 }),
    ...(b.cost !== undefined && { cost: parseFloat(String(b.cost)) || 0 }),
    ...(b.taxRate !== undefined && { taxRate: parseFloat(String(b.taxRate)) || 0 }),
    ...(b.sla !== undefined && { sla: (b.sla as string) || null }),
    ...(b.isActive !== undefined && { isActive: !!b.isActive }),
  }
}

export async function createProduct(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.body.name || req.body.price === undefined) { res.status(400).json({ success: false, message: 'Name and price are required' }); return }
    const p = await prisma.product.create({ data: { category: 'OTHER', price: 0, ...productData(req.body), name: req.body.name } })
    await logAudit(req, { action: 'CREATE', entity: 'Product', entityId: p.id, entityName: p.name, description: `Added product ${p.name} at RWF ${p.price.toLocaleString('en-US')}`, newValue: { price: p.price, category: p.category } })
    res.status(201).json({ success: true, data: toProductDto(p), message: 'Product added' })
  } catch (e) { fail(res, e, 'createProduct') }
}

export async function updateProduct(req: AuthRequest, res: Response): Promise<void> {
  try {
    const before = await prisma.product.findUnique({ where: { id: req.params.id } })
    if (!before) { res.status(404).json({ success: false, message: 'Product not found' }); return }
    const p = await prisma.product.update({ where: { id: before.id }, data: productData(req.body) })
    const toggled = req.body.isActive !== undefined && Object.keys(req.body).length === 1
    await logAudit(req, {
      action: 'UPDATE', entity: 'Product', entityId: p.id, entityName: p.name,
      description: toggled ? `${p.isActive ? 'Activated' : 'Deactivated'} product ${p.name}` : `Updated product ${p.name}`,
      oldValue: { price: before.price, isActive: before.isActive }, newValue: { price: p.price, isActive: p.isActive },
    })
    res.json({ success: true, data: toProductDto(p), message: 'Product updated' })
  } catch (e) { fail(res, e, 'updateProduct') }
}

// ── DEPARTMENTS ───────────────────────────────────────────────────────────────

const ACTIVE_PROJECT: Prisma.ProjectWhereInput['status'] = { in: ['PLANNING', 'NOT_STARTED', 'IN_PROGRESS', 'ON_HOLD', 'AT_RISK', 'DELAYED'] }

export async function getDepartments(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const [departments, employees, projects] = await Promise.all([
      prisma.department.findMany({ include: { head: { select: { id: true, firstName: true, lastName: true, email: true } } }, orderBy: { name: 'asc' } }),
      prisma.employee.findMany({ where: { employmentStatus: { not: 'TERMINATED' } }, select: { userId: true, department: true, performanceScore: true } }),
      prisma.project.findMany({ where: { status: ACTIVE_PROJECT }, select: { projectManagerId: true } }),
    ])
    // Live figures come from the employees in each department
    const data = departments.map(d => {
      const staff = employees.filter(e => e.department.toLowerCase() === d.name.toLowerCase())
      const staffIds = new Set(staff.map(s => s.userId))
      return {
        ...d,
        employeeCount: staff.length,
        activeProjects: projects.filter(p => staffIds.has(p.projectManagerId)).length,
        avgPerformance: staff.length ? Math.round(staff.reduce((s, e) => s + e.performanceScore, 0) / staff.length) : 0,
      }
    })
    res.json({ success: true, data })
  } catch (e) { fail(res, e, 'getDepartments') }
}

export async function saveDepartment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, description, headId, budget, color } = req.body
    const id = req.params.id
    if (!id && !name) { res.status(400).json({ success: false, message: 'Department name is required' }); return }
    const data = {
      ...(name !== undefined && { name: String(name).trim() }),
      ...(description !== undefined && { description: description || null }),
      ...(headId !== undefined && { headId: headId || null }),
      ...(budget !== undefined && { budget: parseFloat(budget) || 0 }),
      ...(color !== undefined && { color }),
    }
    const before = id ? await prisma.department.findUnique({ where: { id } }) : null
    if (id && !before) { res.status(404).json({ success: false, message: 'Department not found' }); return }
    const d = id
      ? await prisma.department.update({ where: { id }, data })
      : await prisma.department.create({ data: { name: String(name).trim(), ...data } })
    // Renaming a department moves its employees along with it
    if (before && data.name && data.name !== before.name) {
      await prisma.employee.updateMany({ where: { department: before.name }, data: { department: data.name } })
    }
    await logAudit(req, {
      action: id ? 'UPDATE' : 'CREATE', entity: 'Department', entityId: d.id, entityName: d.name,
      description: id ? `Updated department ${d.name}` : `Created department ${d.name}`,
      oldValue: before ? { name: before.name, budget: before.budget } : undefined, newValue: { name: d.name, budget: d.budget },
    })
    res.status(id ? 200 : 201).json({ success: true, data: d, message: id ? 'Department updated' : 'Department created' })
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2002') { res.status(409).json({ success: false, message: 'A department with this name already exists' }); return }
    fail(res, e, 'saveDepartment')
  }
}

// ── RECEPTION / VISITORS ──────────────────────────────────────────────────────

const visitorInclude = { host: userName }

export async function getVisitors(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const rows = await prisma.visitor.findMany({ include: visitorInclude, orderBy: [{ expectedDate: 'desc' }, { expectedTime: 'desc' }] })
    res.json({ success: true, data: rows })
  } catch (e) { fail(res, e, 'getVisitors') }
}

async function tellHost(v: { hostId: string | null; visitorName: string; company: string | null }, title: string, verb: string) {
  if (!v.hostId) return
  await notify(v.hostId, { type: 'SYSTEM', title, link: '/reception', description: `${v.visitorName}${v.company ? ` (${v.company})` : ''} ${verb}` })
}

export async function createVisitor(req: AuthRequest, res: Response): Promise<void> {
  try {
    const b = req.body
    if (!b.visitorName || !b.purpose || !b.expectedDate) {
      res.status(400).json({ success: false, message: 'Visitor name, purpose and date are required' }); return
    }
    // A visitor registered for today who is already here is a walk-in (checked in now)
    const walkIn = !!b.walkIn
    const v = await prisma.visitor.create({
      data: {
        visitorName: b.visitorName, company: b.company || null, phone: b.phone || null, email: b.email || null,
        idNumber: b.idNumber || null, purpose: b.purpose, hostId: b.hostId || null,
        expectedDate: new Date(b.expectedDate), expectedTime: b.expectedTime || null,
        expectedDuration: parseInt(b.expectedDuration) || 60, notes: b.notes || null,
        status: walkIn ? 'WALK_IN' : 'EXPECTED', ...(walkIn && { checkInTime: new Date() }),
      },
      include: visitorInclude,
    })
    if (walkIn) await tellHost(v, 'Visitor Arrived', 'has arrived at reception (walk-in)')
    else await tellHost(v, 'Visitor Scheduled', `is expected on ${String(b.expectedDate).slice(0, 10)}${v.expectedTime ? ` at ${v.expectedTime}` : ''}`)
    await logAudit(req, {
      action: 'CREATE', entity: 'Visitor', entityId: v.id, entityName: v.visitorName,
      description: walkIn ? `Registered walk-in visitor ${v.visitorName}` : `Scheduled visit from ${v.visitorName}`,
      newValue: { purpose: v.purpose, status: v.status },
    })
    res.status(201).json({ success: true, data: v, message: walkIn ? 'Walk-in registered — host notified' : 'Visit scheduled' })
  } catch (e) { fail(res, e, 'createVisitor') }
}

export async function visitorAction(req: AuthRequest, res: Response): Promise<void> {
  try {
    const action = req.params.action as 'check-in' | 'check-out' | 'no-show'
    const before = await prisma.visitor.findUnique({ where: { id: req.params.id } })
    if (!before) { res.status(404).json({ success: false, message: 'Visitor not found' }); return }
    const rules = {
      'check-in': { from: ['EXPECTED'], to: 'CHECKED_IN' as const },
      'check-out': { from: ['CHECKED_IN', 'WALK_IN'], to: 'CHECKED_OUT' as const },
      'no-show': { from: ['EXPECTED'], to: 'NO_SHOW' as const },
    }[action]
    if (!rules) { res.status(404).json({ success: false, message: 'Unknown action' }); return }
    if (!rules.from.includes(before.status)) { res.status(400).json({ success: false, message: `Visitor is ${before.status.replace('_', ' ').toLowerCase()}` }); return }
    const v = await prisma.visitor.update({
      where: { id: before.id },
      data: {
        status: rules.to,
        ...(action === 'check-in' && { checkInTime: new Date() }),
        ...(action === 'check-out' && { checkOutTime: new Date() }),
      },
      include: visitorInclude,
    })
    if (action === 'check-in') await tellHost(v, 'Visitor Arrived', 'has arrived at reception')
    await logAudit(req, {
      action: 'STATUS_CHANGE', entity: 'Visitor', entityId: v.id, entityName: v.visitorName,
      description: action === 'check-in' ? `Checked in ${v.visitorName}` : action === 'check-out' ? `Checked out ${v.visitorName}` : `Marked ${v.visitorName} as no-show`,
      oldValue: { status: before.status }, newValue: { status: v.status },
    })
    res.json({ success: true, data: v, message: action === 'check-in' ? 'Checked in — host notified' : action === 'check-out' ? 'Checked out' : 'Marked as no-show' })
  } catch (e) { fail(res, e, 'visitorAction') }
}
