import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import type { AuthRequest } from '../middleware/auth'

const prisma = new PrismaClient()

export async function getContracts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 20, status, search } = req.query
    const skip = (Number(page) - 1) * Number(limit)
    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (search) {
      where.OR = [
        { contractNumber: { contains: String(search), mode: 'insensitive' } },
        { client: { companyName: { contains: String(search), mode: 'insensitive' } } },
      ]
    }
    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where, skip, take: Number(limit),
        include: {
          client: { select: { id: true, companyName: true, category: true } },
          responsibleManager: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.contract.count({ where }),
    ])
    res.json({ success: true, data: contracts, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function getContract(req: AuthRequest, res: Response): Promise<void> {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        responsibleManager: { select: { id: true, firstName: true, lastName: true } },
        projects: true,
        invoices: true,
      },
    })
    if (!contract) { res.status(404).json({ success: false, message: 'Contract not found' }); return }
    res.json({ success: true, data: contract })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function createContract(req: AuthRequest, res: Response): Promise<void> {
  try {
    const contract = await prisma.contract.create({ data: req.body })
    res.status(201).json({ success: true, data: contract, message: 'Contract created successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function updateContract(req: AuthRequest, res: Response): Promise<void> {
  try {
    const contract = await prisma.contract.update({ where: { id: req.params.id }, data: req.body })
    res.json({ success: true, data: contract, message: 'Contract updated successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}
