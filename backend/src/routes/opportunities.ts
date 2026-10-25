import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import { getOpportunities, createOpportunity, updateOpportunity } from '../controllers/opportunitiesController'

const router = Router()
router.use(authenticate)

router.get('/', getOpportunities)
router.post('/', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_STAFF'), createOpportunity)
router.put('/:id', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_STAFF'), updateOpportunity)

export default router
