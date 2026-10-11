import { Router } from 'express'
import { authenticate } from '../middleware/auth'

const router = Router()
router.use(authenticate)
router.get('/', (_req, res) => {
  res.json({ success: true, data: [], message: 'Task module coming soon' })
})
export default router
