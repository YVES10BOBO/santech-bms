import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import { getTasks, getMyTasks, createTask, markTaskComplete, approveTask, rejectTask } from '../controllers/tasksController'

const router = Router()
router.use(authenticate)

router.get('/', getTasks)
router.get('/my-tasks', getMyTasks)
router.post('/', authorize('SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER'), createTask)
router.put('/:id/complete', markTaskComplete)
router.put('/:id/approve', authorize('SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER'), approveTask)
router.put('/:id/reject', authorize('SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER'), rejectTask)

export default router
