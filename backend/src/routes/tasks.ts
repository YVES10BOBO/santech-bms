import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import {
  getTasks, getMyTasks, createTask, updateTask,
  markTaskComplete, approveTask, rejectTask
} from '../controllers/tasksController'

const router = Router()
router.use(authenticate)

router.get('/', getTasks)
router.get('/my-tasks', getMyTasks)
router.post('/', createTask)
router.put('/:id', updateTask)
router.put('/:id/complete', markTaskComplete)
router.put('/:id/approve', approveTask)
router.put('/:id/reject', rejectTask)

export default router
