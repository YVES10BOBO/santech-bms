import { Router } from 'express'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'
import { monthlySeries } from '../controllers/financeController'

const router = Router()
router.use(authenticate)

router.get('/kpis', async (_req, res) => {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(Date.UTC(now.getFullYear(), 0, 1))

    const [
      totalCustomers, activeCustomers, newCustomersThisMonth, totalLeads,
      activeProjects, completedProjects, delayedProjects,
      pendingInvoices, overduePayments,
      revenueAgg, expensesAgg, outstandingInvoices,
      pendingTasks, fieldVisitsThisMonth,
    ] = await Promise.all([
      prisma.client.count(),
      prisma.client.count({ where: { status: { in: ['QUALIFIED', 'CONTRACTOR'] } } }),
      prisma.client.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.client.count({ where: { status: { in: ['PROSPECT', 'LEAD', 'QUALIFIED'] } } }),
      prisma.project.count({ where: { status: { in: ['IN_PROGRESS', 'PLANNING', 'NOT_STARTED', 'ON_HOLD', 'AT_RISK'] } } }),
      prisma.project.count({ where: { status: 'COMPLETED' } }),
      prisma.project.count({ where: { status: 'DELAYED' } }),
      prisma.invoice.count({ where: { status: { in: ['SENT', 'DUE', 'PARTIALLY_PAID'] } } }),
      prisma.invoice.count({ where: { status: 'OVERDUE' } }),
      // Same source as Finance → P&L, so the numbers always match
      prisma.incomeEntry.aggregate({ where: { date: { gte: startOfYear } }, _sum: { amount: true } }),
      prisma.expenseEntry.aggregate({ where: { date: { gte: startOfYear } }, _sum: { amount: true } }),
      prisma.invoice.findMany({ where: { status: { notIn: ['PAID', 'CANCELLED', 'DRAFT'] } }, select: { totalAmount: true, paidAmount: true } }),
      prisma.task.count({ where: { status: { in: ['IN_PROGRESS', 'CREATED', 'ASSIGNED', 'ACCEPTED', 'REVIEW', 'PENDING_APPROVAL'] } } }),
      prisma.fieldVisit.count({ where: { visitDate: { gte: startOfMonth } } }),
    ])

    const totalRevenue = revenueAgg._sum.amount ?? 0
    const totalExpenses = expensesAgg._sum.amount ?? 0
    const conversionRate = totalCustomers > 0 ? Math.round((activeCustomers / totalCustomers) * 1000) / 10 : 0
    const outstandingReceivables = outstandingInvoices.reduce((sum, inv) => sum + (inv.totalAmount - inv.paidAmount), 0)

    res.json({
      success: true,
      data: {
        totalCustomers, activeCustomers, newCustomersThisMonth, totalLeads, conversionRate,
        activeProjects, completedProjects, delayedProjects, pendingInvoices, overduePayments,
        totalRevenue, totalExpenses, netIncome: totalRevenue - totalExpenses,
        outstandingReceivables, pendingTasks, fieldVisitsThisMonth,
      },
    })
  } catch (err) {
    console.error('Dashboard KPI error:', err)
    res.status(500).json({ success: false, message: 'Failed to load dashboard KPIs' })
  }
})

const STAGE_LABELS: Record<string, string> = {
  NEW_LEAD: 'New Lead', CONTACTED: 'Contacted', QUALIFIED: 'Qualified', REQUIREMENT_ANALYSIS: 'Requirements',
  PROPOSAL: 'Proposal', NEGOTIATION: 'Negotiation', WON: 'Won', LOST: 'Lost',
}

router.get('/charts', async (_req, res) => {
  try {
    const now = new Date()
    const startOfYear = new Date(Date.UTC(now.getFullYear(), 0, 1))
    const [revenueVsExpenses, stages, byCategory] = await Promise.all([
      monthlySeries(now.getFullYear(), now.getMonth() + 1, 7),
      prisma.opportunity.groupBy({ by: ['stage'], _count: { _all: true } }),
      prisma.incomeEntry.groupBy({
        by: ['category'], where: { date: { gte: startOfYear } },
        _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } },
      }),
    ])
    const stageCount = new Map(stages.map(s => [s.stage, s._count._all]))
    res.json({
      success: true,
      data: {
        revenueVsExpenses,
        pipeline: Object.keys(STAGE_LABELS).filter(s => s !== 'LOST').map(s => ({ stage: STAGE_LABELS[s], count: stageCount.get(s as never) ?? 0 })),
        revenueByService: byCategory.map(c => ({ name: c.category, value: c._sum.amount ?? 0 })),
      },
    })
  } catch (err) {
    console.error('Dashboard charts error:', err)
    res.status(500).json({ success: false, message: 'Failed to load dashboard charts' })
  }
})

export default router
