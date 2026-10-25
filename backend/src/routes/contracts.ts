import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import { getContracts, getContract, createContract, updateContract } from '../controllers/contractsController'

const router = Router()
router.use(authenticate)

router.get('/', getContracts)
router.get('/:id', getContract)
router.post('/', authorize('SUPER_ADMIN', 'ADMIN'), createContract)
router.put('/:id', authorize('SUPER_ADMIN', 'ADMIN'), updateContract)

export default router
