import { Response } from 'express'
import prisma from '../lib/prisma'
import { logAudit } from '../lib/audit'
import { PROJECT_LEADS, hasRole } from '../lib/roles'
import type { AuthRequest } from '../middleware/auth'

const taskInclude = {
  assignedTo: { select: { id: true, firstName: true, lastName: true } },
  assignedBy: { select: { id: true, firstName: true, lastName: true } },
  project: { select: { id: true, name: true } },
}

const fullName = (u?: { firstName: string; lastName: string } | null) => (u ? `${u.firstName} ${u.lastName}` : '')

/** Approved tasks raise the employee's performance score, rejected ones lower it (0–100). */
async function adjustPerformance(userId: string, delta: number) {
  const emp = await prisma.employee.findUnique({ where: { userId }, select: { id: true, performanceScore: true } })
  if (!emp) return
  const next = Math.max(0, Math.min(100, emp.performanceScore + delta))
  await prisma.employee.update({ where: { id: emp.id }, data: { performanceScore: next } })
}

export async function getTasks(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 50, status, priority, projectId, assignedToId, search } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (priority) where.priority = priority
    if (projectId) where.projectId = projectId
    if (assignedToId) where.assignedToId = assignedToId
    if (!hasRole(req.user?.role, PROJECT_LEADS) && req.user?.role !== 'SALES_MANAGER') where.assignedToId = req.user!.id
    if (search) {
      where.OR = [
        { title: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
      ]
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where, skip, take: Number(limit),
        include: {
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          assignedBy: { select: { id: true, firstName: true, lastName: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.task.count({ where })
    ])

    res.json({
      success: true,
      data: tasks,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function getMyTasks(req: AuthRequest, res: Response): Promise<void> {
  try {
    const tasks = await prisma.task.findMany({
      where: { assignedToId: req.user!.id },
      include: {
        assignedBy: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { deadline: 'asc' }
    })
    res.json({ success: true, data: tasks })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function createTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      title, description, projectId, assignedToId,
      priority, startDate, deadline, estimatedHours, periodStart, periodEnd
    } = req.body

    if (!title || !assignedToId || !deadline) {
      res.status(400).json({ success: false, message: 'title, assignedToId and deadline are required' }); return
    }

    const task = await prisma.task.create({
      data: {
        title, description: description || null,
        projectId: projectId || null,
        assignedToId,
        assignedById: req.user!.id,
        priority: priority || 'MEDIUM',
        startDate: startDate ? new Date(startDate) : null,
        deadline: new Date(deadline),
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
        periodStart: periodStart ? new Date(periodStart) : null,
        periodEnd: periodEnd ? new Date(periodEnd) : null,
        status: 'ASSIGNED',
      },
      include: taskInclude,
    })
    await logAudit(req, {
      action: 'CREATE', entity: 'Task', entityId: task.id, entityName: task.title,
      description: `Assigned task "${task.title}" to ${fullName(task.assignedTo)}`,
      newValue: { assignedTo: fullName(task.assignedTo), priority: task.priority, deadline: String(deadline).slice(0, 10) },
    })
    res.status(201).json({ success: true, data: task, message: 'Task created successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function updateTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      title, description, status, priority,
      deadline, estimatedHours, actualHours
    } = req.body

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(deadline !== undefined && { deadline: new Date(deadline) }),
        ...(estimatedHours !== undefined && { estimatedHours: parseFloat(estimatedHours) }),
        ...(actualHours !== undefined && { actualHours: parseFloat(actualHours) }),
      },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
      }
    })
    res.json({ success: true, data: task, message: 'Task updated successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function markTaskComplete(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { actualHours } = req.body
    const before = await prisma.task.findUnique({ where: { id: req.params.id } })
    if (!before) { res.status(404).json({ success: false, message: 'Task not found' }); return }
    if (before.assignedToId !== req.user!.id && !hasRole(req.user?.role, PROJECT_LEADS)) {
      res.status(403).json({ success: false, message: 'Only the assigned employee can complete this task' }); return
    }
    if (['APPROVED', 'COMPLETED', 'PENDING_APPROVAL'].includes(before.status)) {
      res.status(400).json({ success: false, message: 'This task is already completed' }); return
    }
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        status: 'PENDING_APPROVAL',
        completedAt: new Date(),
        rejectionReason: null,
        ...(actualHours !== undefined && { actualHours: parseFloat(actualHours) }),
      },
      include: taskInclude,
    })
    await logAudit(req, {
      action: 'STATUS_CHANGE', entity: 'Task', entityId: task.id, entityName: task.title,
      description: `Marked task "${task.title}" as complete — waiting for approval`,
      oldValue: { status: before.status }, newValue: { status: 'PENDING_APPROVAL' },
    })
    res.json({ success: true, data: task, message: 'Task sent for approval' })
  } catch (error) {
    console.error('markTaskComplete error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

async function loadForDecision(req: AuthRequest, res: Response) {
  const task = await prisma.task.findUnique({ where: { id: req.params.id }, include: taskInclude })
  if (!task) { res.status(404).json({ success: false, message: 'Task not found' }); return null }
  if (task.assignedToId === req.user!.id) {
    res.status(403).json({ success: false, message: 'You cannot approve or reject your own task' }); return null
  }
  if (!['PENDING_APPROVAL', 'REVIEW'].includes(task.status)) {
    res.status(400).json({ success: false, message: 'Only tasks waiting for approval can be approved or rejected' }); return null
  }
  return task
}

export async function approveTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    const before = await loadForDecision(req, res)
    if (!before) return
    const task = await prisma.task.update({
      where: { id: before.id },
      data: { status: 'APPROVED', approvedAt: new Date(), approvedById: req.user!.id },
      include: taskInclude,
    })
    await adjustPerformance(task.assignedToId, 2)
    await logAudit(req, {
      action: 'APPROVE', entity: 'Task', entityId: task.id, entityName: task.title,
      description: `Approved task completion by ${fullName(task.assignedTo)}`,
      oldValue: { status: before.status }, newValue: { status: 'APPROVED' },
    })
    res.json({ success: true, data: task, message: 'Task approved' })
  } catch (error) {
    console.error('approveTask error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function rejectTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { reason } = req.body
    if (!reason || !String(reason).trim()) {
      res.status(400).json({ success: false, message: 'A reason is required to reject a task' }); return
    }
    const before = await loadForDecision(req, res)
    if (!before) return
    const task = await prisma.task.update({
      where: { id: before.id },
      data: { status: 'REJECTED', rejectionReason: String(reason).trim() },
      include: taskInclude,
    })
    await adjustPerformance(task.assignedToId, -2)
    await logAudit(req, {
      action: 'REJECT', entity: 'Task', entityId: task.id, entityName: task.title,
      description: `Rejected task "${task.title}" — ${task.rejectionReason}`,
      oldValue: { status: before.status }, newValue: { status: 'REJECTED', reason: task.rejectionReason },
    })
    res.json({ success: true, data: task, message: 'Task rejected' })
  } catch (error) {
    console.error('rejectTask error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}
