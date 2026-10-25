import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import type { AuthRequest } from '../middleware/auth'

const prisma = new PrismaClient()

export async function getOpportunities(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 20, stage, assignedToId } = req.query
    const skip = (Number(page) - 1) * Number(limit)
    const where: Record<string, unknown> = {}
    if (stage) where.stage = stage
    if (assignedToId) where.assignedToId = assignedToId
    if (req.user?.role === 'SALES_STAFF') where.assignedToId = req.user.id
    const [opportunities, total] = await Promise.all([
      prisma.opportunity.findMany({
        where, skip, take: Number(limit),
        include: {
          client: { select: { id: true, companyName: true, category: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.opportunity.count({ where }),
    ])
    res.json({ success: true, data: opportunities, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function createOpportunity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const opportunity = await prisma.opportunity.create({
      data: { ...req.body, assignedToId: req.body.assignedToId || req.user!.id },
      include: { client: { select: { companyName: true } } },
    })
    res.status(201).json({ success: true, data: opportunity, message: 'Deal created successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function updateOpportunity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const opportunity = await prisma.opportunity.update({
      where: { id: req.params.id }, data: req.body,
      include: { client: { select: { companyName: true } } },
    })
    res.json({ success: true, data: opportunity, message: 'Deal updated successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}
