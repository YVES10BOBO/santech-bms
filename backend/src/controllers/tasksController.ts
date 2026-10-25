import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import type { AuthRequest } from '../middleware/auth'

const prisma = new PrismaClient()

export async function getTasks(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 20, status, priority, assignedToId } = req.query
    const skip = (Number(page) - 1) * Number(limit)
    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (priority) where.priority = priority
    // Employees and sales staff see only their own tasks
    if (req.user?.role === 'EMPLOYEE' || req.user?.role === 'SALES_STAFF') {
      where.assignedToId = req.user.id
    } else if (assignedToId) {
      where.assignedToId = assignedToId
    }
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where, skip, take: Number(limit),
        include: {
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          assignedBy: { select: { id: true, firstName: true, lastName: true } },
          approvedBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.task.count({ where }),
    ])
    res.json({ success: true, data: tasks, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } })
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
      orderBy: { deadline: 'asc' },
    })
    res.json({ success: true, data: tasks })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function createTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    const task = await prisma.task.create({
      data: { ...req.body, assignedById: req.user!.id, status: 'ASSIGNED' },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        assignedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })
    res.status(201).json({ success: true, data: task, message: 'Task assigned successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function markTaskComplete(req: AuthRequest, res: Response): Promise<void> {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } })
    if (!task) { res.status(404).json({ success: false, message: 'Task not found' }); return }
    if (task.assignedToId !== req.user!.id) {
      res.status(403).json({ success: false, message: 'You can only complete your own tasks' }); return
    }
    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: { status: 'PENDING_APPROVAL', completedAt: new Date() },
    })
    res.json({ success: true, data: updated, message: 'Task marked as complete — awaiting approval' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function approveTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED', approvedAt: new Date(), approvedById: req.user!.id },
      include: { assignedTo: { include: { employee: true } } },
    })
    // Increment performance score
    if (task.assignedTo?.employee) {
      await prisma.employee.update({
        where: { id: task.assignedTo.employee.id },
        data: { performanceScore: { increment: 5 } },
      })
    }
    res.json({ success: true, data: task, message: 'Task approved' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function rejectTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { reason } = req.body
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', rejectionReason: reason },
    })
    res.json({ success: true, data: task, message: 'Task rejected' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}
