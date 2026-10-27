import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import type { AuthRequest } from '../middleware/auth'

const prisma = new PrismaClient()

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
      priority, status, progress, description, risks,
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
        milestones: milestonesInput?.length ? {
          create: milestonesInput.map((m: { name: string; deadline: string; deliverables?: string; paymentPercentage?: number }) => ({
            name: m.name,
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
      priority, status, progress, description, risks
    } = req.body

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
      },
      include: {
        client: { select: { id: true, companyName: true } },
        projectManager: { select: { id: true, firstName: true, lastName: true } },
        milestones: true,
      }
    })
    res.json({ success: true, data: project, message: 'Project updated successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function deleteProject(req: AuthRequest, res: Response): Promise<void> {
  try {
    await prisma.project.delete({ where: { id: req.params.id } })
    res.json({ success: true, message: 'Project deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

// ── MILESTONES ────────────────────────────────────────────────────────────────

export async function getMilestones(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { projectId } = req.query
    const where: Record<string, unknown> = {}
    if (projectId) where.projectId = projectId

    const milestones = await prisma.milestone.findMany({
      where,
      include: { project: { select: { id: true, name: true, client: { select: { companyName: true } } } } },
      orderBy: { deadline: 'asc' }
    })
    res.json({ success: true, data: milestones })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function createMilestone(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { projectId, name, deadline, deliverables, paymentPercentage } = req.body
    if (!projectId || !name || !deadline) {
      res.status(400).json({ success: false, message: 'projectId, name and deadline required' }); return
    }
    const milestone = await prisma.milestone.create({
      data: {
        projectId, name,
        deadline: new Date(deadline),
        deliverables: deliverables || null,
        paymentPercentage: parseFloat(paymentPercentage) || 0,
      }
    })
    res.status(201).json({ success: true, data: milestone, message: 'Milestone created' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function updateMilestone(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, deadline, deliverables, paymentPercentage, isCompleted } = req.body
    const milestone = await prisma.milestone.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(deadline !== undefined && { deadline: new Date(deadline) }),
        ...(deliverables !== undefined && { deliverables }),
        ...(paymentPercentage !== undefined && { paymentPercentage: parseFloat(paymentPercentage) }),
        ...(isCompleted !== undefined && {
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
        }),
      }
    })
    res.json({ success: true, data: milestone, message: 'Milestone updated' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}
