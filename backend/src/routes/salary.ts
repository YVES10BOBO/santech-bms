import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import { getPayroll, adjustSalary, paySalary, promoteEmployee } from '../controllers/salaryController'
import { ADMINS, PAYROLL } from '../lib/roles'

const router = Router()
router.use(authenticate)

router.get('/', authorize(...PAYROLL), getPayroll)
router.put('/:id/adjust', authorize(...ADMINS), adjustSalary)
router.put('/:id/pay', authorize(...PAYROLL), paySalary)
router.post('/promote/:employeeId', authorize('SUPER_ADMIN'), promoteEmployee)

export default router
