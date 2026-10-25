import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import type { AuthRequest } from '../middleware/auth'

const prisma = new PrismaClient()

export async function getKPIs(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      totalCustomers, activeCustomers, newCustomersThisMonth,
      totalLeads, wonOpportunities,
      activeProjects, completedProjects, delayedProjects,
      pendingInvoices, overdueInvoices,
      revenueResult, outstandingResult,
    ] = await Promise.all([
      prisma.client.count(),
      prisma.client.count({ where: { status: 'CONTRACTOR' } }),
      prisma.client.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.opportunity.count(),
      prisma.opportunity.count({ where: { stage: 'WON' } }),
      prisma.project.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.project.count({ where: { status: 'COMPLETED' } }),
      prisma.project.count({ where: { status: 'DELAYED' } }),
      prisma.invoice.count({ where: { status: { notIn: ['PAID', 'CANCELLED'] } } }),
      prisma.invoice.count({ where: { status: 'OVERDUE' } }),
      prisma.payment.aggregate({ _sum: { amount: true } }),
      prisma.invoice.aggregate({
        _sum: { totalAmount: true },
        where: { status: { notIn: ['PAID', 'CANCELLED'] } },
      }),
    ])

    const totalRevenue = revenueResult._sum.amount ?? 0
    const totalExpenses = 5600000
    const outstandingReceivables = outstandingResult._sum.totalAmount ?? 0
    const conversionRate = totalLeads > 0 ? Math.round((wonOpportunities / totalLeads) * 100 * 10) / 10 : 0

    res.json({
      success: true,
      data: {
        totalCustomers,
        activeCustomers,
        newCustomersThisMonth,
        totalLeads,
        conversionRate,
        activeProjects,
        completedProjects,
        delayedProjects,
        pendingInvoices,
        overduePayments: overdueInvoices,
        totalRevenue,
        totalExpenses,
        netIncome: totalRevenue - totalExpenses,
        outstandingReceivables,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}
