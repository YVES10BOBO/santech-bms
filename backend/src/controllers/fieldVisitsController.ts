import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import type { AuthRequest } from '../middleware/auth'

const prisma = new PrismaClient()

export async function getFieldVisits(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 20, category, outcome, search, product, contractWon, dateFrom, dateTo } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where: Record<string, unknown> = {}
    if (category) where.category = category
    if (outcome) where.outcome = outcome
    if (product) where.whatSantechCanSell = { contains: String(product), mode: 'insensitive' }
    if (contractWon === 'true' || contractWon === 'false') where.contractWon = contractWon === 'true'
    if (dateFrom || dateTo) {
      where.visitDate = {
        ...(dateFrom ? { gte: new Date(`${String(dateFrom)}T00:00:00.000Z`) } : {}),
        ...(dateTo ? { lte: new Date(`${String(dateTo)}T23:59:59.999Z`) } : {}),
      }
    }
    if (search) {
      where.OR = [
        { companyName: { contains: String(search), mode: 'insensitive' } },
        { whatSantechCanSell: { contains: String(search), mode: 'insensitive' } },
        { contactName: { contains: String(search), mode: 'insensitive' } },
        { contactPhone: { contains: String(search) } },
        { location: { contains: String(search), mode: 'insensitive' } },
        { needsAndObservation: { contains: String(search), mode: 'insensitive' } },
        { comments: { contains: String(search), mode: 'insensitive' } },
      ]
    }

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

    res.json({
      success: true,
      data: visits,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function getFieldVisit(req: AuthRequest, res: Response): Promise<void> {
  try {
    const visit = await prisma.fieldVisit.findUnique({
      where: { id: req.params.id },
      include: {
        recordedBy: { select: { id: true, firstName: true, lastName: true } },
        client: true
      }
    })
    if (!visit) {
      res.status(404).json({ success: false, message: 'Field visit not found' })
      return
    }
    res.json({ success: true, data: visit })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function createFieldVisit(req: AuthRequest, res: Response): Promise<void> {
  try {
    const visit = await prisma.fieldVisit.create({
      data: { ...req.body, recordedById: req.user!.id },
      include: { recordedBy: { select: { id: true, firstName: true, lastName: true } } },
    })
    res.status(201).json({ success: true, data: visit, message: 'Field visit recorded successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function updateFieldVisit(req: AuthRequest, res: Response): Promise<void> {
  try {
    const visit = await prisma.fieldVisit.update({
      where: { id: req.params.id },
      data: req.body,
      include: { recordedBy: { select: { id: true, firstName: true, lastName: true } } },
    })
    res.json({ success: true, data: visit, message: 'Field visit updated successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}
