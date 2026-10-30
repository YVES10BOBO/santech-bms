import { Router } from 'express'
import { login, getMe, changePassword, updateMe } from '../controllers/authController'
import { authenticate } from '../middleware/auth'

const router = Router()

router.post('/login', login)
router.get('/me', authenticate, getMe)
router.put('/me', authenticate, updateMe) // own name and phone
router.put('/change-password', authenticate, changePassword)

export default router
