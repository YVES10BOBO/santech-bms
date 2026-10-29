import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import { ADMINS, FINANCE } from '../lib/roles'
import { salesReport, financeReport, teamReport, clientsReport } from '../controllers/reportsController'

const router = Router()
router.use(authenticate)

router.get('/sales', authorize(...ADMINS, 'SALES_MANAGER', 'MARKETING_MANAGER', 'FINANCE_MANAGER'), salesReport)
router.get('/finance', authorize(...FINANCE), financeReport)
router.get('/team', authorize(...ADMINS, 'PROJECT_MANAGER'), teamReport)
router.get('/clients', authorize(...ADMINS, 'SALES_MANAGER', 'MARKETING_MANAGER', 'FINANCE_MANAGER', 'PROJECT_MANAGER'), clientsReport)

export default router
