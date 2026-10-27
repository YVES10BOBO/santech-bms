import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import type { AuthRequest } from '../middleware/auth'

const prisma = new PrismaClient()

export async function getTasks(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 50, status, priority, projectId, assignedToId, search } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (priority) where.priority = priority
    if (projectId) where.projectId = projectId
    if (assignedToId) where.assignedToId = assignedToId
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
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        assignedBy: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
      }
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
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        status: 'REVIEW',
        completedAt: new Date(),
        ...(actualHours !== undefined && { actualHours: parseFloat(actualHours) }),
      }
    })
    res.json({ success: true, data: task, message: 'Task marked as complete — pending review' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function approveTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: req.user!.id,
      }
    })
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
      data: { status: 'REJECTED', rejectionReason: reason || null }
    })
    res.json({ success: true, data: task, message: 'Task rejected' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}
