import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import type { AuthRequest } from '../middleware/auth'

const prisma = new PrismaClient()

export async function getProjects(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 20, status, priority, search } = req.query
    const skip = (Number(page) - 1) * Number(limit)
    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (priority) where.priority = priority
    if (search) where.name = { contains: String(search), mode: 'insensitive' }
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where, skip, take: Number(limit),
        include: {
          client: { select: { id: true, companyName: true } },
          projectManager: { select: { id: true, firstName: true, lastName: true } },
          milestones: { select: { id: true, name: true, isCompleted: true, deadline: true, paymentPercentage: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.project.count({ where }),
    ])
    res.json({ success: true, data: projects, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function getProject(req: AuthRequest, res: Response): Promise<void> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        projectManager: { select: { id: true, firstName: true, lastName: true } },
        milestones: { orderBy: { deadline: 'asc' } },
        tasks: { include: { assignedTo: { select: { firstName: true, lastName: true } } } },
      },
    })
    if (!project) { res.status(404).json({ success: false, message: 'Project not found' }); return }
    res.json({ success: true, data: project })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function createProject(req: AuthRequest, res: Response): Promise<void> {
  try {
    const project = await prisma.project.create({
      data: req.body,
      include: { client: { select: { companyName: true } } },
    })
    res.status(201).json({ success: true, data: project, message: 'Project created successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function updateProject(req: AuthRequest, res: Response): Promise<void> {
  try {
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: req.body,
      include: { client: { select: { companyName: true } } },
    })
    res.json({ success: true, data: project, message: 'Project updated successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}
