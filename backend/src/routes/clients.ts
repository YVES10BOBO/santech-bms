import { Router } from 'express'
import { getClients, getClient, createClient, updateClient, deleteClient } from '../controllers/clientsController'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()

router.use(authenticate)
router.get('/', getClients)
router.get('/:id', getClient)
router.post('/', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_STAFF'), createClient)
router.put('/:id', authorize('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_STAFF'), updateClient)
router.delete('/:id', authorize('SUPER_ADMIN', 'ADMIN'), deleteClient)

export default router
