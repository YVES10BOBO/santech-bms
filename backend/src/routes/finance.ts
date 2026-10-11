import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()
router.use(authenticate)
router.get('/', authorize('SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'), (_req, res) => {
  res.json({ success: true, data: {}, message: 'Finance module coming soon' })
})
export default router
