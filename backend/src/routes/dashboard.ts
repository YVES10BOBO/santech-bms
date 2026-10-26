import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate } from '../middleware/auth'

const prisma = new PrismaClient()
const router = Router()
router.use(authenticate)

router.get('/kpis', async (_req, res) => {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)

    const [
      totalCustomers,
      activeCustomers,
      newCustomersThisMonth,
      totalLeads,
      activeProjects,
      completedProjects,
      delayedProjects,
      pendingInvoices,
      overduePayments,
      revenueAgg,
      expensesAgg,
      outstandingInvoices,
      pendingTasks,
      fieldVisitsThisMonth,
    ] = await Promise.all([
      prisma.client.count(),
      prisma.client.count({ where: { status: { in: ['QUALIFIED', 'CONTRACTOR'] } } }),
      prisma.client.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.client.count({ where: { status: { in: ['PROSPECT', 'LEAD', 'QUALIFIED'] } } }),
      prisma.project.count({ where: { status: { in: ['IN_PROGRESS', 'PLANNING', 'NOT_STARTED', 'ON_HOLD', 'AT_RISK'] } } }),
      prisma.project.count({ where: { status: 'COMPLETED' } }),
      prisma.project.count({ where: { status: 'DELAYED' } }),
      prisma.invoice.count({ where: { status: { in: ['DRAFT', 'SENT', 'DUE', 'PARTIALLY_PAID'] } } }),
      prisma.invoice.count({ where: { status: 'OVERDUE' } }),
      prisma.invoice.aggregate({ where: { status: 'PAID' }, _sum: { totalAmount: true } }),
      prisma.salaryRecord.aggregate({ _sum: { netSalary: true } }),
      prisma.invoice.findMany({
        where: { status: { notIn: ['PAID', 'CANCELLED'] } },
        select: { totalAmount: true, paidAmount: true },
      }),
      prisma.task.count({ where: { status: { in: ['IN_PROGRESS', 'CREATED', 'ASSIGNED', 'ACCEPTED', 'REVIEW', 'PENDING_APPROVAL'] } } }),
      prisma.fieldVisit.count({ where: { visitDate: { gte: startOfMonth } } }),
    ])

    const totalRevenue = Number(revenueAgg._sum.totalAmount ?? 0)
    const totalExpenses = Number(expensesAgg._sum.netSalary ?? 0)
    const netIncome = totalRevenue - totalExpenses
    const conversionRate = totalCustomers > 0
      ? Math.round((activeCustomers / totalCustomers) * 100 * 10) / 10
      : 0
    const outstandingReceivables = outstandingInvoices.reduce(
      (sum, inv) => sum + (Number(inv.totalAmount) - Number(inv.paidAmount)),
      0
    )

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
        overduePayments,
        totalRevenue,
        totalExpenses,
        netIncome,
        outstandingReceivables,
        pendingTasks,
        fieldVisitsThisMonth,
      },
    })
  } catch (err) {
    console.error('Dashboard KPI error:', err)
    res.status(500).json({ success: false, message: 'Failed to load dashboard KPIs' })
  }
})

export default router
