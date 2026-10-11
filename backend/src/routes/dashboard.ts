import { Router } from 'express'
import { authenticate } from '../middleware/auth'

const router = Router()
router.use(authenticate)
router.get('/kpis', (_req, res) => {
  res.json({
    success: true,
    data: {
      totalCustomers: 144,
      activeCustomers: 38,
      newCustomersThisMonth: 12,
      totalLeads: 89,
      conversionRate: 26.4,
      activeProjects: 7,
      completedProjects: 14,
      delayedProjects: 2,
      pendingInvoices: 11,
      overduePayments: 3,
      totalRevenue: 24500000,
      totalExpenses: 8200000,
      netIncome: 16300000,
      outstandingReceivables: 5800000,
    }
  })
})
export default router
