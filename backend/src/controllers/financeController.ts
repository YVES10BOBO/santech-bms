import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import type { AuthRequest } from '../middleware/auth'

const prisma = new PrismaClient()

export async function getInvoices(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = 1, limit = 20, status, clientId } = req.query
    const skip = (Number(page) - 1) * Number(limit)
    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (clientId) where.clientId = clientId
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where, skip, take: Number(limit),
        include: { client: { select: { id: true, companyName: true } }, payments: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.invoice.count({ where }),
    ])
    res.json({ success: true, data: invoices, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function createInvoice(req: AuthRequest, res: Response): Promise<void> {
  try {
    const invoice = await prisma.invoice.create({ data: req.body })
    res.status(201).json({ success: true, data: invoice, message: 'Invoice created' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function recordPayment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { amount, paymentDate, paymentMethod, reference, notes } = req.body
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } })
    if (!invoice) { res.status(404).json({ success: false, message: 'Invoice not found' }); return }
    const payment = await prisma.payment.create({
      data: { invoiceId: req.params.id, amount, currency: invoice.currency, paymentDate: new Date(paymentDate), paymentMethod, reference, notes },
    })
    const newPaidAmount = invoice.paidAmount + amount
    const newStatus = newPaidAmount >= invoice.totalAmount ? 'PAID' : 'PARTIALLY_PAID'
    await prisma.invoice.update({
      where: { id: req.params.id },
      data: { paidAmount: newPaidAmount, status: newStatus },
    })
    res.status(201).json({ success: true, data: payment, message: 'Payment recorded successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function getPL(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query
    const startDate = new Date(Number(year), Number(month) - 1, 1)
    const endDate = new Date(Number(year), Number(month), 0)
    const payments = await prisma.payment.findMany({
      where: { paymentDate: { gte: startDate, lte: endDate } },
    })
    const totalRevenue = payments.reduce((s, p) => s + p.amount, 0)
    const totalExpenses = 5600000
    const grossProfit = totalRevenue - totalExpenses
    res.json({
      success: true,
      data: {
        month: Number(month), year: Number(year),
        totalRevenue, totalExpenses, grossProfit,
        netProfit: grossProfit,
        profitMargin: totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

export async function getRevenueChart(req: AuthRequest, res: Response): Promise<void> {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { paymentDate: 'asc' },
      take: 1000,
    })
    const monthlyMap: Record<string, number> = {}
    payments.forEach(p => {
      const key = `${p.paymentDate.getFullYear()}-${String(p.paymentDate.getMonth() + 1).padStart(2, '0')}`
      monthlyMap[key] = (monthlyMap[key] || 0) + p.amount
    })
    const data = Object.entries(monthlyMap).map(([month, revenue]) => ({ month, revenue, expenses: 5600000 }))
    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}
