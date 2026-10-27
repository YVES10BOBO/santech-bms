import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import {
  getEmployees, getEmployee, createEmployee, updateEmployee
} from '../controllers/employeesController'

const router = Router()
router.use(authenticate)

router.get('/', getEmployees)
router.get('/:id', getEmployee)
router.post('/', authorize('SUPER_ADMIN', 'ADMIN'), createEmployee)
router.put('/:id', authorize('SUPER_ADMIN', 'ADMIN'), updateEmployee)

export default router
