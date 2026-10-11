import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import type { AuthRequest } from '../middleware/auth'

const prisma = new PrismaClient()

export async function getClients(req: AuthRequest, res: Response) {
  try {
    const { page = 1, limit = 20, category, status, search } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where: Record<string, unknown> = {}
    if (category) where.category = category
    if (status) where.status = status
    if (search) {
      where.OR = [
        { companyName: { contains: String(search), mode: 'insensitive' } },
        { contactPersonName: { contains: String(search), mode: 'insensitive' } },
        { phone: { contains: String(search) } },
      ]
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: Number(limit),
        include: { assignedTo: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.client.count({ where })
    ])

    return res.json({
      success: true,
      data: clients,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) }
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function getClient(req: AuthRequest, res: Response) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        fieldVisits: { orderBy: { visitDate: 'desc' }, take: 10 },
        opportunities: true,
        contracts: true,
        invoices: { orderBy: { createdAt: 'desc' }, take: 5 },
      }
    })
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' })
    return res.json({ success: true, data: client })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function createClient(req: AuthRequest, res: Response) {
  try {
    const client = await prisma.client.create({ data: req.body })
    return res.status(201).json({ success: true, data: client, message: 'Client created successfully' })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function updateClient(req: AuthRequest, res: Response) {
  try {
    const client = await prisma.client.update({ where: { id: req.params.id }, data: req.body })
    return res.json({ success: true, data: client, message: 'Client updated successfully' })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function deleteClient(req: AuthRequest, res: Response) {
  try {
    await prisma.client.delete({ where: { id: req.params.id } })
    return res.json({ success: true, message: 'Client deleted successfully' })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}
