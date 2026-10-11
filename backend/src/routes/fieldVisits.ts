import { Router } from 'express'
import { getFieldVisits, getFieldVisit, createFieldVisit, updateFieldVisit } from '../controllers/fieldVisitsController'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()

router.use(authenticate)
router.get('/', getFieldVisits)
router.get('/:id', getFieldVisit)
router.post('/', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_STAFF', 'MARKETING_MANAGER'), createFieldVisit)
router.put('/:id', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_STAFF'), updateFieldVisit)

export default router
