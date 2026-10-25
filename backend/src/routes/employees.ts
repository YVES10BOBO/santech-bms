import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import { getEmployees, getEmployee, createEmployee, updateEmployee, getSalaryRecords, getMySalaryRecords, createSalaryRecord, markSalaryPaid } from '../controllers/employeesController'

const router = Router()
router.use(authenticate)

router.get('/', getEmployees)
router.get('/salary-records', authorize('SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'), getSalaryRecords)
router.get('/salary-records/my', getMySalaryRecords)
router.get('/:id', getEmployee)
router.post('/', authorize('SUPER_ADMIN', 'ADMIN'), createEmployee)
router.put('/:id', authorize('SUPER_ADMIN', 'ADMIN'), updateEmployee)
router.post('/salary-records', authorize('SUPER_ADMIN', 'ADMIN'), createSalaryRecord)
router.put('/salary-records/:id/pay', authorize('SUPER_ADMIN', 'ADMIN'), markSalaryPaid)

export default router
