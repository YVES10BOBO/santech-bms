import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import { getUsers, createUser, updateUser, resetPassword } from '../controllers/usersController'

const router = Router()
router.use(authenticate)
router.use(authorize('SUPER_ADMIN', 'ADMIN'))

router.get('/', getUsers)
router.post('/', createUser)
router.put('/:id', updateUser)
router.put('/:id/reset-password', resetPassword)

export default router
