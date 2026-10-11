import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import type { AuthRequest } from '../middleware/auth'

const prisma = new PrismaClient()

export async function getFieldVisits(req: AuthRequest, res: Response) {
  try {
    const { page = 1, limit = 20, category, outcome, search } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where: Record<string, unknown> = {}
    if (category) where.category = category
    if (outcome) where.outcome = outcome
    if (search) {
      where.OR = [
        { companyName: { contains: String(search), mode: 'insensitive' } },
        { whatSantechCanSell: { contains: String(search), mode: 'insensitive' } },
        { contactName: { contains: String(search), mode: 'insensitive' } },
      ]
    }

    // Sales staff can only see their own visits
    if (req.user?.role === 'SALES_STAFF') {
      where.recordedById = req.user.id
    }

    const [visits, total] = await Promise.all([
      prisma.fieldVisit.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          recordedBy: { select: { id: true, firstName: true, lastName: true } },
          client: { select: { id: true, companyName: true, status: true } }
        },
        orderBy: { visitDate: 'desc' }
      }),
      prisma.fieldVisit.count({ where })
    ])

    return res.json({
      success: true,
      data: visits,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) }
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function getFieldVisit(req: AuthRequest, res: Response) {
  try {
    const visit = await prisma.fieldVisit.findUnique({
      where: { id: req.params.id },
      include: {
        recordedBy: { select: { id: true, firstName: true, lastName: true } },
        client: true
      }
    })
    if (!visit) return res.status(404).json({ success: false, message: 'Field visit not found' })
    return res.json({ success: true, data: visit })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function createFieldVisit(req: AuthRequest, res: Response) {
  try {
    const visit = await prisma.fieldVisit.create({
      data: { ...req.body, recordedById: req.user!.id }
    })
    return res.status(201).json({ success: true, data: visit, message: 'Field visit recorded successfully' })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function updateFieldVisit(req: AuthRequest, res: Response) {
  try {
    const visit = await prisma.fieldVisit.update({
      where: { id: req.params.id },
      data: req.body
    })
    return res.json({ success: true, data: visit, message: 'Field visit updated successfully' })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}
