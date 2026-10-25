import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { getKPIs } from '../controllers/dashboardController'

const router = Router()
router.use(authenticate)
router.get('/kpis', getKPIs)
export default router
