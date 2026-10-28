import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import {
  getTasks, getMyTasks, createTask, updateTask,
  markTaskComplete, approveTask, rejectTask
} from '../controllers/tasksController'
import { PROJECT_LEADS } from '../lib/roles'

const router = Router()
router.use(authenticate)

const ASSIGNERS = [...PROJECT_LEADS, 'SALES_MANAGER' as const]

router.get('/', getTasks)                       // non-leads only get their own tasks
router.get('/my-tasks', getMyTasks)
router.post('/', authorize(...ASSIGNERS), createTask)
router.put('/:id', authorize(...ASSIGNERS), updateTask)
router.put('/:id/complete', markTaskComplete)   // assignee (checked in controller)
router.put('/:id/approve', authorize(...ASSIGNERS), approveTask)
router.put('/:id/reject', authorize(...ASSIGNERS), rejectTask)

export default router
