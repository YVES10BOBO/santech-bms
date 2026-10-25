import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import { getInvoices, createInvoice, recordPayment, getPL, getRevenueChart } from '../controllers/financeController'

const router = Router()
router.use(authenticate)

const financeRoles = authorize('SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER')

router.get('/invoices', financeRoles, getInvoices)
router.post('/invoices', financeRoles, createInvoice)
router.post('/invoices/:id/payment', financeRoles, recordPayment)
router.get('/pl', financeRoles, getPL)
router.get('/revenue-chart', financeRoles, getRevenueChart)

export default router
