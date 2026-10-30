import { Response } from 'express'
import prisma from '../lib/prisma'
import { logAudit } from '../lib/audit'
import { nextDocumentNumber } from '../lib/numbering'
import type { AuthRequest } from '../middleware/auth'

// ── PROJECTS ──────────────────────────────────────────────────────────────────

export async function getProjects(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 50, status, priority, search } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (priority) where.priority = priority
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { client: { companyName: { contains: String(search), mode: 'insensitive' } } },
      ]
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where, skip, take: Number(limit),
        include: {
          client: { select: { id: true, companyName: true } },
          contract: { select: { id: true, contractNumber: true } },
          projectManager: { select: { id: true, firstName: true, lastName: true } },
          milestones: { orderBy: { deadline: 'asc' } },
          _count: { select: { tasks: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.project.count({ where })
    ])

    res.json({
      success: true,
      data: projects,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) }
    })
  } catch (error) {
    console.error('getProjects error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function getProject(req: AuthRequest, res: Response): Promise<void> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        contract: true,
        projectManager: { select: { id: true, firstName: true, lastName: true, email: true } },
        milestones: { orderBy: { deadline: 'asc' } },
        tasks: {
          include: {
            assignedTo: { select: { id: true, firstName: true, lastName: true } },
            assignedBy: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    if (!project) { res.status(404).json({ success: false, message: 'Project not found' }); return }
    res.json({ success: true, data: project })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function createProject(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      name, clientId, contractId, projectManagerId,
      budget, contractValue, currency, startDate, endDate,
      priority, status, progress, description, risks, warrantyEndDate,
      milestones: milestonesInput
    } = req.body

    if (!name || !clientId || !projectManagerId || !startDate || !endDate) {
      res.status(400).json({ success: false, message: 'name, clientId, projectManagerId, startDate and endDate are required' })
      return
    }

    const project = await prisma.project.create({
      data: {
        name,
        clientId,
        contractId: contractId || null,
        projectManagerId,
        budget: parseFloat(budget) || 0,
        contractValue: parseFloat(contractValue) || 0,
        currency: currency || 'RWF',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        priority: priority || 'MEDIUM',
        status: status || 'PLANNING',
        progress: parseFloat(progress) || 0,
        description: description || null,
        risks: risks || null,
        warrantyEndDate: warrantyEndDate ? new Date(warrantyEndDate) : null,
        milestones: milestonesInput?.length ? {
          create: milestonesInput.map((m: { name: string; deadline: string; deliverables?: string; paymentPercentage?: number }, i: number) => ({
            name: m.name,
            milestoneNumber: i + 1,
            deadline: new Date(m.deadline),
            deliverables: m.deliverables || null,
            paymentPercentage: m.paymentPercentage || 0,
          }))
        } : undefined
      },
      include: {
        client: { select: { id: true, companyName: true } },
        projectManager: { select: { id: true, firstName: true, lastName: true } },
        milestones: true,
      }
    })

    await logAudit(req, {
      action: 'CREATE', entity: 'Project', entityId: project.id, entityName: project.name,
      description: `Created project ${project.name} for ${project.client.companyName ?? 'client'}`,
      newValue: { client: project.client.companyName, budget: project.budget, status: project.status },
    })
    res.status(201).json({ success: true, data: project, message: 'Project created successfully' })
  } catch (error) {
    console.error('createProject error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function updateProject(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      name, clientId, contractId, projectManagerId,
      budget, contractValue, currency, startDate, endDate,
      priority, status, progress, description, risks, warrantyEndDate
    } = req.body

    const before = await prisma.project.findUnique({ where: { id: req.params.id } })
    if (!before) { res.status(404).json({ success: false, message: 'Project not found' }); return }

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(clientId !== undefined && { clientId }),
        ...(contractId !== undefined && { contractId }),
        ...(projectManagerId !== undefined && { projectManagerId }),
        ...(budget !== undefined && { budget: parseFloat(budget) }),
        ...(contractValue !== undefined && { contractValue: parseFloat(contractValue) }),
        ...(currency !== undefined && { currency }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
        ...(priority !== undefined && { priority }),
        ...(status !== undefined && { status }),
        ...(progress !== undefined && { progress: parseFloat(progress) }),
        ...(description !== undefined && { description }),
        ...(risks !== undefined && { risks }),
        ...(warrantyEndDate !== undefined && { warrantyEndDate: warrantyEndDate ? new Date(warrantyEndDate) : null }),
      },
      include: {
        client: { select: { id: true, companyName: true } },
        projectManager: { select: { id: true, firstName: true, lastName: true } },
        milestones: true,
      }
    })
    const statusChanged = status !== undefined && status !== before.status
    await logAudit(req, {
      action: statusChanged ? 'STATUS_CHANGE' : 'UPDATE', entity: 'Project', entityId: project.id, entityName: project.name,
      description: statusChanged ? `Changed project ${project.name} from ${before.status} to ${project.status}` : `Updated project ${project.name}`,
      oldValue: { status: before.status, progress: before.progress, budget: before.budget },
      newValue: { status: project.status, progress: project.progress, budget: project.budget },
    })
    res.json({ success: true, data: project, message: 'Project updated successfully' })
  } catch (error) {
    console.error('updateProject error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function deleteProject(req: AuthRequest, res: Response): Promise<void> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { tasks: true, invoices: true } } },
    })
    if (!project) { res.status(404).json({ success: false, message: 'Project not found' }); return }
    if (project._count.tasks > 0 || project._count.invoices > 0) {
      res.status(409).json({ success: false, message: 'This project has tasks or invoices. Set its status to Cancelled instead.' }); return
    }
    await prisma.$transaction([
      prisma.milestone.deleteMany({ where: { projectId: project.id } }),
      prisma.project.delete({ where: { id: project.id } }),
    ])
    await logAudit(req, {
      action: 'DELETE', entity: 'Project', entityId: project.id, entityName: project.name,
      description: `Deleted project ${project.name}`, oldValue: { status: project.status, budget: project.budget },
    })
    res.json({ success: true, message: 'Project deleted successfully' })
  } catch (error) {
    console.error('deleteProject error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

// ── MILESTONES ────────────────────────────────────────────────────────────────

const milestoneInclude = {
  project: {
    select: {
      id: true, name: true, contractValue: true, clientId: true, contractId: true,
      client: { select: { companyName: true } },
      contract: { select: { contractNumber: true } },
      projectManager: { select: { firstName: true, lastName: true } },
    },
  },
  invoice: { select: { id: true, invoiceNumber: true, status: true } },
}

export async function getMilestones(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { projectId } = req.query
    const milestones = await prisma.milestone.findMany({
      where: projectId ? { projectId: String(projectId) } : {},
      include: milestoneInclude,
      orderBy: [{ deadline: 'asc' }, { milestoneNumber: 'asc' }],
    })
    res.json({ success: true, data: milestones })
  } catch (error) {
    console.error('getMilestones error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function createMilestone(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { projectId, name, deadline, deliverables, paymentPercentage, milestoneNumber, description, status } = req.body
    if (!projectId || !name || !deadline) {
      res.status(400).json({ success: false, message: 'Project, name and deadline are required' }); return
    }
    const pct = parseFloat(paymentPercentage) || 0
    if (pct < 0 || pct > 100) { res.status(400).json({ success: false, message: 'Payment % must be between 0 and 100' }); return }

    const milestone = await prisma.milestone.create({
      data: {
        projectId, name,
        milestoneNumber: parseInt(milestoneNumber) || 1,
        description: description || null,
        deadline: new Date(deadline),
        deliverables: deliverables || null,
        paymentPercentage: pct,
        status: status && ['NOT_STARTED', 'IN_PROGRESS'].includes(status) ? status : 'NOT_STARTED',
      },
      include: milestoneInclude,
    })
    await logAudit(req, {
      action: 'CREATE', entity: 'Milestone', entityId: milestone.id,
      entityName: `${milestone.name} — ${milestone.project.name}`,
      description: `Added milestone ${milestone.name} (${pct}% payment) to ${milestone.project.name}`,
      newValue: { deadline, paymentPercentage: pct },
    })
    res.status(201).json({ success: true, data: milestone, message: 'Milestone created' })
  } catch (error) {
    console.error('createMilestone error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function updateMilestone(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, deadline, deliverables, paymentPercentage, description, milestoneNumber, status } = req.body
    if (status !== undefined && !['NOT_STARTED', 'IN_PROGRESS'].includes(status)) {
      res.status(400).json({ success: false, message: 'Use the complete / approve / invoice actions to move a milestone forward' }); return
    }
    const milestone = await prisma.milestone.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(deadline !== undefined && { deadline: new Date(deadline) }),
        ...(deliverables !== undefined && { deliverables }),
        ...(description !== undefined && { description }),
        ...(milestoneNumber !== undefined && { milestoneNumber: parseInt(milestoneNumber) || 1 }),
        ...(paymentPercentage !== undefined && { paymentPercentage: parseFloat(paymentPercentage) }),
        ...(status !== undefined && { status }),
      },
      include: milestoneInclude,
    })
    res.json({ success: true, data: milestone, message: 'Milestone updated' })
  } catch (error) {
    console.error('updateMilestone error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

/** Project team marks the work done; it then waits for management approval. */
export async function completeMilestone(req: AuthRequest, res: Response): Promise<void> {
  try {
    const m = await prisma.milestone.findUnique({ where: { id: req.params.id }, include: milestoneInclude })
    if (!m) { res.status(404).json({ success: false, message: 'Milestone not found' }); return }
    if (!['NOT_STARTED', 'IN_PROGRESS'].includes(m.status)) {
      res.status(400).json({ success: false, message: 'This milestone is already completed' }); return
    }
    const updated = await prisma.milestone.update({
      where: { id: m.id },
      data: { status: 'PENDING_APPROVAL', completedAt: new Date() },
      include: milestoneInclude,
    })
    await logAudit(req, {
      action: 'STATUS_CHANGE', entity: 'Milestone', entityId: m.id, entityName: `${m.name} — ${m.project.name}`,
      description: `Marked milestone ${m.name} as complete — waiting for approval`,
      oldValue: { status: m.status }, newValue: { status: 'PENDING_APPROVAL' },
    })
    res.json({ success: true, data: updated, message: 'Milestone sent for approval' })
  } catch (error) {
    console.error('completeMilestone error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function approveMilestone(req: AuthRequest, res: Response): Promise<void> {
  try {
    const m = await prisma.milestone.findUnique({ where: { id: req.params.id }, include: milestoneInclude })
    if (!m) { res.status(404).json({ success: false, message: 'Milestone not found' }); return }
    if (m.status !== 'PENDING_APPROVAL') {
      res.status(400).json({ success: false, message: 'Only milestones waiting for approval can be approved' }); return
    }
    const updated = await prisma.milestone.update({
      where: { id: m.id },
      data: { status: 'APPROVED', isCompleted: true, approvedAt: new Date() },
      include: milestoneInclude,
    })
    await logAudit(req, {
      action: 'APPROVE', entity: 'Milestone', entityId: m.id, entityName: `${m.name} — ${m.project.name}`,
      description: `Approved milestone ${m.name} — ready for invoicing`,
      oldValue: { status: m.status }, newValue: { status: 'APPROVED' },
    })
    res.json({ success: true, data: updated, message: 'Milestone approved' })
  } catch (error) {
    console.error('approveMilestone error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

/** Approved milestone: creates a real invoice for its payment share of the contract. */
export async function invoiceMilestone(req: AuthRequest, res: Response): Promise<void> {
  try {
    const m = await prisma.milestone.findUnique({ where: { id: req.params.id }, include: milestoneInclude })
    if (!m) { res.status(404).json({ success: false, message: 'Milestone not found' }); return }
    if (m.status !== 'APPROVED') {
      res.status(400).json({ success: false, message: 'Only approved milestones can be invoiced' }); return
    }
    const amount = Math.round(m.project.contractValue * m.paymentPercentage / 100)
    if (amount <= 0) {
      res.status(400).json({ success: false, message: 'This milestone has no payment amount (check payment % and contract value)' }); return
    }
    const today = new Date()
    const due = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
    const invoiceNumber = await nextDocumentNumber('INV')

    const [invoice, updated] = await prisma.$transaction(async tx => {
      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          clientId: m.project.clientId,
          contractId: m.project.contractId,
          projectId: m.project.id,
          amount, taxAmount: 0, totalAmount: amount,
          issueDate: today, dueDate: due, status: 'SENT',
          notes: `Milestone ${m.milestoneNumber}: ${m.name} (${m.paymentPercentage}% of contract)`,
        },
      })
      const ms = await tx.milestone.update({
        where: { id: m.id },
        data: { status: 'INVOICED', invoiceId: inv.id },
        include: milestoneInclude,
      })
      return [inv, ms] as const
    })

    await logAudit(req, {
      action: 'CREATE', entity: 'Invoice', entityId: invoice.id,
      entityName: `${invoice.invoiceNumber} — ${m.project.client.companyName ?? ''}`,
      description: `Generated invoice ${invoice.invoiceNumber} from milestone ${m.name} (RWF ${amount.toLocaleString('en-US')})`,
      newValue: { amount, milestone: m.name, dueDate: due.toISOString().slice(0, 10) },
    })
    res.status(201).json({ success: true, data: { milestone: updated, invoice }, message: `Invoice ${invoice.invoiceNumber} created` })
  } catch (error) {
    console.error('invoiceMilestone error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}
